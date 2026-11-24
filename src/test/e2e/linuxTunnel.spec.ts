import { credentials, expect, test } from './fixtures';

for (const userspace of [false, true]) {
  test(`starts WireGuard without wg-quick and carries traffic (${userspace ? 'userspace' : 'kernel'})`, async ({
    request,
    app,
  }) => {
    const headers = { Origin: app.url };
    const post = (url: string, data?: object) =>
      request.post(url, { headers, data, failOnStatusCode: true });
    await post('/api/auth/password', { ...credentials, remember: false });
    const peer = await post('/api/client', {
      name: 'Site router',
      expiresAt: null,
    });
    const url = '/api/client/' + (await peer.json()).clientId;
    const client = await (await request.get(url)).json();
    const site = '192.0.2.0/24';
    await post(url, { ...client, serverAllowedIps: [site] });
    await app.execServer([
      'sh',
      '-ec',
      'if test -e /usr/bin/wg-quick; then mv /usr/bin/wg-quick /tmp/unused-quick; fi',
    ]);
    if (userspace) {
      // Simulate a host whose kernel does not provide the link kind.
      await app.execServer([
        'sh',
        '-ec',
        `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case " $* " in
  *" link add "*" type wireguard "*) echo 'Error: Unknown device type.' >&2; exit 2 ;;
esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
      ]);
    }
    const phases = '/tmp/tunnel-phases';
    await post('/api/admin/hooks', {
      preUp: `ip link show dev %i && echo PreUp >> ${phases}`,
      postUp: `wg show %i peers | grep -Fx '${client.publicKey}'; ip address show dev %i | grep '10.8.0.1/24'; ip route show exact ${site} | grep 'dev %i'; echo PostUp >> ${phases}`,
      preDown: `ip link show dev %i && echo PreDown >> ${phases}`,
      postDown: `test ! -e /sys/class/net/%i && echo PostDown >> ${phases}`,
    });
    await post('/api/admin/interface/restart');
    if (userspace) {
      expect(
        await app.execServer(['ip', '-details', 'link', 'show', 'wg0'])
      ).toContain('tun type tun');
    }
    const config = await (await request.get(url + '/configuration')).text();
    await app.connectClient(config);
    await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
    await post('/api/admin/interface/restart');
    expect(await app.execServer(['cat', phases])).toBe(
      'PreUp\nPostUp\nPreDown\nPostDown\nPreUp\nPostUp'
    );
  });
}

test.describe('numbered routing table', () => {
  test.use({ ipv6: true });
  test('installs all peer addresses in the selected table and withdraws them when routing is off', async ({
    app,
    request,
  }) => {
    const headers = { Origin: app.url };
    const post = (url: string, data?: object) =>
      request.post(url, { headers, data, failOnStatusCode: true });
    await post('/api/auth/password', { ...credentials, remember: false });
    const iface = '/api/admin/interface';
    const settings = await (await request.get(iface)).json();
    await post(iface, { ...settings, routingTable: '100' });
    const peer = await post('/api/client', { name: 'Branch', expiresAt: null });
    const clientUrl = '/api/client/' + (await peer.json()).clientId;
    const client = await (await request.get(clientUrl)).json();
    const routes = () =>
      Promise.all(
        ['-4', '-6'].map((family) =>
          app.execServer([
            'ip',
            family,
            'route',
            'show',
            'table',
            'all',
            'dev',
            'wg0',
          ])
        )
      );
    const [v4, v6] = await routes();
    expect(v4).toContain(client.ipv4Address + ' table 100');
    expect(v6).toContain(client.ipv6Address + ' table 100');
    await post(iface, { ...settings, routingTable: 'off' });
    expect((await routes()).join('\n')).not.toContain('table 100');
    const allowed = await app.execServer(['wg', 'show', 'wg0', 'allowed-ips']);
    expect(allowed).toContain(client.ipv4Address + '/32');
    expect(allowed).toContain(client.ipv6Address + '/128');
  });
});

test('reports a replacement interface and leaves its configuration in place', async ({
  app,
  request,
}) => {
  const headers = { Origin: app.url };
  await request.post('/api/auth/password', {
    headers,
    data: { ...credentials, remember: false },
    failOnStatusCode: true,
  });
  await app.execServer(['ip', 'link', 'del', 'dev', 'wg0']);
  await app.execServer(['ip', 'link', 'add', 'dev', 'wg0', 'type', 'dummy']);
  await app.execServer(['ip', 'address', 'add', '192.0.2.10/32', 'dev', 'wg0']);
  const index = await app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
  const result = await request.post('/api/admin/interface/restart', {
    headers,
  });
  expect(result.status()).toBe(409);
  expect((await result.json()).message).toContain('wg0 already exists');
  expect(await app.execServer(['cat', '/sys/class/net/wg0/ifindex'])).toBe(
    index
  );
  expect(
    await app.execServer(['ip', 'address', 'show', 'dev', 'wg0'])
  ).toContain('192.0.2.10/32');
});
