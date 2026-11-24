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
    test('changes default routes live while another peer carries traffic', async ({
      request,
      app,
    }) => {
      const api = await routingAdmin(request, app.url);
      const gateway = await api.peer('Default gateway');
      const witness = await api.peer('Connected peer');
      await api.post('/api/admin/hooks', {
        preUp: 'echo pre >> /tmp/hooks',
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
      const tableRoutes = (family: string, table: string) =>
        app
          .execServer([
            'ip',
            family,
            'route',
            'show',
            'table',
            'all',
            'dev',
            'wg0',
          ])
          .then((s) =>
            s
              .split('\n')
              .filter((r) => r.includes(' table ' + table))
              .join('\n')
          );
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
      const traffic = app.execClient([
        'ping',
        '-c',
        '80',
        '-i',
        '0.1',
        '-I',
        'wg0',
        '10.8.0.1',
      ]);
      await gateway.routes(['0.0.0.0/0', '::/0']);
      expect(await index()).toBe(originalIndex);
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      expect(await lookup('2001:db8::1')).toContain('dev wg0');
      const socketMark = await mark();
      expect(socketMark).not.toBe('off');
      expect(await lookup('203.0.113.1', 'mark', socketMark)).toContain(
        'dev eth0'
      );
      expect(await lookup('2001:db8::1', 'mark', socketMark)).toContain(
        'dev underlay6'
      );
      await gateway.routes(['0.0.0.0/0']);
      expect((await rules())[1]).toBe(originalRules[1]);
      expect(await mark()).toBe(socketMark);
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      await gateway.routes(['0.0.0.0/0', '::/0']);
      await api.table('100');
      for (const family of ['-4', '-6']) {
        expect(await tableRoutes(family, '100')).toContain('default table 100');
      }
      expect(await rules()).toEqual(originalRules);
      expect(await mark()).toBe('off');
      expect(await lookup('203.0.113.1')).toContain('dev eth0');
      const selector = ['pref', '100', 'to', '203.0.113.1/32', 'table', '100'];
      await app.execServer(['ip', '-4', 'rule', 'add', ...selector]);
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      await app.execServer(['ip', '-4', 'rule', 'del', ...selector]);
      await api.table('off');
      for (const family of ['-4', '-6']) {
        expect(await tableRoutes(family, '100')).toBe('');
      }
      const allowed = await app.execServer([
        backend,
        'show',
        'wg0',
        'allowed-ips',
      ]);
      expect(allowed).toContain('0.0.0.0/0');
      expect(allowed).toContain('::/0');
      expect(await index()).toBe(originalIndex);
      expect(await app.execServer(['cat', '/tmp/hooks'])).toBe('pre\nup');
      expect(await traffic).toContain(', 0% packet loss');

      await api.table('auto');
      await api.post('/api/admin/interface/restart');
      expect(await lookup('203.0.113.1')).toContain('dev wg0');
      expect(await lookup('2001:db8::1')).toContain('dev wg0');
      await gateway.routes([]);
      expect(await mark()).toBe('off');
      expect(await rules()).toEqual(originalRules);
    });
  });
}

test('rolls back a partially withdrawn IPv6 policy, keeps the revocation, and retries live', async ({
  request,
  app,
}) => {
  test.slow(); // The lifecycle maintenance timer runs once per minute.
  const api = await routingAdmin(request, app.url);
  const witness = await api.peer('IPv4 gateway');
  const revoked = await api.peer('IPv6 gateway');
  const candidate = await api.peer('New IPv6 gateway');
  await api.post('/api/admin/hooks', {
    preUp: 'echo up >> /tmp/phases',
    postUp: '',
    preDown: 'echo down >> /tmp/phases',
    postDown: '',
  });
  await api.post('/api/admin/interface/restart');
  const read = (family: string) =>
    app.execServer(['/sbin/ip', family, 'rule', 'show']);
  const beforeV6 = await read('-6');
  const mark = () => app.execServer(['wg', 'show', 'wg0', 'fwmark']);
  await witness.routes(['0.0.0.0/0']);
  await revoked.routes(['::/0']);
  const appliedMark = await mark();
  await app.connectClient(await witness.config());
  await expect.poll(() => app.pingFromClient('10.8.0.1')).toBe(true);
  const index = () => app.execServer(['cat', '/sys/class/net/wg0/ifindex']);
  const [originalIndex, v4, v6] = await Promise.all([
    index(),
    read('-4'),
    read('-6'),
  ]);
  // Fail after the IPv6 tunnel lookup was removed, before its suppress-main
  // rule can be retired. The real kernel carries all other policy updates.
  await app.execServer([
    'sh',
    '-ec',
    `cat > /usr/local/bin/ip <<'SH'
#!/bin/sh
case " $* " in
  *" -6 rule del "*" suppress_prefixlength "*) exit 2 ;;
  *" -6 -N -j -d rule show "*) test ! -f /tmp/fail-rule-read || exit 2 ;;
esac
exec /sbin/ip "$@"
SH
chmod +x /usr/local/bin/ip`,
  ]);
  const ongoing = app.execClient([
    'ping',
    '-c',
    '30',
    '-i',
    '0.1',
    '-I',
    'wg0',
    '10.8.0.1',
  ]);
  // A host reachable only through the gateway's default needs both the Linux
  // policy and WireGuard AllowedIPs to keep working after rollback.
  const remote = '2001:db8:1234::1';
  await app.connectClient(await revoked.config(), 2);
  await app.execClient(
    ['ip', '-6', 'address', 'add', remote + '/128', 'dev', 'lo'],
    2
  );
  await app.execClient(
    ['ping', '-6', '-c', '1', '-W', '3', 'fdcc:ad94:bacf:61a4::cafe:1'],
    2
  );
  const pingRemote = () =>
    app.execServer(['ping', '-6', '-c', '1', '-W', '3', remote]);
  expect(await pingRemote()).toContain('0% packet loss');
  const failedWithdrawal = await request.post(revoked.url, {
    headers: { Origin: app.url },
    data: { ...revoked.settings, serverAllowedIps: ['2001:db8:2222::/64'] },
  });
  expect(failedWithdrawal.status()).toBe(500);
  expect(await pingRemote()).toContain('0% packet loss');
  expect(await app.execServer(['wg', 'show', 'wg0', 'allowed-ips'])).toContain(
    '2001:db8:2222::/64'
  );
  // The old gateway is already removed from saved settings. A failed
  // transfer to the next gateway must keep the old one carrying traffic.
  const candidateRoutes = (routes: string[]) =>
    request.post(candidate.url, {
      headers: { Origin: app.url },
      data: { ...candidate.settings, serverAllowedIps: routes },
    });
  await app.execServer(['touch', '/tmp/fail-rule-read']);
  expect((await candidateRoutes(['::/0'])).status()).toBe(500);
  expect(await pingRemote()).toContain('0% packet loss');
  expect(await mark()).toBe(appliedMark);
  expect((await candidateRoutes([])).status()).toBe(500);
  const failed = await request.post(revoked.url + '/disable', {
    headers: { Origin: app.url },
  });
  expect(failed.status()).toBe(500);
  expect((await failed.json()).message).toContain('::/0 on wg0 in table 51820');
  expect(await app.peers()).not.toContain(revoked.settings.publicKey);
  expect(await read('-6')).toBe(v6);
  expect(await read('-4')).toBe(v4);
  expect(
    await app.execServer(['ip', '-6', 'route', 'get', '2001:db8::1'])
  ).toContain('dev wg0');
  expect(await ongoing).toContain(', 0% packet loss');
  await app.execServer(['mv', '/usr/local/bin/ip', '/tmp/failed-ip']);
  await expect
    .poll(() => read('-6'), { timeout: 75_000, intervals: [1000] })
    .toBe(beforeV6);
  expect(await read('-4')).toBe(v4);
  expect(await index()).toBe(originalIndex);
  expect(await app.execServer(['cat', '/tmp/phases'])).toBe('up');
  expect(await app.peers()).not.toContain(revoked.settings.publicKey);
  expect(await app.pingFromClient('10.8.0.1')).toBe(true);

  // With no previous gateway, a failed addition leaves only the independent site.
  await api.table('100');
  await app.execServer(['ip', 'link', 'add', 'fallback6', 'type', 'dummy']);
  await app.execServer(['ip', 'link', 'set', 'fallback6', 'up']);
  await app.execServer([
    'ip',
    '-6',
    'address',
    'add',
    'fd12:3456::1/64',
    'dev',
    'fallback6',
    'nodad',
  ]);
  await app.execServer([
    'ip',
    '-6',
    'route',
    'add',
    'default',
    'dev',
    'fallback6',
    'table',
    '100',
    'metric',
    '1',
  ]);
  expect((await candidateRoutes(['::/0', '2001:db8:abcd::/64'])).status()).toBe(
    409
  );
  const allowed = await app.execServer(['wg', 'show', 'wg0', 'allowed-ips']);
  expect(allowed).not.toContain('::/0');
  expect(allowed).toContain('2001:db8:abcd::/64');
});

test('keeps host routing precedence when automatic policy has no free priorities before main', async ({
  request,
  app,
}) => {
  const api = await routingAdmin(request, app.url);
  const peer = await api.peer('Default gateway');
  const ip = (...args: string[]) => app.execServer(['ip', '-4', ...args]);
  const destination = '203.0.113.17';
  const selector = ['to', destination, 'table', '600'];
  await ip('route', 'add', 'default', 'dev', 'eth0', 'table', '600');
  await ip('rule', 'add', 'pref', '32765', ...selector);
  const before = await ip('rule', 'show');

  const requestDefault = () =>
    request.post(peer.url, {
      headers: { Origin: app.url },
      data: { ...peer.settings, serverAllowedIps: ['0.0.0.0/0'] },
    });
  const failed = await requestDefault();
  expect(failed.status()).toBe(409);
  expect((await failed.json()).message).toContain('routing rule priorities');
  expect(await ip('rule', 'show')).toBe(before);
  expect(await ip('route', 'get', destination)).toContain('table 600');
  expect(await app.execServer(['wg', 'show', 'wg0', 'fwmark'])).toBe('off');
  expect(
    await app.execServer(['wg', 'show', 'wg0', 'allowed-ips'])
  ).not.toContain('0.0.0.0/0');

  // Leave precisely two priorities free. A subsequent sync must reuse its pair.
  await ip('rule', 'add', 'pref', '32763', ...selector);
  await ip('rule', 'del', 'pref', '32765', ...selector);
  await peer.routes(['0.0.0.0/0']);
  await peer.routes(['0.0.0.0/0', '192.0.2.0/24']);
  expect(await ip('route', 'get', destination)).toContain('table 600');
  expect(await ip('route', 'get', '203.0.113.18')).toContain('dev wg0');

  // Move the host rule behind an active suppress-main rule. A specific main
  // route now masks the host's table until the old automatic policy yields.
  await ip('route', 'add', destination, 'dev', 'eth0');
  await ip('rule', 'del', 'pref', '32763', ...selector);
  await ip('rule', 'add', 'pref', '32765', ...selector);
  expect(await ip('route', 'get', destination)).not.toContain('table 600');
  expect((await requestDefault()).status()).toBe(409);
  expect(await ip('rule', 'show')).toBe(before);
  expect(await ip('route', 'get', destination)).toContain('table 600');
  expect(await app.execServer(['wg', 'show', 'wg0', 'fwmark'])).toBe('off');
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
  expect(await mark()).toBe('off');
  expect(await route('51820')).toContain('table 600');
});

test('borrows host marks, avoids occupied tables and preserves replaced rules and foreign routes', async ({
  request,
  app,
}) => {
  const api = await routingAdmin(request, app.url);
  const peer = await api.peer('Default gateway');
  const ip = (...args: string[]) => app.execServer(['ip', ...args]);
  const mark = () => app.execServer(['wg', 'show', 'wg0', 'fwmark']);
  await app.execServer(['wg', 'set', 'wg0', 'fwmark', '600']);
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
  await ip(
    '-4',
    'route',
    'add',
    'default',
    'dev',
    'wg0',
    'table',
    '100',
    'proto',
    '99'
  );
  const rules = async () =>
    JSON.parse(await ip('-4', '-N', '-j', '-d', 'rule', 'show')) as {
      priority: number;
      protocol: string;
      table: string;
      fwmark?: string;
      not?: null;
    }[];
  const lookup = async () =>
    (await rules()).find(
      (r) => r.protocol === '242' && Object.hasOwn(r, 'not')
    )!;
  await peer.routes(['0.0.0.0/0']);
  expect(await mark()).toBe('0x258');
  expect(await lookup()).toMatchObject({ fwmark: '0x258', table: '602' });
  // A host can change its socket mark while an automatic policy is active.
  await app.execServer(['wg', 'set', 'wg0', 'fwmark', '610']);
  await peer.routes(['0.0.0.0/0', '192.0.2.128/25']);
  const current = await lookup();
  expect(current.fwmark).toBe('0x262');
  expect(
    await ip('-4', 'route', 'get', '203.0.113.1', 'mark', '610')
  ).toContain('dev eth0');
  const selector = [
    'fwmark',
    '610',
    'table',
    current.table,
    'pref',
    String(current.priority),
    'protocol',
    '242',
  ];
  await ip('-4', 'rule', 'del', 'not', ...selector);
  await ip('-4', 'rule', 'add', ...selector);
  await api.table('100');
  expect(await rules()).toContainEqual(
    expect.objectContaining({
      priority: current.priority,
      fwmark: '0x262',
      protocol: '242',
    })
  );
  await api.table('off');
  expect(await ip('-4', '-N', 'route', 'show', 'table', '100')).toContain(
    'default dev wg0 proto 99'
  );
  expect(await ip('-4', 'route', 'show', 'table', '601')).toContain(
    '192.0.2.0/24 dev eth0'
  );
  expect(await ip('-6', 'rule', 'show')).toContain('lookup 600');
  await api.table('101');
  const site = '192.0.2.128/25';
  await ip(
    '-4',
    'route',
    'replace',
    site,
    'dev',
    'wg0',
    'table',
    '101',
    'proto',
    '242',
    'mtu',
    '1300'
  );
  await ip(
    '-4',
    'route',
    'replace',
    'default',
    'dev',
    'wg0',
    'table',
    '101',
    'proto',
    '242',
    'src',
    '10.8.0.1'
  );
  await api.table('off');
  expect(await ip('-4', '-N', 'route', 'show', 'table', '101')).toContain(
    'src 10.8.0.1'
  );
  expect(
    await ip('-4', 'route', 'show', 'table', '101', 'exact', site)
  ).toContain('mtu 1300');
  expect(await mark()).toBe('0x262');
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
    const iface = '/api/admin/interface';
    await api.post(iface, {
      ...(await (await request.get(iface)).json()),
      port: 51830,
    });

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
