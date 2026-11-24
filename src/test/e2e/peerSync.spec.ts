import type { APIRequestContext } from '@playwright/test';

import { credentials, expect, test } from './fixtures';

async function admin(request: APIRequestContext, origin: string) {
  const headers = { Origin: origin };
  const login = await request.post('/api/auth/password', {
    headers,
    data: { ...credentials, remember: false },
  });
  expect(login.ok()).toBe(true);
  const create = async (name: string) => {
    const response = await request.post('/api/client', {
      headers,
      data: { name, expiresAt: null },
    });
    expect(response.ok()).toBe(true);
    return `/api/client/${(await response.json()).clientId}`;
  };
  return { headers, create };
}

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('syncs peers without the server quick script while an existing client sends traffic', async ({
      request,
      app,
    }) => {
      const { headers, create } = await admin(request, app.url);
      const witness = await create('Connected client');
      await app.connectClient(
        await (await request.get(witness + '/configuration')).text()
      );
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
      const ifindex = () =>
        app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
      const original = await ifindex();

      const traffic = app.execClient([
        'ping',
        '-c',
        '25',
        '-i',
        '0.2',
        '-I',
        'wg0',
        '10.8.0.1',
      ]);
      const read = (field: string) =>
        app.execServer([backend, 'show', 'wg0', field]);
      const site = await create('Another client');
      const peer = await (await request.get(site)).json();
      const subnet = '192.0.2.0/24';
      await request.post(site, {
        headers,
        data: { ...peer, serverAllowedIps: [subnet] },
        failOnStatusCode: true,
      });
      expect(
        await app.execServer(['ip', 'route', 'show', 'exact', subnet])
      ).toContain('dev wg0');
      expect(await read('fwmark')).toBe('off');
      expect(await read('allowed-ips')).toContain('10.8.0.3/32');
      await app.execServer([backend, 'set', 'wg0', 'fwmark', '0xca6d']);
      await create('Third client');
      expect(await read('fwmark')).toBe('0xca6d');
      expect(await read('allowed-ips')).toContain('10.8.0.4/32');
      expect(await ifindex()).toBe(original);
      expect(await traffic).toContain(', 0% packet loss');
      const saved = await app.execServer(['cat', '/etc/wireguard/wg0.conf']);
      for (const field of [
        'Address = 10.8.0.1/24',
        'PostUp =',
        'AllowedIPs = 10.8.0.4/32',
      ]) {
        expect(saved).toContain(field);
      }
    });
  });
}

test('disable, deletion and expiry revoke running peers despite a failing endpoint lookup', async ({
  request,
  app,
}) => {
  test.slow(); // Expiry goes through the real one-minute maintenance job.
  const { headers, create } = await admin(request, app.url);
  const disable = await create('Disable');
  const remove = await create('Delete');
  const expire = await create('Expire');
  const broken = await create('Unresolvable endpoint');
  const peers = [disable, remove, expire];
  for (const [index, url] of peers.entries()) {
    await app.connectClient(
      await (await request.get(url + '/configuration')).text(),
      index + 1
    );
    await expect
      .poll(() => app.pingFromClient('10.8.0.1', index + 1))
      .toBe(true);
  }
  const expiring = await (await request.get(expire)).json();
  const saved = await request.post(expire, {
    headers,
    data: { ...expiring, expiresAt: new Date(Date.now() + 5000).toISOString() },
  });
  expect(saved.ok()).toBe(true);
  const enabled = await (await request.get(broken)).json();
  const failed = await request.post(broken, {
    headers,
    data: { ...enabled, serverEndpoint: 'unresolvable.invalid:51820' },
  });
  expect(failed.status()).toBe(500);
  expect(await app.peers()).toHaveLength(4);
  expect((await request.post(disable + '/disable', { headers })).status()).toBe(
    500
  );
  expect(await app.pingFromClient('10.8.0.1', 1)).toBe(false);
  expect((await request.delete(remove, { headers })).status()).toBe(500);
  expect(await app.pingFromClient('10.8.0.1', 2)).toBe(false);
  await expect
    .poll(() => app.peers(), { timeout: 75_000, intervals: [1000] })
    .toEqual([enabled.publicKey]);
  expect((await (await request.get(expire)).json()).enabled).toBe(false);
  expect(await app.pingFromClient('10.8.0.1', 3)).toBe(false);
});
