import { describe, expect, test, vi } from 'vitest';
import { containsCidr } from 'cidr-tools';

import { vpnFixture } from '../helpers/vpn';

import * as vpn from '#server/features/vpn/lifecycle';
import * as commands from '#server/utils/cmd';

const prefix = '192.168.120.0/22';

async function fixture() {
  const { store, commands: wg } = await vpnFixture();
  const entries = new Map<
    string,
    { dev: string; protocol: string; table: string }
  >();
  const mutate = vi.fn();
  vi.spyOn(commands, 'exec').mockImplementation(async (command) => {
    const args = command.split(' ');
    if (args.includes('show')) {
      return JSON.stringify(
        [...entries]
          .filter(([dst]) => containsCidr(dst, args.at(-1)!))
          .map(([dst, entry]) => ({
            ...entry,
            dst,
            type: '1',
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
  test('leaves a covering connected route alone, including when the client is deleted', async () => {
    const { setRoutes, entries, mutate, store } = await fixture();
    entries.set('10.8.0.0/24', { dev: 'wg0', table: '254', protocol: '2' });
    await setRoutes(['10.8.0.7/32']);
    await vpn.commit((tx) => tx.clients.deleteMany([1]));
    expect(await store.clients.get(1)).toBeUndefined();
    expect(mutate).not.toHaveBeenCalled();
  });
  test('shares canonical prefixes across enabled clients and withdraws them on expiry', async () => {
    const { store, entries, mutate, setRoutes } = await fixture();
    await store.clients.insert({
      ...(await store.clients.get(1))!,
      id: 2,
      publicKey: 'other',
      ipv4Address: '10.8.0.3',
      ipv6Address: 'fd00::3',
    });
    await setRoutes(['192.168.120.1/22', '0.0.0.0/0', '::/0']);
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
    expect(mutate.mock.calls).toEqual([
      ['add', '2001:db8::/64', '100'],
      ['del', '2001:db8::/64', '100'],
    ]);
  });

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

  test.each(['start', 'restart'] as const)(
    'withdraws only routes installed by wg-quick on %s',
    async (mode) => {
      const { store, entries, mutate, wg, setRoutes } = await fixture();
      const manual = '192.0.2.0/24';
      await store.clients.update(1, { serverAllowedIps: [prefix, manual] });
      const hook = `ip -4 route add ${manual} dev %i`;
      await store.hooks.update({ postUp: hook });
      for (const dst of [manual, prefix]) {
        entries.set(dst, { dev: 'wg0', table: '254', protocol: '3' });
      }
      wg[mode === 'start' ? 'up' : 'restart'].mockResolvedValue(
        [
          '[#] ip link set mtu 1420 up dev wg0',
          `[#] ip -4 route add ${prefix} dev wg0`,
          '[#] ' + hook.replace('%i', 'wg0'),
        ].join('\n')
      );
      await vpn[mode]();
      await setRoutes([]);
      expect(mutate.mock.calls).toEqual([['del', prefix, '254']]);
      expect(entries.has(manual)).toBe(true);
    }
  );
});
