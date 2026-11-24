import { credentials, expect, test } from './fixtures';

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    for (const userspace of [false, true]) {
      test(`starts, syncs, restarts and stops without server quick scripts (${userspace ? 'userspace' : 'kernel'})`, async ({
        request,
        app,
      }) => {
        for (const quick of ['wg-quick', 'awg-quick']) {
          expect(
            await app.execServer(['sh', '-c', `command -v ${quick} || true`])
          ).toBe('');
        }
        const kind = backend === 'awg' ? 'amneziawg' : 'wireguard';
        if (!userspace) {
          try {
            await app.execServer([
              'ip',
              'link',
              'add',
              'backend-probe',
              'type',
              kind,
            ]);
          } catch (error) {
            test.skip(
              error instanceof Error &&
                /unknown device type|operation not supported/i.test(
                  error.message
                ),
              `Kernel does not provide ${kind}`
            );
            throw error;
          }
          await app.execServer(['ip', 'link', 'del', 'backend-probe']);
        }
        const headers = { Origin: app.url };
        const post = (url: string, data?: object) =>
          request.post(url, { headers, data, failOnStatusCode: true });
        await post('/api/auth/password', { ...credentials, remember: false });
        const settings = await (
          await request.get('/api/admin/interface')
        ).json();
        await post('/api/admin/interface', { ...settings, s1: 122, jC: 8 });
        const peer = await post('/api/client', {
          name: 'Site router',
          expiresAt: null,
        });
        const url = '/api/client/' + (await peer.json()).clientId;
        const client = await (await request.get(url)).json();
        const site = '192.0.2.0/24';
        await post(url, { ...client, jC: 3, serverAllowedIps: [site] });
        if (userspace) {
          // Simulate a host whose kernel does not provide the link kind.
          await app.execServer([
            'sh',
            '-ec',
            `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case " $* " in
  *" link add "*" type ${kind} "*) echo 'Error: Unknown device type.' >&2; exit 2 ;;
esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
          ]);
        }
        const phases = '/tmp/tunnel-phases';
        const hooks = {
          preUp: `ip link show dev %i && echo PreUp >> ${phases}`,
          postUp: `${backend} show %i peers | grep -Fx '${client.publicKey}'; ip address show dev %i | grep '10.8.0.1/24'; ip route show exact ${site} | grep 'dev %i'; echo PostUp >> ${phases}`,
          preDown: `ip link show dev %i && echo PreDown >> ${phases}`,
          postDown: `test ! -e /sys/class/net/%i && echo PostDown >> ${phases}`,
        };
        await post('/api/admin/hooks', hooks);
        await post('/api/admin/interface/restart');
        if (userspace) {
          expect(
            await app.execServer(['ip', '-details', 'link', 'show', 'wg0'])
          ).toContain('tun type tun');
        } else {
          expect(
            await app.execServer(['ip', '-details', 'link', 'show', 'wg0'])
          ).toContain(kind);
        }
        const config = await (await request.get(url + '/configuration')).text();
        // S1 is shared. Each end has its own junk packet count.
        const parameters = (contents: string) =>
          contents
            .split('\n')
            .filter((line) => /^(Jc|S1) = /.test(line))
            .sort();
        const serverParams = backend === 'awg' ? ['Jc = 8', 'S1 = 122'] : [];
        const peerParams = backend === 'awg' ? ['Jc = 3', 'S1 = 122'] : [];
        expect(
          parameters(await app.execServer([backend, 'showconf', 'wg0']))
        ).toEqual(serverParams);
        const server = await app.execServer(['cat', '/etc/wireguard/wg0.conf']);
        expect(parameters(server)).toEqual(serverParams);
        const savedLines = server.split('\n');
        for (const line of [
          '[Interface]',
          'Address = 10.8.0.1/24',
          'ListenPort = 51820',
          'Table = auto',
          `PreUp = ${hooks.preUp}`,
          `PostUp = ${hooks.postUp}`,
          `PreDown = ${hooks.preDown}`,
          `PostDown = ${hooks.postDown}`,
          '[Peer]',
          `PublicKey = ${client.publicKey}`,
          `AllowedIPs = ${client.ipv4Address}/32, ${site}`,
        ]) {
          expect(savedLines.includes(line), line).toBe(true);
        }
        expect(parameters(config)).toEqual(peerParams);
        await app.connectClient(config);
        await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
        const added = '198.51.100.0/24';
        await post(url, { ...client, jC: 3, serverAllowedIps: [site, added] });
        expect(
          await app.execServer([backend, 'show', 'wg0', 'allowed-ips'])
        ).toContain(added);
        await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
        await app.restart();
        // A restarted server has discarded the old session. Reconnect with the export.
        await app.execClient([`${backend}-quick`, 'down', 'wg0']);
        await app.execClient([`${backend}-quick`, 'up', 'wg0']);
        await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
        expect(await app.execServer(['cat', phases])).toBe(
          'PreUp\nPostUp\nPreDown\nPostDown\nPreUp\nPostUp'
        );
      });
    }
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
  const index = await app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
  await app.execServer(['ip', 'link', 'del', 'dev', 'wg0']);
  await app.execServer([
    'ip',
    'link',
    'add',
    'name',
    'wg0',
    'index',
    index,
    'type',
    'dummy',
  ]);
  await app.execServer(['ip', 'address', 'add', '192.0.2.10/32', 'dev', 'wg0']);
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
