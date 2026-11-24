import { credentials, expect, test } from './fixtures';

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('saving the server MTU tunes the connected tunnel in place', async ({
      app,
      request,
    }) => {
      const headers = { Origin: app.url };
      const post = (path: string, data?: object) =>
        request.post(path, { headers, data, failOnStatusCode: true });
      await post('/api/auth/password', { ...credentials, remember: false });
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
      const settings = await (await request.get(url)).json();
      const saveMtu = (mtu: number | null) => post(url, { ...settings, mtu });
      const link = (field: string) =>
        app.execServer(['cat', '/sys/class/net/wg0/' + field]);
      await saveMtu(null);
      expect(await link('mtu')).toBe('1400');

      const peer = await post('/api/client', {
        name: 'MTU witness',
        expiresAt: null,
      });
      const { clientId } = await peer.json();
      const download = await request.get(
        `/api/client/${clientId}/configuration`,
        {
          failOnStatusCode: true,
        }
      );
      await app.connectClient(await download.text());
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);

      const other = await post('/api/client', {
        name: 'Other endpoint',
        expiresAt: null,
      });
      const otherUrl = '/api/client/' + (await other.json()).clientId;
      const otherPeer = {
        ...(await (await request.get(otherUrl)).json()),
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
    });
  });
}
