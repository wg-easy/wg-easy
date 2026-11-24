import { credentials, expect, test } from './fixtures';

test.use({ keepNamespace: true, ipv6: true });

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('recovers the surviving tunnel, its applied hooks and live policy', async ({
      app,
      request,
    }) => {
      const headers = { Origin: app.url };
      const post = (url: string, data?: object) =>
        request.post(url, { headers, data, failOnStatusCode: true });
      await post('/api/auth/password', { ...credentials, remember: false });
      const iface = '/api/admin/interface';
      const settings = await (await request.get(iface)).json();
      const hooks = (tag: string) => {
        const rule = `INPUT -i {{device}} -p udp --dport {{port}} -m comment --comment ${tag} -j ACCEPT`;
        return post('/api/admin/hooks', {
          preUp: '',
          postUp: 'iptables -A ' + rule,
          preDown: 'iptables -D ' + rule,
          postDown: `echo ${tag}-$INTERFACE-{{port}}-$DISABLE_IPV6 >> /tmp/teardowns`,
        });
      };
      await hooks('old-hook');
      await post(iface + '/restart');
      const read = (path: string) => app.execServer(['cat', path]);
      const index = await read('/sys/class/net/wg0/ifindex');
      const rules = () => app.execServer(['iptables', '-S', 'INPUT']);
      const sentinel = [
        'INPUT',
        '-m',
        'comment',
        '--comment',
        'foreign-rule',
        '-j',
        'ACCEPT',
      ];
      await app.execServer(['iptables', '-A', ...sentinel]);
      const peer = await post('/api/client', {
        name: 'Recovery peer',
        expiresAt: null,
      });
      const url = '/api/client/' + (await peer.json()).clientId;
      const client = await (await request.get(url)).json();
      await post(url, { ...client, serverAllowedIps: ['0.0.0.0/0', '::/0'] });
      expect(await app.execServer(['stat', '-c', '%u %a', record])).toBe(
        '0 600'
      );
      await expect(
        app.execServer([
          'su',
          '-s',
          '/bin/sh',
          'nobody',
          '-c',
          `cat ${record} >/dev/null`,
        ])
      ).rejects.toThrow(/Permission denied/i);
      const policy = (family: string) =>
        app.execServer(['ip', family, 'rule', 'show']);
      const oldPolicy = await app.execServer([
        'iptables',
        '-t',
        'mangle',
        '-S',
      ]);
      expect(oldPolicy).toMatch(/wg-easy-[\da-f-]+/);
      await hooks('new-hook');
      await post(iface, { ...settings, device: 'lo', port: 51830 });
      await app.stopProcess('KILL');
      expect(await read('/sys/class/net/wg0/ifindex')).toBe(index);
      expect(await rules()).toContain('old-hook');
      const namespace = await app.execServer(['readlink', '/proc/self/ns/net']);
      await app.startProcess(true);
      await expect
        .poll(() => rules(), { timeout: 12000 })
        .toContain('new-hook');
      expect(await app.execServer(['readlink', '/proc/self/ns/net'])).toBe(
        namespace
      );
      expect(await rules()).not.toContain('old-hook');
      expect(
        (await rules()).match(/-i lo .*--dport 51830 .*new-hook/g)
      ).toHaveLength(1);
      expect(await rules()).toContain('foreign-rule');
      expect(await read('/tmp/teardowns')).toBe('old-hook-wg0-51820-false');
      expect(
        await app.execServer(['iptables', '-t', 'mangle', '-S'])
      ).not.toContain(oldPolicy.match(/wg-easy-[\da-f-]+/)![0]);
      expect((await policy('-4')).match(/not .*fwmark/g)).toHaveLength(1);
      expect(await policy('-6')).not.toContain('fwmark');
      // The advertised endpoint has no port forwarder in this fixture.
      await post('/api/auth/password', { ...credentials, remember: false });
      const config = await (await request.get(url + '/configuration')).text();
      await app.connectClient(
        config.replace('vpn.example.test:51820', 'vpn.example.test:51830')
      );
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
      await app.stopProcess('TERM');
      expect(await read('/tmp/teardowns')).toBe(
        'old-hook-wg0-51820-false\nnew-hook-wg0-51830-true'
      );
      expect(await rules()).not.toMatch(/old-hook|new-hook/);
      expect(await rules()).toContain('foreign-rule');
      for (const family of ['-4', '-6']) {
        expect(await policy(family)).not.toContain('fwmark');
      }
    });
  });
}

const record = '/etc/wireguard/.wg-easy/wg0.json';

for (const evidence of [
  'stale record',
  'missing record',
  'unsafe permissions',
]) {
  test(`refuses a collision with ${evidence} before changing the namespace`, async ({
    app,
    request,
  }) => {
    const post = (url: string, data?: object) =>
      request.post(url, {
        headers: { Origin: app.url },
        data,
        failOnStatusCode: true,
      });
    await post('/api/auth/password', { ...credentials, remember: false });
    await post('/api/admin/hooks', {
      preUp: '',
      postUp: '',
      preDown: 'touch /tmp/ran-down',
      postDown: 'touch /tmp/ran-down',
    });
    await post('/api/admin/interface/restart');
    const index = await app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
    await app.stopProcess('KILL');
    if (evidence === 'unsafe permissions') {
      // Even a matching live generation must not authorize untrusted hooks.
      await app.execServer(['chmod', '0640', record]);
    } else {
      await app.execServer(['ip', 'link', 'del', 'wg0']);
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
      await app.execServer(['ip', 'link', 'set', 'wg0', 'up']);
      if (evidence === 'missing record') {
        await app.execServer(['rm', record]);
      }
    }
    await app.execServer([
      'ip',
      'route',
      'add',
      '192.0.2.0/24',
      'dev',
      'wg0',
      'table',
      '741',
    ]);
    await app.execServer([
      'ip',
      'rule',
      'add',
      'pref',
      '14444',
      'lookup',
      '741',
    ]);
    await app.execServer([
      'iptables',
      '-A',
      'FORWARD',
      '-i',
      'wg0',
      '-m',
      'comment',
      '--comment',
      'foreign',
      '-j',
      'ACCEPT',
    ]);
    const inspect = () =>
      Promise.all([
        app.execServer(['cat', '/sys/class/net/wg0/ifindex']),
        app.execServer(['cat', '/sys/class/net/wg0/ifalias']),
        app.execServer(['ip', 'route', 'show', 'table', '741']),
        app.execServer(['ip', 'rule', 'show']),
        app.execServer(['iptables', '-S']),
      ]);
    const before = await inspect();
    await app.startProcess();
    await expect.poll(app.logs).toContain('wg0 already exists');
    expect(await inspect()).toEqual(before);
    await app.execServer(['test', '!', '-e', '/tmp/ran-down']);
  });
}

for (const phase of ['PostUp', 'PreDown'] as const) {
  test(`resumes after a kill during ${phase} without replaying down hooks`, async ({
    app,
    request,
  }) => {
    const post = (url: string, data?: object) =>
      request.post(url, {
        headers: { Origin: app.url },
        data,
        failOnStatusCode: true,
      });
    await post('/api/auth/password', { ...credentials, remember: false });
    const pause =
      'if test -e /tmp/pause; then rm /tmp/pause; echo $$ >/tmp/paused-hook; exec sleep 60; fi';
    await post('/api/admin/hooks', {
      preUp: '',
      postUp: phase === 'PostUp' ? pause : '',
      preDown:
        'echo pre >> /tmp/teardown\n' + (phase === 'PreDown' ? pause : ''),
      postDown: 'echo post >> /tmp/teardown',
    });
    if (phase === 'PreDown') {
      await post('/api/admin/interface/restart');
    }
    await app.execServer(['touch', '/tmp/pause']);
    const cutover = post('/api/admin/interface/restart').catch(() => {});
    await expect
      .poll(() =>
        app.execServer([
          'sh',
          '-c',
          'test -e /tmp/paused-hook && echo paused || true',
        ])
      )
      .toBe('paused');
    await app.stopProcess('KILL');
    await cutover;
    await app.execServer(['sh', '-ec', 'kill "$(cat /tmp/paused-hook)"']);
    await app.startProcess();
    await expect
      .poll(async () =>
        (await request.get('/api/information').catch(() => undefined))?.status()
      )
      .toBe(200);
    const teardowns = () =>
      app.execServer([
        'sh',
        '-c',
        'if test -e /tmp/teardown; then cat /tmp/teardown; fi',
      ]);
    expect(await teardowns()).toBe(phase === 'PreDown' ? 'pre\npost' : '');
    await app.stopProcess('TERM');
    expect(await teardowns()).toBe(
      phase === 'PreDown' ? 'pre\npost\npre\npost' : 'pre\npost'
    );
  });
}
