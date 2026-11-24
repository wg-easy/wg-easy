import type { APIRequestContext } from '@playwright/test';

import { credentials, expect, test } from './fixtures';
import { goto } from './helpers';

const iface = '/api/admin/interface';

async function admin(request: APIRequestContext, origin: string) {
  const headers = { Origin: origin };
  const post = (url: string, data?: object) =>
    request.post(url, { headers, data, failOnStatusCode: true });
  const json = async (url: string) =>
    (await request.get(url, { failOnStatusCode: true })).json();
  const create = async (name: string) => {
    const response = await post('/api/client', { name, expiresAt: null });
    return `/api/client/${(await response.json()).clientId}`;
  };
  const download = async (url: string) =>
    (
      await request.get(url + '/configuration', { failOnStatusCode: true })
    ).text();
  await post('/api/auth/password', { ...credentials, remember: false });
  return { post, json, create, download };
}

test('distributes renumbered configurations while established clients use the running subnet and firewall', async ({
  app,
  page,
}) => {
  const { post, json, create, download } = await admin(page.request, app.url);
  const network = await json(iface);
  await post(iface, { ...network, firewallEnabled: true, routingTable: '123' });
  const witness = await create('Established client');
  await app.connectClient(await download(witness));
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

  await post(iface + '/cidr', {
    ipv4Cidr: '10.90.0.0/24',
    ipv6Cidr: network.ipv6Cidr,
  });
  const prepared = await download(witness);
  expect(
    prepared.split('\n').find((line) => line.startsWith('Address ='))
  ).toBe('Address = 10.90.0.2/32');
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);
  await goto(page, '/admin/interface');
  await expect(
    page.getByText('Restart required', { exact: true })
  ).toBeVisible();

  const pending = await create('Pending client');
  const newAddress = (await json(pending)).ipv4Address;
  expect(newAddress).toBe('10.90.0.3');
  await app.connectClient(await download(pending), 2);
  expect(await app.pingFromClient('10.8.0.1', 2)).toBe(false);
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);

  const saved = await json(witness);
  await post(witness, { ...saved, serverAllowedIps: ['0.0.0.0/0'] });
  const route = await app.execServer([
    'ip',
    '-4',
    'route',
    'show',
    'table',
    '123',
    'default',
  ]);
  expect(route).toContain('default dev wg0');
  expect((await json(iface)).restartRequired).toBe(true);
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);
  await post(witness, saved);

  const nat = () =>
    app.execServer(['iptables', '-t', 'nat', '-S', 'POSTROUTING']);
  expect(await nat()).toContain('-s 10.8.0.0/24 -o eth0 -j MASQUERADE');
  expect(await nat()).not.toContain('10.90.0.0/24');
  await post(iface + '/restart');
  expect((await json(iface)).restartRequired).toBe(false);
  expect(await nat()).not.toContain('10.8.0.0/24');
  expect(await nat()).toContain('-s 10.90.0.0/24 -o eth0 -j MASQUERADE');
  await expect.poll(() => app.pingFromClient('10.90.0.1', 2)).toBe(true);
  await app.execClient(['wg-quick', 'down', 'wg0']);
  await app.connectClient(prepared);
  await expect.poll(() => app.pingFromClient('10.90.0.1')).toBe(true);
});

test.describe('dual-stack peers', () => {
  test.use({ ipv6: true });

  test('uses only the available family for a new site gateway during renumbering', async ({
    app,
    request,
  }) => {
    const { post, json, create, download } = await admin(request, app.url);
    const network = await json(iface);
    await post(iface, {
      ...network,
      firewallEnabled: true,
      routingTable: '123',
    });
    await post(iface + '/cidr', {
      ipv4Cidr: '10.90.0.0/24',
      ipv6Cidr: network.ipv6Cidr,
    });
    const gateway = await create('Site gateway');
    const saved = await json(gateway);
    await post(gateway, {
      ...saved,
      allowedIps: ['10.8.0.0/24', '10.90.0.0/24', network.ipv6Cidr],
      serverAllowedIps: ['192.0.2.0/24', '2001:db8:1::/64', '0.0.0.0/0'],
    });
    await app.connectClient(await download(gateway));
    const ping6 = () =>
      app.execClient([
        'ping',
        '-6',
        '-I',
        'wg0',
        '-c',
        '1',
        '-W',
        '2',
        'fdcc:ad94:bacf:61a4::cafe:1',
      ]);
    await expect(ping6()).resolves.toContain(', 0% packet loss');
    expect(await app.pingFromClient('10.8.0.1')).toBe(false);
    const routes = (family: string) =>
      app.execServer([
        'ip',
        family,
        'route',
        'show',
        'table',
        'all',
        'dev',
        'wg0',
      ]);
    expect(await routes('-6')).toContain('2001:db8:1::/64');
    expect(await routes('-4')).not.toMatch(/table 123/);
    const rules = () => app.execServer(['iptables', '-S', 'WG_CLIENTS_wg0']);
    expect(await rules()).not.toContain(saved.ipv4Address);
    await post(iface + '/restart');
    await app.execClient(['wg-quick', 'down', 'wg0']);
    await app.execClient(['wg-quick', 'up', 'wg0']);
    await expect.poll(() => app.pingFromClient('10.90.0.1')).toBe(true);
    expect(await routes('-4')).toMatch(/default .*table 123/);
    expect(await routes('-4')).toContain('192.0.2.0/24');
    expect(await rules()).toContain(saved.ipv4Address);
  });
});

test('protects an old address across staged gateway edits and key rotation until its owner is deleted', async ({
  app,
  request,
}) => {
  const { post, json, create, download } = await admin(request, app.url);
  const { ipv6Cidr } = await json(iface);
  const original = await create('Moved gateway client');
  const unchanged = await create('Unaffected client');
  await app.connectClient(await download(unchanged));

  // The future gateway takes the first client's address. A subsequent edit
  // frees it in the saved pool while the original client still uses it live.
  const stage = (ipv4Cidr: string) =>
    post(iface + '/cidr', { ipv4Cidr, ipv6Cidr });
  await stage('10.8.0.2/24');
  await stage('10.8.0.9/24');
  const pending = await create('Future address owner');
  expect((await json(pending)).ipv4Address).toBe('10.8.0.2');
  const pendingKey = (await json(pending)).publicKey;
  expect(await app.peers()).not.toContain(pendingKey);

  const originalKey = (await json(original)).publicKey;
  await post(original + '/rotateKeyPair');
  const rotatedKey = (await json(original)).publicKey;
  expect(await app.peers()).not.toContain(originalKey);
  const allowed = () => app.execServer(['wg', 'show', 'wg0', 'allowed-ips']);
  expect(await allowed()).toContain(rotatedKey + '\t10.8.0.2/32');
  expect((await json(unchanged)).ipv4Address).toBe('10.8.0.3');
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);

  await request.delete(original, {
    headers: { Origin: app.url },
    failOnStatusCode: true,
  });
  expect(await app.peers()).not.toContain(rotatedKey);
  expect(await allowed()).toContain(pendingKey + '\t10.8.0.2/32');
});
