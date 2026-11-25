import { expect, test } from './fixtures';

for (const backend of ['wg', 'awg'] as const) {
  test.describe(`${backend} daemon recovery`, () => {
    test.use({ backend, userspace: true });
    test('reconnects peers after the userspace daemon exits', async ({
      api: { create, download, json, post },
      app,
    }) => {
      test.slow();
      const client = await create('Connected peer');
      const gateway = await create('Default gateway');
      await post(gateway, {
        ...(await json(gateway)),
        serverAllowedIps: ['0.0.0.0/0'],
      });
      await app.connectClient(await download(client));
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
      const index = () => app.read('/sys/class/net/wg0/ifindex');
      const original = await index();
      const mark = () => app.show('fwmark');
      const originalMark = await mark();
      const [signal, daemon] =
        backend === 'wg' ? ['KILL', 'wireguard-go'] : ['TERM', 'amneziawg-go'];
      await app.shell(`kill -${signal} "$(pidof ${daemon})"`);
      await expect
        .poll(() => index().catch(() => original), { timeout: 80_000 })
        .not.toBe(original);
      await expect.poll(() => mark().catch(() => '')).toBe(originalMark);
      await app.execClient([`${backend}-quick`, 'down', 'wg0']);
      await app.execClient([`${backend}-quick`, 'up', 'wg0']);
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
    });
  });
  for (const userspace of [false, true]) {
    test.describe(`${backend} ${userspace ? 'userspace' : 'kernel'}`, () => {
      test.use({ backend, userspace });
      test(`starts, syncs, restarts and stops without server quick scripts (${userspace ? 'userspace' : 'kernel'})`, async ({
        api: { post, json, create, download },
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
        const checkBackend = async () => {
          expect(
            await app.execServer(['ip', '-details', 'link', 'show', 'wg0'])
          ).toContain(userspace ? 'tun type tun' : kind);
        };
        await checkBackend();
        const settings = await json('/api/admin/interface');
        await post('/api/admin/interface', { ...settings, s1: 122, jC: 8 });
        const url = await create('Site router');
        const client = await json(url);
        const site = '192.0.2.0/24';
        await post(url, { ...client, jC: 3, serverAllowedIps: [site] });
        const phases = '/tmp/tunnel-phases';
        const hooks = {
          preUp: `ip link show dev %i && echo PreUp >> ${phases}`,
          postUp: `${backend} show %i peers | grep -Fx '${client.publicKey}'; ip address show dev %i | grep '10.8.0.1/24'; ip route del ${site} dev %i; echo PostUp >> ${phases}`,
          preDown: `ip link show dev %i && echo PreDown >> ${phases}`,
          postDown: `test ! -e /sys/class/net/%i && echo PostDown >> ${phases}`,
        };
        await post('/api/admin/hooks', hooks);
        await post('/api/admin/interface/restart');
        expect(
          await app.execServer(['ip', 'route', 'show', 'exact', site])
        ).toContain('dev wg0');
        await checkBackend();
        const config = await download(url);
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
        const server = await app.read('/etc/wireguard/wg0.conf');
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
        await post(url, {
          ...client,
          jC: 3,
          serverAllowedIps: [site, added],
        });
        expect(await app.show('allowed-ips')).toContain(added);
        await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
        await app.restart();
        await checkBackend();
        // A restarted server has discarded the old session. Reconnect with the export.
        await app.execClient([`${backend}-quick`, 'down', 'wg0']);
        await app.execClient([`${backend}-quick`, 'up', 'wg0']);
        await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
        expect(await app.read(phases)).toBe(
          'PreUp\nPostUp\nPreDown\nPostDown\nPreUp\nPostUp'
        );
      });
    });
  }
}

test.describe('numbered routing table', () => {
  test.use({ ipv6: true });
  test('installs all peer addresses in the selected table and withdraws them when routing is off', async ({
    app,
    api: { post, json, create },
  }) => {
    const iface = '/api/admin/interface';
    const settings = await json(iface);
    await post(iface, { ...settings, routingTable: '100' });
    const clientUrl = await create('Branch');
    const client = await json(clientUrl);
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

    const peerPrefix = client.ipv6Address + '/128';
    const source = '2001:db8:1::/64';
    const ipv6Route = (...args: string[]) =>
      app.execServer(['ip', '-6', '-j', 'route', ...args]);
    await ipv6Route(
      'add',
      peerPrefix,
      'from',
      source,
      'dev',
      'lo',
      'table',
      '100'
    );
    await post(iface + '/restart');
    expect((await routes())[1]).toContain(client.ipv6Address + ' table 100');
    await post(iface, { ...settings, routingTable: 'off' });
    expect((await routes()).join('\n')).not.toContain('table 100');
    expect(
      JSON.parse(await ipv6Route('show', 'table', '100', 'exact', peerPrefix))
    ).toMatchObject([{ from: source, dev: 'lo' }]);
    const allowed = await app.show('allowed-ips');
    expect(allowed).toContain(client.ipv4Address + '/32');
    expect(allowed).toContain(client.ipv6Address + '/128');
  });
});

test('reports a replacement interface and leaves its configuration in place', async ({
  app,
  request,
  api: { headers },
}) => {
  const index = await app.read('/sys/class/net/wg0/ifindex');
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
  expect(await app.read('/sys/class/net/wg0/ifindex')).toBe(index);
  expect(
    await app.execServer(['ip', 'address', 'show', 'dev', 'wg0'])
  ).toContain('192.0.2.10/32');
});
