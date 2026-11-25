import { describe, expect, test, vi } from 'vitest';
import { containsCidr } from 'cidr-tools';

import { vpnFixture } from '../helpers/vpn';

import * as vpn from '#server/features/vpn/lifecycle';
import * as commands from '#server/utils/cmd';

const prefix = '192.168.120.0/22';

async function fixture(
  kernelFields: (table: string) => {
    table?: string | number;
    type?: string | number;
  } = (table) => ({ table, type: '1' })
) {
  const { store, commands: wg } = await vpnFixture();
  const entries = new Map<
    string,
    { dev: string; protocol: string; table: string }
  >();
  const mutate = vi.fn();
  vi.spyOn(commands, 'exec').mockImplementation(async (command) => {
    const args = command.split(' ');
    if (args.includes('show')) {
      const table = args[args.indexOf('table') + 1];
      const match = args.includes('match') ? args.at(-1) : undefined;
      return JSON.stringify(
        [
          ...entries,
          // The kernel installs connected subnet routes with the tunnel addresses.
          ...['10.8.0.0/24', 'fdcc:ad94:bacf:61a4::/64'].map(
            (dst) => [dst, { dev: 'wg0', table: '254', protocol: '2' }] as const
          ),
        ]
          .filter(
            ([dst, entry]) =>
              entry.table === table &&
              dst.includes(':') === args.includes('-6') &&
              (!match || containsCidr(dst, match))
          )
          .map(([dst, entry]) => ({
            dev: entry.dev,
            protocol: entry.protocol,
            ...(entry.protocol === '2'
              ? { table: entry.table }
              : kernelFields(entry.table)),
            // iproute2 omits the prefix length for host routes.
            dst: dst.replace(dst.includes(':') ? /\/128$/ : /\/32$/, ''),
            scope: args.includes('-6') ? 0 : 253,
            metric: args.includes('-6') ? 1024 : 0,
          }))
      );
    }
    const [, , , action, dst, , dev, , table, , protocol] = args;
    mutate(action, dst, table);
    if (action === 'add') {
      expect(entries.has(dst!)).toBe(false);
      entries.set(dst!, { dev: dev!, protocol: protocol!, table: table! });
    } else {
      expect(action).toBe('del');
      expect(entries.get(dst!)).toEqual({ dev, table, protocol });
      entries.delete(dst!);
    }
    return '';
  });
  const setRoutes = (values: string[], id = 1) =>
    vpn.commit((tx) => tx.clients.update(id, { serverAllowedIps: values }));
  return { store, wg, entries, mutate, setRoutes };
}

describe('Server Allowed IP routes', () => {
  test.each([{ table: 'main', type: 'unicast' }, {}, { table: 254, type: 1 }])(
    'recognizes conflicts and retains ownership with kernel fields %j',
    async (fields) => {
      const { setRoutes, entries, mutate, store } = await fixture(() => fields);
      entries.set(prefix, { dev: 'eth0', table: '254', protocol: '4' });
      await expect(setRoutes([prefix])).rejects.toMatchObject({ status: 409 });
      expect(mutate).not.toHaveBeenCalled();
      entries.delete(prefix);
      await vpn.maintain();
      await setRoutes([prefix]);
      await vpn.commit((tx) => tx.clients.setEnabled([1], false));
      expect(entries.size).toBe(0);
      expect((await store.clients.get(1))?.enabled).toBe(false);
      expect(mutate.mock.calls).toEqual([
        ['add', prefix, '254'],
        ['del', prefix, '254'],
      ]);
    }
  );

  test.each([
    ['local', '255'],
    ['default', '253'],
  ])('recognizes the named %s table only for its own ID', async (table, id) => {
    const { setRoutes, entries, store, mutate } = await fixture(() => ({
      table,
      type: 'unicast',
    }));
    entries.set('192.168.0.0/16', { dev: 'wg0', table: id, protocol: '4' });
    await setRoutes([prefix]);
    expect(mutate).toHaveBeenCalledWith('add', prefix, '254');
    await store.interfaces.update({ routingTable: id });
    entries.set(prefix, { dev: 'eth0', table: id, protocol: '4' });
    await expect(setRoutes([prefix])).rejects.toMatchObject({ status: 409 });
  });

  test('leaves a covering connected route alone, including when the client is deleted', async () => {
    const { setRoutes, entries, mutate, store } = await fixture();
    entries.set('10.8.0.0/24', { dev: 'wg0', table: '254', protocol: '2' });
    await setRoutes(['10.8.0.7/32']);
    await vpn.commit((tx) => tx.clients.deleteMany([1]));
    expect(await store.clients.get(1)).toBeUndefined();
    expect(mutate).not.toHaveBeenCalled();
  });

  test('falls back to prefix lookups when the selected table exceeds the buffer', async () => {
    const { setRoutes, entries, mutate } = await fixture();
    const command = vi.mocked(commands.exec);
    const run = command.getMockImplementation()!;
    command.mockImplementation((cmd, options) => {
      if (cmd.endsWith('route show table 254')) {
        throw Object.assign(new Error('stdout maxBuffer exceeded'), {
          code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
        });
      }
      return run(cmd, options);
    });
    entries.set(prefix, { dev: 'eth0', table: '254', protocol: '4' });
    await expect(setRoutes([prefix])).rejects.toMatchObject({ status: 409 });
    expect(mutate).not.toHaveBeenCalled();
    expect(command).toHaveBeenCalledWith(
      `ip -4 -N -j -details route show table 254 match ${prefix}`,
      expect.any(Object)
    );
  });
  test('shares canonical prefixes across enabled clients and withdraws them on expiry', async () => {
    const { store, entries, mutate, setRoutes } = await fixture();
    await store.clients.insert({
      ...(await store.clients.get(1))!,
      id: 2,
      publicKey: 'other',
      ipv4Address: '10.8.0.3',
      ipv6Address: 'fdcc:ad94:bacf:61a4::3',
    });
    await setRoutes(['192.168.120.1/22']);
    await setRoutes([prefix], 2);
    await vpn.commit((tx) => tx.clients.deleteMany([1]));
    expect([...entries.keys()]).toEqual([prefix]);
    await store.clients.update(2, { expiresAt: '2000-01-01' });
    await vpn.maintain();
    expect(entries.size).toBe(0);
    expect(mutate.mock.calls).toEqual([
      ['add', prefix, '254'],
      ['del', prefix, '254'],
    ]);
  });

  test('handles IPv6, a numeric table, and switching routing off', async () => {
    const { store, entries, setRoutes, mutate } = await fixture();
    await store.interfaces.update({ routingTable: '100' });
    await setRoutes(['2001:db8:0:0::1/64']);
    expect(entries.get('2001:db8::/64')?.table).toBe('100');
    await vpn.commit((tx) => tx.interfaces.update({ routingTable: 'off' }));
    await setRoutes([prefix]);
    for (const prefix of [
      '10.8.0.2/32',
      'fdcc:ad94:bacf:61a4::cafe:2/128',
      '2001:db8::/64',
    ]) {
      expect(mutate).toHaveBeenCalledWith('add', prefix, '100');
      expect(mutate).toHaveBeenCalledWith('del', prefix, '100');
    }
    expect(entries.size).toBe(0);
  });

  test('leaves default routing to the host when Table is off', async () => {
    const { store, wg, setRoutes } = await fixture();
    await store.interfaces.update({ routingTable: 'off' });
    await setRoutes(['0.0.0.0/0', '::/0']);
    await setRoutes([]);
    expect(wg.up).not.toHaveBeenCalled();
    expect(wg.sync).toHaveBeenCalledTimes(2);
  });

  test('keeps a failed PostUp down until an explicit restart', async () => {
    const { store, wg, setRoutes } = await fixture();
    await store.clients.update(1, { serverAllowedIps: [prefix] });
    wg.runHook.mockRejectedValueOnce(
      new Error('hook failed after its first command')
    );
    await expect(vpn.restart()).rejects.toThrow('PostUp failed');
    expect(wg.down).toHaveBeenCalledTimes(2);
    await vpn.maintain();
    await expect(setRoutes([prefix, '::/0'])).rejects.toThrow('PostUp failed');
    await vpn.maintain();
    expect(wg.up).toHaveBeenCalledTimes(1);
    expect(wg.runHook).toHaveBeenCalledTimes(1);
    await vpn.restart();
    expect(wg.runHook).toHaveBeenCalledTimes(2);
    await vpn.maintain();
    expect(wg.up).toHaveBeenCalledTimes(2);
  });

  test.each([
    ['10.8.0.2', 32],
    ['fdcc:ad94:bacf:61a4::cafe:2', 128],
  ] as const)(
    'keeps the route to peer %s until it is disabled',
    async (address, length) => {
      const { store, entries, mutate, setRoutes } = await fixture();
      const host = `${address}/${length}`;
      await store.interfaces.update({ routingTable: '100' });
      await setRoutes([host]);
      await setRoutes([address]);
      await setRoutes([]);
      expect(entries.get(host)?.dev).toBe('wg0');
      await vpn.commit((tx) => tx.clients.update(1, { enabled: false }));
      expect(mutate).toHaveBeenCalledWith('add', host, '100');
      expect(mutate).toHaveBeenCalledWith('del', host, '100');
      expect(entries.size).toBe(0);
    }
  );

  test.each(['add', 'del'])(
    'retries a failed %s against the committed state',
    async (action) => {
      const { store, entries, mutate, setRoutes } = await fixture();
      if (action === 'del') {
        await setRoutes([prefix]);
      }
      const desired = action === 'del' ? [] : [prefix];
      mutate.mockImplementationOnce(() => {
        throw new Error('ip failed');
      });
      await expect(setRoutes(desired)).rejects.toMatchObject({
        message: expect.stringContaining(prefix),
      });
      expect((await store.clients.get(1))?.serverAllowedIps).toEqual(desired);
      await vpn.maintain();
      expect(entries.has(prefix)).toBe(action === 'add');
    }
  );

  test('preserves conflicting, pre-existing and externally replaced routes', async () => {
    const { setRoutes, entries, mutate } = await fixture();
    entries.set(prefix, { dev: 'eth0', table: '254', protocol: '4' });
    await expect(setRoutes([prefix])).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining(prefix),
    });
    expect(mutate).not.toHaveBeenCalled();
    entries.get(prefix)!.dev = 'wg0';
    await vpn.maintain();
    await setRoutes([]);
    expect(mutate).not.toHaveBeenCalled();

    entries.clear();
    await setRoutes([prefix]);
    entries.get(prefix)!.protocol = '4';
    await setRoutes([]);
    expect(entries.get(prefix)?.protocol).toBe('4');
  });

  test('preserves an operator replacement with the same protocol and metric', async () => {
    let extras = {};
    const { setRoutes, entries } = await fixture((table) => ({
      table,
      ...extras,
    }));
    await setRoutes([prefix]);
    // An operator replaces the route after installation. The first routing
    // read on withdrawal must check this prefix against the live table.
    extras = { prefsrc: '10.8.0.1', metrics: { mtu: 1400 } };
    vi.mocked(commands.exec).mockClear();
    await setRoutes([]);
    expect(entries.has(prefix)).toBe(true);
    expect(vi.mocked(commands.exec).mock.calls[0]?.[0]).toBe(
      `ip -4 -N -j -details route show table 254 match ${prefix}`
    );
  });

  test.each(['start', 'restart'] as const)(
    'installs site routes before PostUp and preserves routes created by the hook on %s',
    async (mode) => {
      const { store, entries, mutate, wg, setRoutes } = await fixture();
      const manual = '10.8.0.7/32';
      entries.set('10.8.0.0/24', { dev: 'wg0', table: '254', protocol: '2' });
      await store.clients.update(1, { serverAllowedIps: [prefix, manual] });
      const hook = `ip -4 route add ${manual} dev %i # office`;
      await store.hooks.update({ postUp: hook });
      wg.runHook.mockImplementation(async () => {
        expect(entries.get(prefix)?.protocol).toBe('242');
        entries.delete(prefix);
        entries.set(manual, { dev: 'wg0', table: '254', protocol: '3' });
        return '';
      });
      await vpn[mode]();
      expect(wg.runHook).toHaveBeenCalledExactlyOnceWith('wg0', 'auto', hook);
      expect(entries.get(prefix)?.protocol).toBe('242');
      await setRoutes([]);
      expect(mutate.mock.calls).toEqual([
        ['add', prefix, '254'],
        ['add', prefix, '254'],
        ['del', prefix, '254'],
      ]);
      expect(entries.has(manual)).toBe(true);
    }
  );

  test('installs a route immediately when PostUp clears its conflict', async () => {
    const { store, entries, wg } = await fixture();
    const other = '198.51.100.0/24';
    entries.set(prefix, { dev: 'eth0', table: '254', protocol: '4' });
    await store.clients.update(1, { serverAllowedIps: [prefix, other] });
    wg.runHook.mockImplementation(async () => {
      expect(entries.get(other)?.dev).toBe('wg0');
      entries.delete(prefix);
      return '';
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await vpn.start();
    expect(log).not.toHaveBeenCalled();
    expect(entries.get(other)?.dev).toBe('wg0');
    expect(entries.get(prefix)?.protocol).toBe('242');
    expect(wg.runHook).toHaveBeenCalledOnce();
    expect(wg.up).toHaveBeenCalledOnce();
    expect(wg.down).toHaveBeenCalledOnce();
  });

  test('reads each address family once for 200 covered dual-stack peers', async () => {
    const { store, mutate } = await fixture();
    const first = (await store.clients.get(1))!;
    for (let id = 2; id <= 200; id++) {
      await store.clients.insert({
        ...first,
        id,
        publicKey: `peer-${id}`,
        ipv4Address: `10.8.0.${id + 1}`,
        ipv6Address: `fdcc:ad94:bacf:61a4::${id.toString(16)}`,
      });
    }
    await vpn.commit((tx) => tx.interfaces.update({ firewallEnabled: true }));
    const reads = vi
      .mocked(commands.exec)
      .mock.calls.map(([command]) => command)
      .filter((command) => command.includes('route show'));
    expect(reads.filter((command) => command.startsWith('ip -4'))).toHaveLength(
      1
    );
    expect(reads.filter((command) => command.startsWith('ip -6'))).toHaveLength(
      1
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  test.each(['198.51.100.0/24', '2001:db8::/64'])(
    'observes %s being removed while installing a preceding prefix',
    async (other) => {
      const { setRoutes, entries, mutate } = await fixture();
      entries.set(other, { dev: 'wg0', table: '254', protocol: '4' });
      mutate.mockImplementationOnce(() => entries.delete(other));
      await setRoutes([prefix, other]);
      expect(mutate.mock.calls).toEqual([
        ['add', prefix, '254'],
        ['add', other, '254'],
      ]);
    }
  );

  test('updates covering routes within a single reconciliation', async () => {
    const { entries, mutate, setRoutes } = await fixture();
    const child = '192.168.120.0/24';
    await setRoutes([prefix, child]);
    expect([...entries.keys()]).toEqual([prefix]);
    await setRoutes([child]);
    expect([...entries.keys()]).toEqual([child]);
    expect(mutate.mock.calls).toEqual([
      ['add', prefix, '254'],
      ['del', prefix, '254'],
      ['add', child, '254'],
    ]);
  });
});
