import type { APIRequestContext } from '@playwright/test';

import { expect, test } from './fixtures';
import { admin } from './helpers';

test.use({ ipv6: true });

async function routingAdmin(request: APIRequestContext, origin: string) {
  const { post, json, create, download } = await admin(request, origin);
  const peer = async (name: string) => {
    const url = await create(name);
    const settings = await json(url);
    return {
      url,
      settings,
      config: () => download(url),
      routes: (serverAllowedIps: string[]) =>
        post(url, { ...settings, serverAllowedIps }),
    };
  };
  const iface = '/api/admin/interface';
  const settings = await json(iface);
  return {
    peer,
    post,
    table: (routingTable: string) => post(iface, { ...settings, routingTable }),
  };
}

for (const backend of ['wg', 'awg'] as const) {
  test.describe(backend, () => {
    test.use({ backend });
    test('restarts to install and withdraw dual-stack default routes and reconnects peers', async ({
      request,
      app,
    }) => {
      const api = await routingAdmin(request, app.url);
      const gateway = await api.peer('Default gateway');
      const witness = await api.peer('Connected peer');
      await api.post('/api/admin/hooks', {
        preUp:
          'ip addr add 192.0.2.111/32 dev %i; ip addr add 2001:db8::111/128 dev %i; echo pre >> /tmp/hooks',
        postUp: 'echo up >> /tmp/hooks',
        preDown: 'echo down >> /tmp/hooks',
        postDown: 'echo post >> /tmp/hooks',
      });
      await api.post('/api/admin/interface/restart');
      await app.connectClient(await witness.config());
      await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
      const index = () => app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
      const mark = () => app.execServer([backend, 'show', 'wg0', 'fwmark']);
      const rules = () =>
        Promise.all(
          ['-4', '-6'].map((f) => app.execServer(['ip', f, 'rule', 'show']))
        );
      const lookup = (target: string, ...args: string[]) =>
        app.execServer(['ip', 'route', 'get', target, ...args]);
      const defaults = (family: string) =>
        app.execServer([
          'ip',
          family,
          'route',
          'show',
          'table',
          'all',
          'dev',
          'wg0',
          'exact',
          'default',
        ]);
      // Docker provides an IPv4 underlay. Add an IPv6 default to exercise the
      // socket-mark exemption in that family's real routing policy database.
      await app.execServer(['ip', 'link', 'add', 'underlay6', 'type', 'dummy']);
      await app.execServer(['ip', 'link', 'set', 'underlay6', 'up']);
      await app.execServer([
        'ip',
        '-6',
        'addr',
        'add',
        'fd12:3456::1/64',
        'dev',
        'underlay6',
        'nodad',
      ]);
      await app.execServer([
        'ip',
        '-6',
        'route',
        'add',
        'default',
        'dev',
        'underlay6',
        'metric',
        '1',
      ]);
      const [originalIndex, originalRules] = await Promise.all([
        index(),
        rules(),
      ]);
      await gateway.routes(['0.0.0.0/0', '::/0']);
      const dualStackIndex = await index();
      expect(dualStackIndex).not.toBe(originalIndex);
      expect(await app.execServer(['cat', '/tmp/hooks'])).toBe(
        'pre\nup\ndown\npost\npre\nup'
      );
      // The connected peer must initiate a new handshake after its server restarts.
      await expect
        .poll(() => app.pingFromClient('10.8.0.1'), { timeout: 35_000 })
        .toBe(true);
      await gateway.routes(['0.0.0.0/0', '::/0', '192.0.2.0/24']);
      expect(await index()).toBe(dualStackIndex);
      expect(
        await app.execServer([
          'ip',
          '-4',
          'route',
          'show',
          'table',
          'main',
          'exact',
          '192.0.2.0/24',
        ])
      ).toMatch(/^192\.0\.2\.0\/24 dev wg0\b/);
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      expect(await lookup('2001:db8::1')).toContain('dev wg0');
      const socketMark = await mark();
      expect(socketMark).not.toBe('off');
      const { policy } = JSON.parse(
        await app.execServer(['cat', '/etc/wireguard/.wg-easy/wg0.json'])
      );
      for (const [flag, command] of [
        ['-4', 'iptables'],
        ['-6', 'ip6tables'],
      ] as const) {
        const comment = `-m comment --comment ${policy.tag}`;
        const check = (table: string, rule: string) =>
          app.execServer([command, '-t', table, '-C', ...rule.split(' ')]);
        await check(
          'mangle',
          `POSTROUTING -p udp -m mark --mark ${socketMark} ${comment} -j CONNMARK --save-mark`
        );
        await check(
          'mangle',
          `PREROUTING -p udp ${comment} -j CONNMARK --restore-mark`
        );
        const [link] = JSON.parse(
          await app.execServer([
            'ip',
            flag,
            '-j',
            'address',
            'show',
            'dev',
            'wg0',
          ])
        );
        expect(link.addr_info.length).toBeGreaterThanOrEqual(2);
        for (const { local } of link.addr_info) {
          await check(
            'raw',
            `PREROUTING ! -i wg0 -d ${local} -m addrtype ! --src-type LOCAL ${comment} -j DROP`
          );
        }
      }
      expect(await lookup('203.0.113.1', 'mark', socketMark)).toContain(
        'dev eth0'
      );
      expect(await lookup('2001:db8::1', 'mark', socketMark)).toContain(
        'dev underlay6'
      );
      await gateway.routes(['0.0.0.0/0']);
      expect((await rules())[1]).toBe(originalRules[1]);
      for (const table of ['mangle', 'raw']) {
        expect(
          await app.execServer(['ip6tables', '-t', table, '-S'])
        ).not.toContain(policy.tag);
      }
      expect(await mark()).toBe(socketMark);
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      await gateway.routes(['0.0.0.0/0', '::/0']);
      const sourceDefault = [
        'default',
        'from',
        '2001:db8:1::/64',
        'dev',
        'underlay6',
        'metric',
        '100',
        'table',
        '100',
      ];
      await app.execServer(['ip', '-6', 'route', 'add', ...sourceDefault]);
      await api.table('100');
      for (const family of ['-4', '-6']) {
        expect(await defaults(family)).toContain('default table 100');
      }
      expect(await rules()).toEqual(originalRules);
      expect(await mark()).toBe('off');
      expect(await lookup('203.0.113.1')).toContain('dev eth0');
      const selector = ['pref', '100', 'to', '203.0.113.1/32', 'table', '100'];
      await app.execServer(['ip', '-4', 'rule', 'add', ...selector]);
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      await app.execServer(['ip', '-4', 'rule', 'del', ...selector]);
      await api.table('off');
      expect(
        await app.execServer(['ip', '-6', 'route', 'show', 'table', '100'])
      ).toContain('from 2001:db8:1::/64');
      for (const family of ['-4', '-6']) {
        expect(await defaults(family)).toBe('');
      }
      const allowed = await app.execServer([
        backend,
        'show',
        'wg0',
        'allowed-ips',
      ]);
      expect(allowed).toContain('0.0.0.0/0');
      expect(allowed).toContain('::/0');

      await api.table('auto');
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      expect(await lookup('2001:db8::1')).toContain('dev wg0');
      await gateway.routes([]);
      expect(await mark()).toBe('off');
      expect(await rules()).toEqual(originalRules);
    });
  });
}

test('keeps host routing precedence when automatic policy has no free priorities before main', async ({
  request,
  app,
}) => {
  const api = await routingAdmin(request, app.url);
  const peer = await api.peer('Default gateway');
  const ip = (...args: string[]) => app.execServer(['ip', '-6', ...args]);
  const v4Rules = () => app.execServer(['ip', '-4', 'rule', 'show']);
  const beforeV4 = await v4Rules();
  const destination = '2001:db8::17';
  const selector = ['to', destination, 'table', '600'];
  await ip('route', 'add', 'default', 'dev', 'lo', 'table', '600');
  await ip('rule', 'add', 'pref', '32765', ...selector);
  const before = await ip('rule', 'show');

  const requestDefault = () =>
    request.post(peer.url, {
      headers: { Origin: app.url },
      data: { ...peer.settings, serverAllowedIps: ['0.0.0.0/0', '::/0'] },
    });
  const failed = await requestDefault();
  expect(failed.status()).toBe(409);
  expect((await failed.json()).message).toContain('routing rule priorities');
  expect(await ip('rule', 'show')).toBe(before);
  expect(await v4Rules()).toBe(beforeV4);
  for (const table of ['mangle', 'raw']) {
    expect(await app.execServer(['iptables', '-t', table, '-S'])).not.toMatch(
      /wg-easy-[\da-f-]+/
    );
  }
  expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');

  // Leave precisely two priorities free, then retry the failed start.
  await ip('rule', 'add', 'pref', '32763', ...selector);
  await ip('rule', 'del', 'pref', '32765', ...selector);
  await peer.routes(['0.0.0.0/0', '::/0']);
  await peer.routes(['0.0.0.0/0', '::/0', '192.0.2.0/24']);
  expect(await ip('route', 'get', '2001:db8::18')).toContain('dev wg0');
});

test('allocates a socket mark outside host rule masks in both families', async ({
  request,
  app,
}) => {
  const api = await routingAdmin(request, app.url);
  const peer = await api.peer('Marked gateway');
  const ip = (...args: string[]) => app.execServer(['ip', ...args]);
  const mark = () => app.execServer(['wg', 'show', 'wg0', 'fwmark']);
  const destination = '203.0.113.27';
  await ip('-4', 'route', 'add', destination, 'dev', 'eth0', 'table', '600');
  await ip(
    '-4',
    'rule',
    'add',
    'pref',
    '80',
    'fwmark',
    '0x6c/0xff',
    'table',
    '600'
  );
  await ip(
    '-6',
    'rule',
    'add',
    'pref',
    '81',
    'fwmark',
    '0/0x80000000',
    'table',
    '601'
  );
  const route = (mark: string) =>
    ip('-4', 'route', 'get', destination, 'mark', mark);
  // The usual 51820 socket mark sends the handshake through the host's table.
  expect(await route('51820')).toContain('table 600');
  await peer.routes(['0.0.0.0/0']);
  const assigned = await mark();
  expect(Number(assigned) & 0xff).not.toBe(0x6c);
  expect(Number(assigned)).toBeGreaterThanOrEqual(0x80000000);
  expect(await route(assigned)).not.toContain('table 600');

  await peer.routes(['0.0.0.0/0', '::/0']);
  expect(await mark()).toBe(assigned);
  await peer.routes([]);
  expect(await mark()).toBe('off');
  expect(await route('51820')).toContain('table 600');

  // A fresh allocation must use the one mark exempt from an inverted rule.
  const exemption = '0x80001234';
  const inverted = ['pref', '79', 'not', 'fwmark', exemption, 'table', '604'];
  await ip('-6', 'rule', 'add', ...inverted);
  await peer.routes(['0.0.0.0/0']);
  expect(await mark()).toBe(exemption);
  await peer.routes([]);
  await ip('-6', 'rule', 'del', ...inverted);

  // Every nonzero mark now matches at least one host rule.
  await ip('-4', 'rule', 'add', 'pref', '82', 'fwmark', '0/1', 'table', '602');
  await ip('-6', 'rule', 'add', 'pref', '83', 'fwmark', '1/1', 'table', '603');
  const blocked = await request.post(peer.url, {
    headers: { Origin: app.url },
    data: { ...peer.settings, serverAllowedIps: ['0.0.0.0/0'] },
  });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).message).toContain('No firewall mark');
  expect(await app.execServer(['wg', 'show', 'interfaces'])).toBe('');
  expect(await route('51820')).toContain('table 600');
});

test('uses a PreUp socket mark and leaves a host replacement rule alone during teardown', async ({
  request,
  app,
}) => {
  const api = await routingAdmin(request, app.url);
  const peer = await api.peer('Default gateway');
  await api.post('/api/admin/hooks', {
    preUp: 'wg set %i fwmark 600',
    postUp: '',
    preDown: '',
    postDown: '',
  });
  const ip = (...args: string[]) => app.execServer(['ip', ...args]);
  await ip(
    '-6',
    'rule',
    'add',
    'pref',
    '500',
    'from',
    '2001:db8:1234::/64',
    'table',
    '600'
  );
  await ip('-4', 'route', 'add', '192.0.2.0/24', 'dev', 'eth0', 'table', '601');
  await peer.routes(['0.0.0.0/0']);
  expect(await app.execServer(['wg', 'show', 'wg0', 'fwmark'])).toBe('0x258');
  const rules = async () =>
    JSON.parse(await ip('-4', '-N', '-j', '-d', 'rule', 'show')) as {
      priority: number;
      fwmark?: string;
      table: string;
      protocol: string;
      not?: null;
    }[];
  const lookup = (await rules()).find((rule) => Object.hasOwn(rule, 'not'))!;
  expect(lookup).toMatchObject({ fwmark: '0x258', table: '602' });
  const selector = [
    'fwmark',
    '600',
    'table',
    lookup.table,
    'pref',
    String(lookup.priority),
    'protocol',
    '242',
  ];
  await ip('-4', 'rule', 'del', 'not', ...selector);
  await ip('-4', 'rule', 'add', ...selector);
  await api.table('off');
  expect(await rules()).toContainEqual(
    expect.objectContaining({
      priority: lookup.priority,
      fwmark: '0x258',
      protocol: '242',
    })
  );
  expect(await ip('-4', 'route', 'show', 'table', '601')).toContain(
    '192.0.2.0/24 dev eth0'
  );
  expect(await ip('-6', 'rule', 'show')).toContain('lookup 600');
});

test.describe('strict reverse-path filtering', () => {
  test.use({ strictReversePath: true });
  test('accepts a fresh handshake from an endpoint reachable only through the underlay default', async ({
    request,
    app,
  }) => {
    const api = await routingAdmin(request, app.url);
    const peer = await api.peer('Remote endpoint');
    const gateway = await api.peer('Default gateway');
    await app.connectClient(await peer.config());
    const [link] = JSON.parse(
      await app.execClient(['ip', '-j', 'addr', 'show', 'dev', 'eth0'])
    );
    const endpoint = link.addr_info[0].local;
    const [serverLink] = JSON.parse(
      await app.execServer(['ip', '-j', 'addr', 'show', 'dev', 'eth0'])
    );
    // Pin L2 neighbors before removing Docker's connected L3 route.
    await app.execClient([
      'ip',
      'neighbor',
      'replace',
      serverLink.addr_info[0].local,
      'lladdr',
      serverLink.address,
      'nud',
      'permanent',
      'dev',
      'eth0',
    ]);
    await app.execServer([
      'ip',
      'neighbor',
      'replace',
      endpoint,
      'lladdr',
      link.address,
      'nud',
      'permanent',
      'dev',
      'eth0',
    ]);
    const ip = (...args: string[]) => app.execServer(['ip', '-4', ...args]);
    const [connected] = JSON.parse(
      await ip('-j', 'route', 'show', 'dev', 'eth0', 'scope', 'link')
    );
    const [underlay] = JSON.parse(await ip('-j', 'route', 'show', 'default'));
    // Keep the Docker gateway reachable for the admin API. The client remains
    // on the same Ethernet segment, but only the physical default reaches it.
    await ip('route', 'add', underlay.gateway + '/32', 'dev', 'eth0');
    await ip(
      'route',
      'replace',
      'default',
      'via',
      endpoint,
      'dev',
      'eth0',
      'onlink'
    );
    await ip('route', 'del', connected.dst, 'dev', 'eth0');
    await app.execClient(['wg-quick', 'down', 'wg0']);
    await gateway.routes(['0.0.0.0/0']);
    expect(await app.execServer(['ip', 'route', 'get', endpoint])).toContain(
      'dev wg0'
    );
    const mark = await app.execServer(['wg', 'show', 'wg0', 'fwmark']);
    expect(
      await app.execServer(['ip', 'route', 'get', endpoint, 'mark', mark])
    ).toContain('via ' + endpoint);
    await app.execClient(['wg-quick', 'up', 'wg0']);
    await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
    expect(await app.execServer(['wg', 'show', 'wg0', 'endpoints'])).toContain(
      endpoint + ':'
    );
  });
});

test.describe('IPv4-only automatic routing', () => {
  test.use({ ipv6: false });
  test('skips an unsupported IPv6 rule dump and avoids occupied and reserved tables', async ({
    app,
    request,
  }) => {
    const api = await routingAdmin(request, app.url);
    const peer = await api.peer('IPv4 gateway');
    const ip = (...args: string[]) => app.execServer(['ip', ...args]);
    await ip(
      '-4',
      'route',
      'add',
      '192.0.2.1',
      'dev',
      'eth0',
      'table',
      '51820'
    );
    await ip(
      '-4',
      'rule',
      'add',
      'pref',
      '700',
      'to',
      '198.51.100.1',
      'table',
      '51821'
    );
    await app.execServer([
      'sh',
      '-ec',
      `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case "$*" in
  '-6 -N -j -d rule show') echo "RTNETLINK answers: $(cat /tmp/ipv6-error)" >&2; exit 2 ;;
  *'route show table all') echo 'unexpected all-table dump' >&2; exit 2 ;;
esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip
echo 'Permission denied' > /tmp/ipv6-error`,
    ]);
    await expect(peer.routes(['0.0.0.0/0'])).rejects.toThrow();
    await app.execServer([
      'sh',
      '-c',
      'echo "Address family not supported by protocol" > /tmp/ipv6-error',
    ]);
    await peer.routes(['0.0.0.0/0']);
    expect(
      await ip('-4', 'route', 'show', 'table', '51822', 'exact', 'default')
    ).toContain('default dev wg0');
  });
});
