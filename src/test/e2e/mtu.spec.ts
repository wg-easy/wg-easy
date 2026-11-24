import { expect, test } from './fixtures';
import { admin } from './helpers';

test.describe('dual-stack MTU', () => {
  test.use({ ipv6: true });

  test('keeps the IPv6 gateway reachable with explicit and automatic MTUs', async ({
    app,
    request,
  }) => {
    const { post, json, headers, create, download } = await admin(
      request,
      app.url
    );
    const iface = '/api/admin/interface';
    const settings = await json(iface);
    const peer = await create('Dual-stack peer');
    await app.connectClient(await download(peer));
    const ping = () => app.pingFromClient('fdcc:ad94:bacf:61a4::cafe:1');
    await expect.poll(ping).toBe(true);
    const rejected = await request.post(iface, {
      headers,
      data: { ...settings, mtu: 1200 },
    });
    expect(rejected.status()).toBe(400);
    expect((await json(iface)).mtu).toBe(settings.mtu);

    const links = JSON.parse(
      await app.execClient(['ip', '-4', '-j', 'address', 'show', 'dev', 'eth0'])
    );
    await app.execServer([
      'ip',
      'route',
      'add',
      links[0].addr_info[0].local + '/32',
      'dev',
      'eth0',
      'mtu',
      '1320',
    ]);
    await post(iface, { ...settings, mtu: null });
    expect(await app.execServer(['cat', '/sys/class/net/wg0/mtu'])).toBe(
      '1280'
    );
    expect(await ping()).toBe(true);
    await post(iface, { ...settings, mtu: 1420 });
    expect(await ping()).toBe(true);
  });
});

test('invalid interface settings and a rejected live MTU preserve filtered traffic', async ({
  app,
  request,
}) => {
  const { post, json, headers, create, download } = await admin(
    request,
    app.url
  );
  const iface = '/api/admin/interface';
  await post(iface, { ...(await json(iface)), firewallEnabled: true });
  const settings = await json(iface);
  const peer = await create('Filtered peer');
  await app.connectClient(await download(peer));
  const ping = () => app.pingFromClient('10.8.0.1');
  await expect.poll(ping).toBe(true);
  for (const invalid of [{ mtu: 1400.5 }, { routingTable: '08' }]) {
    const rejected = await request.post(iface, {
      headers,
      data: { ...settings, ...invalid },
    });
    expect(rejected.status()).toBe(400);
    expect(await json(iface)).toMatchObject({
      mtu: settings.mtu,
      routingTable: settings.routingTable,
    });
    expect(await ping()).toBe(true);
  }

  // Reject a valid MTU at the iproute2 boundary while keeping the link up.
  await app.execServer([
    'sh',
    '-ec',
    `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
if [ "$*" = 'link set dev wg0 mtu 1400' ]; then exit 2; fi
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
  ]);
  const failure = await request.post(iface, {
    headers,
    data: { ...settings, mtu: 1400 },
  });
  expect(failure.status()).toBe(500);
  expect(await ping()).toBe(true);
  expect(await app.execServer(['cat', '/sys/class/net/wg0/mtu'])).toBe(
    String(settings.mtu)
  );
  await app.execServer(['rm', '/usr/local/bin/ip']);
  await post(iface, { ...settings, mtu: 1400 });
  expect(await app.execServer(['cat', '/sys/class/net/wg0/mtu'])).toBe('1400');
});

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('saving the server MTU tunes the connected tunnel in place', async ({
      app,
      request,
    }) => {
      const { post, json, create, download } = await admin(request, app.url);
      await post('/api/admin/hooks', {
        preUp: 'echo preUp >> /tmp/mtu-hooks',
        postUp: 'echo postUp >> /tmp/mtu-hooks',
        preDown: 'echo preDown >> /tmp/mtu-hooks',
        postDown: 'echo postDown >> /tmp/mtu-hooks',
      });
      await post('/api/admin/interface/restart');
      const hooks = () => app.execServer(['cat', '/tmp/mtu-hooks']);
      const before = await hooks();
      expect(before).toContain('preUp\npostUp');
      // Docker networks can use jumbo frames. Pin the underlay for automatic MTU.
      await app.execServer(['ip', 'link', 'set', 'dev', 'eth0', 'mtu', '1480']);
      const url = '/api/admin/interface';
      const settings = await json(url);
      const saveMtu = (mtu: number | null) => post(url, { ...settings, mtu });
      const link = (field: string) =>
        app.execServer(['cat', '/sys/class/net/wg0/' + field]);
      await saveMtu(null);
      expect(await link('mtu')).toBe('1400');

      const witness = await create('MTU witness');
      await app.connectClient(await download(witness));
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

      const otherUrl = await create('Other endpoint');
      const otherPeer = {
        ...(await json(otherUrl)),
        serverEndpoint: '192.0.2.1:51820',
      };
      await post(otherUrl, otherPeer);

      // Only the route used by the tunnel socket carries the smaller path MTU.
      const mark = '51820';
      await app.execServer([backend, 'set', 'wg0', 'fwmark', mark]);
      const addresses = JSON.parse(
        await app.execClient([
          'ip',
          '-4',
          '-j',
          'address',
          'show',
          'dev',
          'eth0',
        ])
      );
      const endpoint = addresses[0].addr_info[0].local;
      await app.execServer([
        'ip',
        'route',
        'add',
        endpoint + '/32',
        'dev',
        'eth0',
        'table',
        mark,
        'mtu',
        '1390',
      ]);
      await app.execServer([
        'ip',
        'rule',
        'add',
        'ipproto',
        'udp',
        'sport',
        String(settings.port),
        'dport',
        await app.execClient([backend, 'show', 'wg0', 'listen-port']),
        'fwmark',
        mark,
        'table',
        mark,
      ]);
      const index = await link('ifindex');
      const [traffic] = await Promise.all([
        app.execClient([
          'sh',
          '-c',
          'ping -I wg0 -c 25 -i 0.2 10.8.0.1 | tee /tmp/mtu-ping',
        ]),
        (async () => {
          await expect
            .poll(() =>
              app.execClient([
                'sh',
                '-c',
                'grep "bytes from" /tmp/mtu-ping 2>/dev/null || true',
              ])
            )
            .toContain('bytes from');
          await saveMtu(1340);
          expect(await link('mtu')).toBe('1340');
          await saveMtu(null);
          expect(await link('mtu')).toBe('1310');
        })(),
      ]);
      expect(traffic).toContain(', 0% packet loss');
      expect(await link('ifindex')).toBe(index);
      expect(await hooks()).toBe(before);
      expect(
        await app.execServer([
          'sed',
          '-n',
          '/^MTU/p',
          '/etc/wireguard/wg0.conf',
        ])
      ).toBe('');

      await app.execServer([
        'ip',
        'route',
        'del',
        endpoint + '/32',
        'table',
        mark,
      ]);
      await post(otherUrl, { ...otherPeer, name: 'Renamed peer' });
      expect(await link('mtu')).toBe('1310');
      await saveMtu(1200);
      expect(await link('mtu')).toBe('1200');
    });
  });
}
