import type { APIRequestContext } from '@playwright/test';

import { admin, expect, test } from './fixtures';

const iface = '/api/admin/interface';
const record = '/etc/wireguard/.wg-easy/wg0.json';
const marker = '/etc/wireguard/.wg-easy/failed-post-up';

test.use({ keepNamespace: true, ipv6: true });

function expectRestartRequired(
  json: Awaited<ReturnType<typeof admin>>['json'],
  required: boolean
) {
  return expect(async () => {
    expect((await json(iface)).restartRequired).toBe(required);
  }).toPass({ timeout: 10_000 });
}

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('recovers the surviving tunnel, its applied hooks and recorded default rules', async ({
      app,
      request,
      api: { post, json, create, download },
    }) => {
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
      const rules = () => app.execServer(['iptables', '-w', '-S', 'INPUT']);
      await app.shell(
        'iptables -A INPUT -m comment --comment foreign-rule -j ACCEPT'
      );
      const url = await create('Recovery peer');
      const client = await json(url);
      await post(url, { ...client, serverAllowedIps: ['0.0.0.0/0', '::/0'] });
      const index = await app.read('/sys/class/net/wg0/ifindex');
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
      await app.shell(`flock /run/xtables.lock sh -c 'touch /tmp/locked; sleep 2' >/dev/null 2>&1 &
while [ ! -f /tmp/locked ]; do sleep 0.05; done`);
      await hooks('new-hook');
      await post(iface, {
        ...settings,
        device: 'lo',
        port: 51830,
        firewallEnabled: true,
      });
      await app.stopProcess('KILL');
      expect(await app.read('/sys/class/net/wg0/ifindex')).toBe(index);
      expect(await rules()).toContain('old-hook');
      const namespace = await app.execServer(['readlink', '/proc/self/ns/net']);
      await app.startProcess(true);
      // The new generation records its down hooks after PostUp finishes.
      await expect
        .poll(() => app.read(record).catch(() => ''), { timeout: 12000 })
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
      expect(await app.read('/tmp/teardowns')).toBe('old-hook-wg0-51820-false');
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
      expect(await app.read('/tmp/teardowns')).toBe(
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

test('runs confirmed down hooks after a crash with the PostUp marker still present', async ({
  app,
  api: { post },
}) => {
  await post('/api/admin/hooks', {
    preUp: '',
    postUp: `if ! test -e /tmp/pending-hook; then cp -p ${marker} /tmp/pending-hook; fi; echo up >> /tmp/phases`,
    preDown: 'echo pre >> /tmp/phases',
    postDown: 'echo post >> /tmp/phases',
  });
  await post(iface + '/restart');
  await app.stopProcess('KILL');
  // Recreate the on-disk state between saving the down hooks and clearing the marker.
  await app.execServer(['cp', '-p', '/tmp/pending-hook', marker]);
  await app.startProcess();
  await expect.poll(() => app.read('/tmp/phases')).toBe('up\npre\npost\nup');
  // The same marker cannot authorize teardown of the replacement generation.
  const index = () => app.read('/sys/class/net/wg0/ifindex');
  const replacement = await index();
  await app.stopProcess('KILL');
  await app.execServer(['cp', '-p', '/tmp/pending-hook', marker]);
  await app.startProcess();
  await expect
    .poll(app.logs)
    .toContain('belongs to a different tunnel generation');
  expect(await index()).toBe(replacement);
  expect(await app.read('/tmp/phases')).toBe('up\npre\npost\nup');
});

for (const [hook, problem, command] of [
  ['PreDown', 'fails', 'false'],
  [
    'PostDown',
    'fails with the recovery directory unavailable',
    'chmod 0750 /etc/wireguard/.wg-easy; false',
  ],
  [
    'PostDown',
    'is interrupted',
    'kill -KILL "$(cat /tmp/e2e-node.pid)"; touch /tmp/interrupted',
  ],
] as const) {
  test(`keeps the admin panel available after ${hook} ${problem} during confirmed hook recovery`, async ({
    app,
    api: { post, json },
  }) => {
    await post('/api/admin/hooks', {
      preUp: '',
      postUp: `cp -p ${marker} /tmp/confirmed; echo up >> /tmp/phases`,
      preDown: `echo pre >> /tmp/phases; ${hook === 'PreDown' ? command : 'true'}`,
      postDown: `cp ${marker} /tmp/post-down-marker; echo post >> /tmp/phases; ${hook === 'PostDown' ? command : 'true'}`,
    });
    await post(iface + '/restart');
    await app.stopProcess('KILL');
    await app.execServer(['cp', '-p', '/tmp/confirmed', marker]);
    async function startAwaitingRepair() {
      await app.startProcess();
      await expectRestartRequired(json, true);
      expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');
      expect(await app.read('/tmp/phases')).toBe('up\npre\npost');
      expect(JSON.parse(await app.read(marker)).failedDownHook).toBe(hook);
      expect(
        JSON.parse(await app.read('/tmp/post-down-marker')).failedDownHook
      ).toBe(hook === 'PreDown' ? 'PreDown and PostDown' : 'PostDown');
    }
    if (problem === 'is interrupted') {
      await app.startProcess();
      await expect
        .poll(() => app.execServer(['ls', '/tmp/interrupted']).catch(() => ''))
        .toBe('/tmp/interrupted');
    }
    await startAwaitingRepair();
    await app.execServer(['chmod', '0700', '/etc/wireguard/.wg-easy']);
    await app.stopProcess('TERM');
    await startAwaitingRepair();
    await post(iface + '/restart');
    expect(await app.read('/tmp/phases')).toBe('up\npre\npost\nup');
    expect((await json(iface)).restartRequired).toBe(false);
  });
}

for (const hook of ['preDown', 'postDown'] as const) {
  test(`keeps the panel available when the marker write fails before ${hook}`, async ({
    app,
    api: { json, post },
  }) => {
    const command =
      hook === 'postDown'
        ? 'echo down >> /tmp/phases; false'
        : 'echo down >> /tmp/phases';
    await post('/api/admin/hooks', {
      preUp: '',
      postUp: `cp -p ${marker} /tmp/confirmed; echo up >> /tmp/phases`,
      preDown: '',
      postDown: '',
      [hook]: command,
    });
    await post(iface + '/restart');
    await app.stopProcess('KILL');
    await app.execServer(['cp', '-p', '/tmp/confirmed', marker]);
    // Let startup read the confirmed marker, then prevent its atomic replacement.
    const trigger =
      hook === 'preDown'
        ? "'-j link show dev wg0'"
        : "'link delete dev wg-easy-'*";
    await app.overrideIp(`/sbin/ip "$@" || exit $?
case "$*" in ${trigger})
  if test -f ${marker}; then mv ${marker} ${marker}.saved && mkdir ${marker}; fi ;;
esac`);
    await app.startProcess();
    await expectRestartRequired(json, true);
    await expect(post(iface + '/restart')).rejects.toThrow();
    expect(JSON.parse(await app.read(record))[hook]).toBe(command);
    expect(await app.read('/tmp/phases')).toBe('up');
    if (hook === 'preDown') {
      const [link] = JSON.parse(
        await app.execServer(['ip', '-j', 'link', 'show', 'wg0'])
      );
      expect(link.flags).not.toContain('UP');
      await app.stopProcess('TERM');
      await app.startProcess();
      await expectRestartRequired(json, true);
      await expect(post(iface + '/restart')).rejects.toThrow();
      expect(await app.read('/tmp/phases')).toBe('up');
    } else {
      expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');
    }
    await app.execServer(['rm', '/usr/local/bin/ip']);
    await app.execServer(['rmdir', marker]);
    await app.execServer(['mv', marker + '.saved', marker]);
    if (hook === 'postDown') {
      // This restart discovers a new hook failure after the journal is repaired.
      await expect(post(iface + '/restart')).rejects.toThrow();
      expect(await app.read('/tmp/phases')).toBe('up\ndown');
      expect((await json(iface)).restartRequired).toBe(true);
    }
    await post(iface + '/restart');
    await expect.poll(() => app.read('/tmp/phases')).toBe('up\ndown\nup');
    await expectRestartRequired(json, false);
  });
}

test('retains both failed hook names and guards the old filtered link during an explicit restart', async ({
  app,
  api: { json, post },
}) => {
  await post(iface, { ...(await json(iface)), firewallEnabled: true });
  await post('/api/admin/hooks', {
    preUp: '',
    postUp: '',
    preDown:
      'iptables -w 2 -C FORWARD -i %i -m comment --comment "wg-easy rebuild %i" -j DROP && echo guarded >> /tmp/phases; false',
    postDown: 'echo post >> /tmp/phases; false',
  });
  await post(iface + '/restart');
  await expect(post(iface + '/restart')).rejects.toThrow();
  expect(JSON.parse(await app.read(marker)).failedDownHook).toBe(
    'PreDown and PostDown'
  );
  await app.stopProcess('KILL');
  await app.startProcess();
  await expectRestartRequired(json, true);
  expect(await app.read('/tmp/phases')).toBe('guarded\npost');
  expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');
  await post(iface + '/restart');
  expect((await json(iface)).restartRequired).toBe(false);
});

test('recovers owned default rules only after the recorded link is gone', async ({
  app,
  api: { post, json, create },
}) => {
  const peer = await create('Default gateway');
  await post(peer, { ...(await json(peer)), serverAllowedIps: ['0.0.0.0/0'] });
  const readRecord = () => app.read(record);
  const running = await readRecord();
  const tag = JSON.parse(running).policy.tag;
  const rules = () => app.execServer(['ip', '-4', 'rule', 'show']);
  const mangle = () =>
    app.execServer(['iptables', '-w', '2', '-t', 'mangle', '-S']);
  await app.execServer(['ip', 'rule', 'add', 'pref', '15000', 'lookup', '741']);
  expect(await mangle()).toContain(tag);
  await app.execServer(['ip', 'link', 'set', 'wg0', 'down']);
  await app.execServer(['ip', 'link', 'set', 'wg0', 'name', 'moved0']);
  await expect(post(iface + '/restart')).rejects.toThrow();
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

for (const created of [false, true]) {
  test(`recovers after the operator frees an untagged temporary link (${created ? 'interrupted creation' : 'foreign link'})`, async ({
    app,
    api: { post },
  }) => {
    await app.overrideIp(`case "$*" in 'link add dev '*|'tuntap add dev '*)
  ${created ? '/sbin/ip "$@" || exit $?' : ''}
  echo "$4" >/tmp/unfinished
  while ! test -e /tmp/release-create; do sleep 0.1; done
  exit 1 ;;
esac
exec /sbin/ip "$@"`);
    const cutover = post(iface + '/restart').catch(() => {});
    const unfinished = () => app.read('/tmp/unfinished').catch(() => '');
    await expect.poll(unfinished).toMatch(/^wg/);
    await app.stopProcess('KILL');
    await app.execServer(['touch', '/tmp/release-create']);
    await cutover;
    const temporary = await unfinished();
    const pending = await app.read(record);
    expect(JSON.parse(pending)).toMatchObject({
      phase: 'creating',
      index: null,
    });
    await app.execServer(['rm', '/usr/local/bin/ip']);
    if (!created) {
      await app.execServer([
        'ip',
        'link',
        'add',
        'dev',
        temporary,
        'type',
        'dummy',
      ]);
    }
    await app.startProcess();
    await expect
      .poll(app.logs)
      .toContain('Cannot verify ownership of unfinished tunnel');
    expect(
      await app.execServer(['ip', '-details', 'link', 'show', temporary])
    ).toMatch(created ? /wireguard|tun type tun/ : /dummy/);
    expect(await app.read(record)).toBe(pending);
    // The operator knows who created this link and can safely free its name.
    await app.execServer(['ip', 'link', 'del', temporary]);
    await app.startProcess();
    await expect
      .poll(() => app.execServer(['wg', 'show', 'interfaces']))
      .toBe('wg0');
    const ready = JSON.parse(await app.read(record));
    expect(ready.policy.tag).not.toBe(JSON.parse(pending).policy.tag);
  });
}

test('retries a failed recovery record write without replaying PostUp', async ({
  app,
  request,
  api: { headers, post },
}) => {
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
  const index = () => app.read('/sys/class/net/wg0/ifindex');
  const running = await index();
  await app.execServer(['chmod', '0700', directory]);
  // A normal save triggers the same pending retry as maintenance. New hooks
  // apply to the next generation, even if the current record needs repair.
  await post('/api/admin/hooks', { ...hooks, preDown: '', postDown: '' });
  expect(await index()).toBe(running);
  expect(await app.read(phases)).toBe('up');
  expect(JSON.parse(await app.read(record))).toMatchObject({
    preDown: hooks.preDown,
    postDown: hooks.postDown,
  });
  await app.stopProcess('TERM');
  expect(await app.read(phases)).toBe('up\npre\npost');
});

test('keeps a failed boot hook stopped across container replacement until an admin restarts it', async ({
  app,
  playwright,
  request,
  api: { headers, post },
}) => {
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
    expect(await app.read(attempts)).toBe('failed');
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
    expect(await app.read(attempts)).toBe('failed\nrecovered');
    await app.stopProcess('TERM');
    await app.startProcess();
    await expect
      .poll(() => app.read(attempts))
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
    api: { post },
  }) => {
    await post('/api/admin/hooks', {
      preUp: '',
      postUp: '',
      preDown: 'touch /tmp/ran-down',
      postDown: 'touch /tmp/ran-down',
    });
    await post(iface + '/restart');
    const index = await app.read('/sys/class/net/wg0/ifindex');
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
      // A matching index and descriptive alias cannot prove generation ownership.
      const { policy } = JSON.parse(await app.read(record));
      await app.execServer([
        'ip',
        'link',
        'set',
        'wg0',
        'alias',
        policy.tag,
        'up',
      ]);
      if (evidence === 'missing record') {
        await app.execServer(['rm', record]);
      }
    }
    await app.shell('ip route add 192.0.2.0/24 dev wg0 table 741');
    await app.shell('ip rule add pref 14444 lookup 741');
    await app.shell(
      'iptables -A FORWARD -i wg0 -m comment --comment foreign -j ACCEPT'
    );
    const inspect = () =>
      Promise.all([
        app.read('/sys/class/net/wg0/ifindex'),
        app.read('/sys/class/net/wg0/ifalias'),
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
    api: { post },
  }) => {
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
      await post(iface + '/restart');
    }
    await app.execServer(['touch', '/tmp/pause']);
    const cutover = post(iface + '/restart').catch(() => {});
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
    await app.shell('kill "$(cat /tmp/paused-hook)"');
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
    expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');
    await post(iface + '/restart');
    await app.stopProcess('TERM');
    expect(await teardowns()).toBe(
      phase === 'PostUp' ? 'pre\npost' : 'pre\npost\npre\npost'
    );
  });
}

test('withdraws filtering after deleting a link whose PostUp failed', async ({
  app,
  request,
  api: { headers, json, post },
}) => {
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
  api: { post, json },
}) => {
  await post(iface, { ...(await json(iface)), firewallEnabled: true });
  await post('/api/admin/hooks', {
    preUp: '',
    postUp: '',
    preDown: '',
    postDown: 'echo down >> /tmp/post-down',
  });
  await post(iface + '/restart');
  await app.overrideIp(`case "$*" in 'link delete dev wg-easy-'*)
  /sbin/ip "$@" || exit 1
  touch /tmp/link-deleted
  exec sleep 60 ;;
esac
exec /sbin/ip "$@"`);
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
    .poll(() => app.read('/tmp/post-down').catch(() => ''))
    .toBe('down');
  await expect
    .poll(() => app.execServer(['wg', 'show', 'interfaces']))
    .toBe('wg0');
});

test('rolls back an unpublished link when alternate name assignment fails', async ({
  app,
  api: { post },
}) => {
  await app.overrideIp(`case "$*" in *' altname wg-easy-'*) echo "$5" >/tmp/unpublished; exit 2 ;; esac
exec /sbin/ip "$@"`);
  await expect(post(iface + '/restart')).rejects.toThrow();
  const temporary = await app.read('/tmp/unpublished');
  await app.execServer(['test', '!', '-e', '/sys/class/net/' + temporary]);
  await app.execServer(['test', '!', '-e', '/sys/class/net/wg0']);
  await app.execServer(['rm', '/usr/local/bin/ip']);
  await post(iface + '/restart');
  expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('wg0');
});

test('holds PostDown if its interface name is taken after the hook is journaled', async ({
  app,
  api: { post },
}) => {
  await post('/api/admin/hooks', {
    preUp: '',
    postUp: '',
    preDown: '',
    postDown: 'touch /tmp/ran-post-down',
  });
  await post(iface + '/restart');
  await app.overrideIp(`if [ "$*" = '-j link show dev wg0' ] && [ -f ${marker} ] && [ ! -e /sys/class/net/wg0 ]; then
  echo '[{"ifname":"wg0","ifindex":42}]'
  exit 0
fi
exec /sbin/ip "$@"`);
  await expect(post(iface + '/restart')).rejects.toThrow(/PostDown failed/);
  expect(JSON.parse(await app.read(record)).postDown).toBe('');
  expect(JSON.parse(await app.read(marker)).failedDownHook).toBe('PostDown');
  await app.execServer(['test', '!', '-e', '/tmp/ran-post-down']);
});

test('preserves a replacement that takes the public name just before link deletion', async ({
  app,
  api: { post },
}) => {
  await app.overrideIp(`case "$*" in 'link delete dev wg-easy-'*)
  index=$(cat /sys/class/net/wg0/ifindex)
  /sbin/ip link delete dev wg0
  /sbin/ip link add dev wg0 index "$index" type dummy ;;
esac
exec /sbin/ip "$@"`);
  await expect(post(iface + '/restart')).rejects.toThrow();
  expect(
    await app.execServer(['ip', '-details', 'link', 'show', 'wg0'])
  ).toContain('dummy');
});
