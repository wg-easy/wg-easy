import { expect, test } from './fixtures';

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('syncs peers without the server quick script while an existing client sends traffic', async ({
      api: { create, download, json, post },
      app,
    }) => {
      const witness = await create('Connected client');
      await app.connectClient(await download(witness));
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
      const ifindex = () => app.read('/sys/class/net/wg0/ifindex');
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
      const site = await create('Another client');
      const peer = await json(site);
      const subnet = '192.0.2.0/24';
      await post(site, { ...peer, serverAllowedIps: [subnet] });
      expect(
        await app.execServer(['ip', 'route', 'show', 'exact', subnet])
      ).toContain('dev wg0');
      expect(await app.show('fwmark')).toBe('off');
      expect(await app.show('allowed-ips')).toContain('10.8.0.3/32');
      await app.execServer([backend, 'set', 'wg0', 'fwmark', '0xca6d']);
      await create('Third client');
      expect(await app.show('fwmark')).toBe('0xca6d');
      expect(await app.show('allowed-ips')).toContain('10.8.0.4/32');
      expect(await ifindex()).toBe(original);
      expect(await traffic).toContain(', 0% packet loss');
      const saved = await app.read('/etc/wireguard/wg0.conf');
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
  api: { headers, create, download, json, post },
  app,
}) => {
  test.slow();
  const disable = await create('Disable');
  const remove = await create('Delete');
  const expire = await create('Expire');
  const broken = await create('Unresolvable endpoint');
  const iface = '/api/admin/interface';
  const filtering = await json(iface);
  await post(iface, { ...filtering, firewallEnabled: true });
  const peers = [disable, remove, expire, broken];
  for (const [index, url] of peers.entries()) {
    await app.connectClient(await download(url), index + 1);
    await expect
      .poll(() => app.pingFromClient('10.8.0.1', index + 1))
      .toBe(true);
  }
  const network = await json('/api/admin/interface');
  await post('/api/admin/interface/cidr', {
    ipv4Cidr: '10.90.0.0/24',
    ipv6Cidr: network.ipv6Cidr,
  });
  expect(await app.pingFromClient('10.8.0.1', 4)).toBe(true);
  const expiring = await json(expire);
  const saved = await request.post(expire, {
    headers,
    data: { ...expiring, expiresAt: new Date(Date.now() + 5000).toISOString() },
  });
  expect(saved.ok()).toBe(true);
  const enabled = await json(broken);
  const failed = await request.post(broken, {
    headers,
    data: { ...enabled, serverEndpoint: 'unresolvable.invalid:51820' },
  });
  expect(failed.status()).toBe(500);
  expect(await app.peers()).toHaveLength(4);
  expect(await app.pingFromClient('10.8.0.1', 1)).toBe(true);
  // A changed kernel assignment cannot inherit another saved peer's permission.
  await app.execServer([
    'wg',
    'set',
    'wg0',
    'peer',
    enabled.publicKey,
    'allowed-ips',
    '10.8.0.5/32,10.8.0.2/32',
  ]);
  const restricted = await json(remove);
  expect(
    (
      await request.post(remove, {
        headers,
        data: {
          ...restricted,
          firewallIps: ['192.0.2.1/32'],
        },
      })
    ).status()
  ).toBe(500);
  expect(
    await app.execServer(['iptables', '-S', 'WG_CLIENTS_wg0'])
  ).not.toContain(' -s 10.8.0.2/32 ');
  expect(await app.pingFromClient('10.8.0.1', 2)).toBe(false);
  expect(await app.pingFromClient('10.8.0.1', 4)).toBe(true);
  expect((await request.post(disable + '/disable', { headers })).status()).toBe(
    500
  );
  expect(await app.pingFromClient('10.8.0.1', 1)).toBe(false);
  expect((await request.delete(remove, { headers })).status()).toBe(500);
  expect(await app.pingFromClient('10.8.0.1', 2)).toBe(false);
  await expect
    .poll(() => app.peers(), { timeout: 75_000, intervals: [1000] })
    .toEqual([enabled.publicKey]);
  expect((await json(expire)).enabled).toBe(false);
  expect(await app.pingFromClient('10.8.0.1', 3)).toBe(false);
  expect(await app.pingFromClient('10.8.0.1', 4)).toBe(true);
});
