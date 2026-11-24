import { expect, test } from './fixtures';
import { admin, goto } from './helpers';

const iface = '/api/admin/interface';

test.use({ ipv6: true });

test('applies the new subnet to peers, downloads and firewall rules at restart', async ({
  app,
  page,
}) => {
  const { post, json, create, download } = await admin(page.request, app.url);
  const network = await json(iface);
  await post(iface, { ...network, firewallEnabled: true, routingTable: '123' });
  const witness = await create('Established client');
  const original = await download(witness);
  await app.connectClient(original);
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

  await post(iface + '/cidr', {
    ipv4Cidr: '10.90.0.0/24',
    ipv6Cidr: 'fd90::/64',
  });
  expect(await download(witness)).toBe(original);
  expect((await json(iface)).ipv4Cidr).toBe('10.90.0.0/24');
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);
  await goto(page, '/admin/interface');
  await expect(
    page.getByText('Restart required', { exact: true })
  ).toBeVisible();

  const pending = await create('New client');
  const newAddress = (await json(pending)).ipv4Address;
  expect(newAddress).toBe('10.8.0.3');
  expect(await download(pending)).toContain('fdcc:ad94:bacf:61a4::cafe:3/128');
  await app.connectClient(await download(pending), 2);
  await expect.poll(() => app.pingFromClient('10.8.0.1', 2)).toBe(true);
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);

  const nat = () =>
    app.execServer(['iptables', '-t', 'nat', '-S', 'POSTROUTING']);
  expect(await nat()).toContain('-s 10.8.0.0/24 -o eth0 -j MASQUERADE');
  expect(await nat()).not.toContain('10.90.0.0/24');
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
  expect(await download(witness)).toBe(original);
  expect(await nat()).toContain('-s 10.8.0.0/24 -o eth0 -j MASQUERADE');
  await post(iface + '/restart');
  expect((await json(iface)).restartRequired).toBe(false);
  expect(await nat()).not.toContain('10.8.0.0/24');
  expect(await nat()).toContain('-s 10.90.0.0/24 -o eth0 -j MASQUERADE');
  for (const index of [1, 2]) {
    await app.execClient(['wg-quick', 'down', 'wg0'], index);
  }
  for (const [index, client] of [witness, pending].entries()) {
    const config = await download(client);
    expect(config).toContain(
      `Address = 10.90.0.${index + 2}/32, fd90::${index + 2}/128`
    );
    await app.connectClient(config, index + 1);
    await expect
      .poll(() => app.pingFromClient('10.90.0.1', index + 1))
      .toBe(true);
    expect(
      await app.execClient(
        ['ping', '-6', '-I', 'wg0', '-c', '1', '-W', '2', 'fd90::1'],
        index + 1
      )
    ).toContain('0% packet loss');
  }
});

test('reverting a pending subnet preserves the established manual address and export', async ({
  request,
  app,
}) => {
  const { post, json, create, download } = await admin(request, app.url);
  const network = await json(iface);
  const client = await create('Manually addressed client');
  await post(client, { ...(await json(client)), ipv4Address: '10.8.0.100' });
  await app.connectClient(await download(client));
  const ping = () => app.pingFromClient('10.8.0.1');
  await expect.poll(ping).toBe(true);
  const stage = (ipv4Cidr: string) =>
    post(iface + '/cidr', { ipv4Cidr, ipv6Cidr: network.ipv6Cidr });
  await stage('10.90.0.0/24');
  expect((await json(iface)).restartRequired).toBe(true);
  const pending = await create('New client');
  await stage(network.ipv4Cidr);
  expect((await json(iface)).restartRequired).toBe(false);
  expect(await ping()).toBe(true);
  expect(await download(client)).toContain('Address = 10.8.0.100/32');
  expect(await download(pending)).toContain('Address = 10.8.0.2/32');
});
