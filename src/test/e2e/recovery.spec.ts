import type { APIRequestContext } from '@playwright/test';

import { expect, test } from './fixtures';
import { admin } from './helpers';

test.use({ keepNamespace: true, ipv6: true });

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('recovers the surviving tunnel, its applied hooks and recorded default rules', async ({
      app,
      request,
    }) => {
      const { post, json, create, download } = await admin(request, app.url);
      const iface = '/api/admin/interface';
      const settings = await json(iface);
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
      const read = (path: string) => app.execServer(['cat', path]);
      const rules = () => app.execServer(['iptables', '-w', '-S', 'INPUT']);
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
      const url = await create('Recovery peer');
      const client = await json(url);
      await post(url, { ...client, serverAllowedIps: ['0.0.0.0/0', '::/0'] });
      const index = await read('/sys/class/net/wg0/ifindex');
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
      // The old generation gained filtering during a live edit.
      await post(iface, { ...settings, firewallEnabled: true });
      expect(await app.execServer(['ip6tables', '-w', '-S'])).toContain(
        'WG_CLIENTS_wg0'
      );
      // A firewall reader can hold the lock while the running rules are edited.
      await app.execServer([
        'sh',
        '-ec',
        `flock /run/xtables.lock sh -c 'touch /tmp/locked; sleep 2' >/dev/null 2>&1 &
while [ ! -f /tmp/locked ]; do sleep 0.05; done`,
      ]);
      await hooks('new-hook');
      await post(iface, {
        ...settings,
        device: 'lo',
        port: 51830,
        firewallEnabled: true,
      });
      await app.stopProcess('KILL');
      // Older versions also journaled routes that disappear with the link.
      await app.execServer([
        'node',
        '-e',
        `
        const fs = require('node:fs');
        const file = process.argv[1];
        const record = JSON.parse(fs.readFileSync(file, 'utf8'));
        record.policy.owned.ipv4.push({ kind: 'route', table: 51820 });
        fs.writeFileSync(file, JSON.stringify(record));
      `,
        record,
      ]);
      // Earlier records used a descriptive alias instead of a kernel alternate name.
      const tag = JSON.parse(await read(record)).policy.tag;
      await app.execServer(['ip', 'link', 'set', 'wg0', 'alias', tag]);
      await app.execServer([
        'ip',
        'link',
        'property',
        'del',
        'dev',
        'wg0',
        'altname',
        tag,
      ]);
      expect(await read('/sys/class/net/wg0/ifindex')).toBe(index);
      expect(await rules()).toContain('old-hook');
      const namespace = await app.execServer(['readlink', '/proc/self/ns/net']);
      await app.startProcess(true);
      // The new generation records its down hooks after PostUp finishes.
      await expect
        .poll(() => read(record).catch(() => ''), { timeout: 12000 })
        .toContain('new-hook');
      expect(await app.execServer(['readlink', '/proc/self/ns/net'])).toBe(
        namespace
      );
      const recoveredRules = await rules();
      expect(recoveredRules).not.toContain('old-hook');
      expect(
        recoveredRules.match(/-i lo .*--dport 51830 .*new-hook/g)
      ).toHaveLength(1);
      expect(recoveredRules).toContain('foreign-rule');
      expect(await read('/tmp/teardowns')).toBe('old-hook-wg0-51820-false');
      expect(
        await app.execServer(['iptables', '-w', '-t', 'mangle', '-S'])
      ).not.toContain(oldPolicy.match(/wg-easy-[\da-f-]+/)![0]);
      expect((await policy('-4')).match(/not .*fwmark/g)).toHaveLength(1);
      expect(await policy('-6')).not.toContain('fwmark');
      expect(await app.execServer(['ip6tables', '-w', '-S'])).not.toMatch(
        /WG_CLIENTS_wg0|wg-easy rebuild wg0/
      );
      expect(await app.execServer(['iptables', '-w', '-S'])).toContain(
        'WG_CLIENTS_wg0'
      );
      // The advertised endpoint has no port forwarder in this fixture.
      await admin(request, app.url);
      const config = await download(url);
      await app.connectClient(
        config.replace('vpn.example.test:51820', 'vpn.example.test:51830')
      );
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
      await app.stopProcess('TERM');
      expect(await read('/tmp/teardowns')).toBe(
        'old-hook-wg0-51820-false\nnew-hook-wg0-51830-true'
      );
      expect(await rules()).not.toMatch(/old-hook|new-hook/);
      expect(await app.execServer(['iptables', '-w', '-S'])).not.toMatch(
        /WG_CLIENTS_wg0|wg-easy rebuild wg0/
      );
      expect(await rules()).toContain('foreign-rule');
      for (const family of ['-4', '-6']) {
        expect(await policy(family)).not.toContain('fwmark');
      }
    });
  });
}

const record = '/etc/wireguard/.wg-easy/wg0.json';

test('runs confirmed down hooks after a crash with the PostUp marker still present', async ({
  app,
  request,
}) => {
  const { post } = await admin(request, app.url);
  const marker = '/etc/wireguard/.wg-easy/failed-post-up';
  await post('/api/admin/hooks', {
    preUp: '',
    postUp: `if ! test -e /tmp/pending-hook; then cp -p ${marker} /tmp/pending-hook; fi; echo up >> /tmp/phases`,
    preDown: 'echo pre >> /tmp/phases',
    postDown: 'echo post >> /tmp/phases',
  });
  await post('/api/admin/interface/restart');
  await app.stopProcess('KILL');
  // Recreate the on-disk state between saving the down hooks and clearing the marker.
  await app.execServer(['cp', '-p', '/tmp/pending-hook', marker]);
  await app.startProcess();
  await expect
    .poll(() => app.execServer(['cat', '/tmp/phases']))
    .toBe('up\npre\npost\nup');
  // The same marker cannot authorize teardown of the replacement generation.
  const index = () => app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
  const replacement = await index();
  await app.stopProcess('KILL');
  await app.execServer(['cp', '-p', '/tmp/pending-hook', marker]);
  await app.startProcess();
  await expect
    .poll(app.logs)
    .toContain('belongs to a different tunnel generation');
  expect(await index()).toBe(replacement);
  expect(await app.execServer(['cat', '/tmp/phases'])).toBe(
    'up\npre\npost\nup'
  );
});

for (const hook of ['PreDown', 'PostDown'] as const) {
  test(`keeps the admin panel available after ${hook} fails during confirmed hook recovery`, async ({
    app,
    request,
  }) => {
    const { post, json } = await admin(request, app.url);
    const marker = '/etc/wireguard/.wg-easy/failed-post-up';
    await post('/api/admin/hooks', {
      preUp: '',
      postUp: `cp -p ${marker} /tmp/confirmed; echo up >> /tmp/phases`,
      preDown: `echo pre >> /tmp/phases; ${hook === 'PreDown' ? 'false' : 'true'}`,
      postDown: `echo post >> /tmp/phases; ${hook === 'PostDown' ? 'false' : 'true'}`,
    });
    await post('/api/admin/interface/restart');
    await app.stopProcess('KILL');
    await app.execServer(['cp', '-p', '/tmp/confirmed', marker]);
    async function startAwaitingRepair() {
      await app.startProcess();
      await expect
        .poll(
          async () =>
            (await json('/api/admin/interface').catch(() => ({})))
              .restartRequired
        )
        .toBe(true);
      expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');
      expect(await app.execServer(['cat', '/tmp/phases'])).toBe(
        'up\npre\npost'
      );
      expect(
        JSON.parse(await app.execServer(['cat', marker])).failedDownHook
      ).toBe(hook);
    }
    await startAwaitingRepair();
    await app.stopProcess('TERM');
    await startAwaitingRepair();
    await post('/api/admin/interface/restart');
    expect(await app.execServer(['cat', '/tmp/phases'])).toBe(
      'up\npre\npost\nup'
    );
    expect((await json('/api/admin/interface')).restartRequired).toBe(false);
  });
}

test('recovers owned default rules only after the recorded link is gone', async ({
  app,
  request,
}) => {
  const { post, json, create } = await admin(request, app.url);
  const peer = await create('Default gateway');
  await post(peer, { ...(await json(peer)), serverAllowedIps: ['0.0.0.0/0'] });
  const readRecord = () => app.execServer(['cat', record]);
  const running = await readRecord();
  const tag = JSON.parse(running).policy.tag;
  const rules = () => app.execServer(['ip', '-4', 'rule', 'show']);
  const mangle = () =>
    app.execServer(['iptables', '-w', '2', '-t', 'mangle', '-S']);
  await app.execServer(['ip', 'rule', 'add', 'pref', '15000', 'lookup', '741']);
  expect(await mangle()).toContain(tag);
  await app.execServer(['ip', 'link', 'set', 'wg0', 'down']);
  await app.execServer(['ip', 'link', 'set', 'wg0', 'name', 'moved0']);
  await expect(post('/api/admin/interface/restart')).rejects.toThrow();
  expect(await readRecord()).toBe(running);
  expect(await mangle()).toContain(tag);
  await app.stopProcess('KILL');
  await app.execServer(['ip', 'link', 'del', 'moved0']);
  await app.startProcess();
  await expect.poll(mangle).not.toContain(tag);
  await expect.poll(rules).toMatch(/not .*fwmark/);
  expect(await rules()).toContain('lookup 741');
  expect((await rules()).match(/not .*fwmark/g)).toHaveLength(1);
  expect(JSON.parse(await readRecord()).policy.tag).not.toBe(tag);
});

test('preserves a foreign temporary link after a crash before exclusive creation', async ({
  app,
  request,
}) => {
  const { post } = await admin(request, app.url);
  await app.execServer([
    'sh',
    '-ec',
    `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case "$*" in 'link add dev '*)
  echo "$4" >/tmp/unfinished
  sleep 15
  exit 1 ;;
esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
  ]);
  const cutover = post('/api/admin/interface/restart').catch(() => {});
  const unfinished = () =>
    app.execServer(['cat', '/tmp/unfinished']).catch(() => '');
  await expect.poll(unfinished).toMatch(/^wg/);
  await app.stopProcess('KILL');
  await cutover;
  const temporary = await unfinished();
  const pending = await app.execServer(['cat', record]);
  expect(JSON.parse(pending)).toMatchObject({ phase: 'creating', index: null });
  await app.execServer(['rm', '/usr/local/bin/ip']);
  await app.execServer([
    'ip',
    'link',
    'add',
    'dev',
    temporary,
    'type',
    'dummy',
  ]);
  await app.startProcess();
  await expect
    .poll(app.logs)
    .toContain('Cannot verify ownership of unfinished tunnel');
  expect(
    await app.execServer(['ip', '-details', 'link', 'show', temporary])
  ).toContain('dummy');
  expect(await app.execServer(['cat', record])).toBe(pending);
});

test('retries a failed recovery record write without replaying PostUp', async ({
  app,
  request,
}) => {
  const { headers, post } = await admin(request, app.url);
  const directory = '/etc/wireguard/.wg-easy';
  const phases = '/tmp/recovery-hook-phases';
  const hooks = {
    preUp: '',
    // The recovery writer rejects directories accessible to other users.
    postUp: `echo up >> ${phases}; chmod 0750 ${directory}`,
    preDown: `echo pre >> ${phases}`,
    postDown: `echo post >> ${phases}`,
  };
  await post('/api/admin/hooks', hooks);
  const restart = await request.post('/api/admin/interface/restart', {
    headers,
  });
  expect(restart.status()).toBe(500);
  const index = () => app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
  const running = await index();
  await app.execServer(['chmod', '0700', directory]);
  // A normal save triggers the same pending retry as maintenance. New hooks
  // apply to the next generation, even if the current record needs repair.
  await post('/api/admin/hooks', { ...hooks, preDown: '', postDown: '' });
  expect(await index()).toBe(running);
  expect(await app.execServer(['cat', phases])).toBe('up');
  expect(JSON.parse(await app.execServer(['cat', record]))).toMatchObject({
    preDown: hooks.preDown,
    postDown: hooks.postDown,
  });
  await app.stopProcess('TERM');
  expect(await app.execServer(['cat', phases])).toBe('up\npre\npost');
});

test('keeps a failed boot hook stopped across container replacement until an admin restarts it', async ({
  app,
  playwright,
  request,
}) => {
  const { headers, post } = await admin(request, app.url);
  const iface = '/api/admin/interface';
  const hooksUrl = '/api/admin/hooks';
  const attempts = '/etc/wireguard/boot-hook-attempts';
  const hooks = {
    preUp: '',
    postUp: `echo failed >> ${attempts}; false`,
    preDown: '',
    postDown: '',
  };
  await post(hooksUrl, hooks);
  const expectStopped = async (api: APIRequestContext, origin: string) => {
    await expect(async () => {
      const { json } = await admin(api, origin);
      expect((await json(iface)).restartRequired).toBe(true);
    }).toPass({ timeout: 15_000 });
    await expect
      .poll(() => app.execServer(['wg', 'show', 'interfaces']))
      .toBe('');
    expect(await app.execServer(['cat', attempts])).toBe('failed');
  };
  await app.stopProcess('TERM');
  await app.startProcess();
  await expectStopped(request, app.url);
  const fixed = { ...hooks, postUp: `echo recovered >> ${attempts}` };
  expect(
    (await request.post(hooksUrl, { headers, data: fixed })).status()
  ).toBe(503);
  await app.stopProcess('KILL');
  const origin = await app.recreateContainer();
  const replacement = await playwright.request.newContext({ baseURL: origin });
  try {
    await expectStopped(replacement, origin);
    await replacement.post(iface + '/restart', {
      headers: { Origin: origin },
      failOnStatusCode: true,
    });
    expect(await app.execServer(['cat', attempts])).toBe('failed\nrecovered');
    await app.stopProcess('TERM');
    await app.startProcess();
    await expect
      .poll(() => app.execServer(['cat', attempts]))
      .toBe('failed\nrecovered\nrecovered');
  } finally {
    await replacement.dispose();
  }
  expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('wg0');
});

for (const evidence of [
  'stale record',
  'missing record',
  'unsafe permissions',
]) {
  test(`refuses a collision with ${evidence} before changing the namespace`, async ({
    app,
    request,
  }) => {
    const { post } = await admin(request, app.url);
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
        app.execServer(['iptables', '-w', '-S']),
      ]);
    const before = await inspect();
    await app.startProcess();
    await expect.poll(app.logs).toContain('wg0 already exists');
    expect(await inspect()).toEqual(before);
    await app.execServer(['test', '!', '-e', '/tmp/ran-down']);
  });
}

for (const phase of ['PostUp', 'PreDown', 'PostDown'] as const) {
  test(`resumes after a kill during ${phase} without replaying down hooks`, async ({
    app,
    request,
  }) => {
    const { post } = await admin(request, app.url);
    const pause =
      'if test -e /tmp/pause; then rm /tmp/pause; echo $$ >/tmp/paused-hook; exec sleep 60; fi';
    await post('/api/admin/hooks', {
      preUp: '',
      postUp: phase === 'PostUp' ? pause : '',
      preDown:
        'echo pre >> /tmp/teardown\n' + (phase === 'PreDown' ? pause : ''),
      postDown:
        'echo post >> /tmp/teardown\n' + (phase === 'PostDown' ? pause : ''),
    });
    if (phase !== 'PostUp') {
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
    expect(await teardowns()).toBe(phase === 'PostUp' ? '' : 'pre\npost');
    if (phase === 'PostUp') {
      expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');
      await post('/api/admin/interface/restart');
    }
    await app.stopProcess('TERM');
    expect(await teardowns()).toBe(
      phase === 'PostUp' ? 'pre\npost' : 'pre\npost\npre\npost'
    );
  });
}

test('withdraws filtering after deleting a link whose PostUp failed', async ({
  app,
  request,
}) => {
  const { headers, json, post } = await admin(request, app.url);
  const iface = '/api/admin/interface';
  const settings = await json(iface);
  await post(iface, { ...settings, firewallEnabled: true });
  await post('/api/admin/hooks', {
    preUp:
      'iptables -C FORWARD -i %i -m comment --comment "wg-easy rebuild %i" -j DROP && touch /tmp/guarded',
    postUp: 'false',
    preDown: 'touch /tmp/ran-down',
    postDown: 'touch /tmp/ran-down',
  });
  const restart = await request.post(iface + '/restart', { headers });
  expect(restart.status()).toBe(503);
  await app.execServer(['test', '-e', '/tmp/guarded']);
  await app.execServer(['test', '!', '-e', '/sys/class/net/wg0']);
  await app.execServer(['test', '!', '-e', '/tmp/ran-down']);
  for (const command of ['iptables', 'ip6tables']) {
    expect(await app.execServer([command, '-S'])).not.toMatch(
      /WG_CLIENTS_wg0|wg-easy rebuild wg0/
    );
  }
});

test('finishes filtering and PostDown after a crash just after link deletion', async ({
  app,
  request,
}) => {
  const { post, json } = await admin(request, app.url);
  const iface = '/api/admin/interface';
  await post(iface, { ...(await json(iface)), firewallEnabled: true });
  await post('/api/admin/hooks', {
    preUp: '',
    postUp: '',
    preDown: '',
    postDown: 'echo down >> /tmp/post-down',
  });
  await post(iface + '/restart');
  await app.execServer([
    'sh',
    '-ec',
    `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case "$*" in 'link delete dev wg-easy-'*)
  /sbin/ip "$@" || exit 1
  touch /tmp/link-deleted
  exec sleep 60 ;;
esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
  ]);
  const cutover = post(iface + '/restart').catch(() => {});
  await expect
    .poll(() =>
      app.execServer([
        'sh',
        '-c',
        'test -f /tmp/link-deleted && echo yes || true',
      ])
    )
    .toBe('yes');
  await app.stopProcess('KILL');
  await cutover;
  expect(await app.execServer(['iptables', '-S', 'FORWARD'])).toContain(
    'WG_CLIENTS_wg0'
  );
  await app.execServer(['rm', '/usr/local/bin/ip']);
  await app.startProcess();
  await expect
    .poll(() => app.execServer(['cat', '/tmp/post-down']).catch(() => ''))
    .toBe('down');
  await expect
    .poll(() => app.execServer(['wg', 'show', 'interfaces']))
    .toBe('wg0');
});

test('rolls back an unpublished link when alternate name assignment fails', async ({
  app,
  request,
}) => {
  const { post } = await admin(request, app.url);
  await app.execServer([
    'sh',
    '-ec',
    `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case "$*" in *' altname wg-easy-'*) echo "$5" >/tmp/unpublished; exit 2 ;; esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
  ]);
  await expect(post('/api/admin/interface/restart')).rejects.toThrow();
  const temporary = await app.execServer(['cat', '/tmp/unpublished']);
  await app.execServer(['test', '!', '-e', '/sys/class/net/' + temporary]);
  await app.execServer(['test', '!', '-e', '/sys/class/net/wg0']);
  await app.execServer(['rm', '/usr/local/bin/ip']);
  await post('/api/admin/interface/restart');
  expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('wg0');
});

test('preserves a replacement that takes the public name just before link deletion', async ({
  app,
  request,
}) => {
  const { post } = await admin(request, app.url);
  await app.execServer([
    'sh',
    '-ec',
    `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case "$*" in 'link delete dev wg-easy-'*)
  index=$(cat /sys/class/net/wg0/ifindex)
  /sbin/ip link delete dev wg0
  /sbin/ip link add dev wg0 index "$index" type dummy ;;
esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
  ]);
  await expect(post('/api/admin/interface/restart')).rejects.toThrow();
  expect(
    await app.execServer(['ip', '-details', 'link', 'show', 'wg0'])
  ).toContain('dummy');
});
