import { beforeEach, describe, expect, test, vi } from 'vitest';

import { databaseFixture } from '../helpers/database';

import { exec } from '#server/utils/cmd';
import { firewall } from '#server/utils/firewall';
import { typesTestExports } from '#shared/contracts/validation';

vi.mock('#server/utils/cmd', () => ({ exec: vi.fn().mockResolvedValue('') }));

const execMock = vi.mocked(exec);
const client = {
  id: 1,
  name: 'Laptop',
  ipv4Address: '10.8.0.2',
  ipv6Address: 'fd00::2',
  allowedIps: null,
  firewallIps: null,
  enabled: true,
};

beforeEach(() => {
  execMock.mockReset().mockResolvedValue('');
});

describe('firewall chains', () => {
  test.each(['new', 'existing'])(
    '%s filtering stays protected throughout a failed rebuild and its retry',
    async (state) => {
      const { store } = await databaseFixture();
      const network = {
        ...(await store.interfaces.get()),
        firewallEnabled: true,
      };
      const defaults = await store.userConfigs.get();
      const guard = '-i wg0 -m comment --comment "wg-easy rebuild wg0" -j DROP';
      const jump = '-i wg0 -j WG_CLIENTS_wg0';
      const rules = new Map<string, string[]>();
      for (const family of ['iptables', 'ip6tables']) {
        for (const parent of ['INPUT', 'FORWARD'])
          rules.set(`${family}:${parent}`, state === 'existing' ? [jump] : []);
      }
      const complete = new Set<string>();
      const expectProtected = () => {
        for (const [key, entries] of rules) {
          const family = key.split(':')[0]!;
          expect(
            entries[0] === guard ||
              (entries[0] === jump && complete.has(family))
          ).toBe(true);
        }
      };
      let fail = true;
      execMock.mockImplementation(async (command) => {
        const [family, action, chain] = command.split(' ');
        const entries = rules.get(`${family}:${chain}`);
        if (action === '-S' && entries)
          return [
            `-P ${chain} ACCEPT`,
            ...entries.map((rule) => `-A ${chain} ${rule}`),
          ].join('\n');
        const insertion = command.match(/-I \w+ (\d+) (.+)$/);
        if (entries && insertion) {
          const [, position, rule] = insertion;
          if (action === '-I' || !entries.includes(rule!))
            entries.splice(Number(position) - 1, 0, rule!);
          if (action === '-C') expectProtected();
        }
        if (action === '-D' && entries) {
          expect(complete.size).toBe(2);
          const rule = command.split(' ').slice(3).join(' ');
          const index = entries.indexOf(rule);
          expect(index).toBeGreaterThanOrEqual(0);
          entries.splice(index, 1);
          expectProtected();
        }
        if (
          chain === 'WG_CLIENTS_wg0' &&
          (action === '-F' || action === '-A')
        ) {
          if (action === '-F') complete.delete(family!);
          expectProtected();
          if (command.endsWith('-j DROP')) {
            if (fail && family === 'ip6tables')
              throw new Error('Firewall unavailable');
            complete.add(family!);
          }
        }
        return '';
      });
      await expect(
        firewall.rebuildRules(network, [client], defaults, true)
      ).rejects.toThrow('Firewall unavailable');
      for (const entries of rules.values()) expect(entries[0]).toBe(guard);
      fail = false;
      await firewall.rebuildRules(network, [client], defaults, true);
      for (const entries of rules.values()) expect(entries).toEqual([jump]);
    }
  );

  test('scopes chain creation and removal to the requested interface', async () => {
    await firewall.initChain('wg1', false);
    await firewall.flushChain('wg1', false);
    await firewall.removeFiltering('wg1', false);

    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining('iptables -N WG_CLIENTS_wg1')
    );
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining('iptables -D FORWARD -i wg1 -j WG_CLIENTS_wg1')
    );
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining('iptables -X WG_CLIENTS_wg1')
    );
    expect(execMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/(?:-F|-X) WG_CLIENTS\s/)
    );
    expect(execMock).not.toHaveBeenCalledWith(
      expect.stringContaining('ip6tables')
    );
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining('iptables -C INPUT -i wg1 -j WG_CLIENTS_wg1')
    );
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining('iptables -D INPUT -i wg1 -j WG_CLIENTS_wg1')
    );
  });

  test('removes failed-rebuild guards and INPUT filtering when disabled', async () => {
    const { store } = await databaseFixture();
    await firewall.rebuildRules(
      { ...(await store.interfaces.get()), firewallEnabled: false },
      [],
      await store.userConfigs.get(),
      true
    );
    for (const family of ['iptables', 'ip6tables']) {
      for (const parent of ['INPUT', 'FORWARD']) {
        expect(execMock).toHaveBeenCalledWith(
          expect.stringContaining(
            `${family} -D ${parent} -i wg0 -j WG_CLIENTS_wg0`
          )
        );
        expect(execMock).toHaveBeenCalledWith(
          expect.stringContaining(
            `${family} -D ${parent} -i wg0 -m comment --comment "wg-easy rebuild wg0" -j DROP`
          )
        );
      }
    }
  });

  test('waits for each concurrent rebuild and applies its own snapshot', async () => {
    const { store } = await databaseFixture();
    const network = {
      ...(await store.interfaces.get()),
      firewallEnabled: true,
    };
    const defaults = await store.userConfigs.get();
    const gate = Promise.withResolvers<string>();
    const entered = Promise.withResolvers<undefined>();
    execMock.mockImplementationOnce(() => {
      entered.resolve(undefined);
      return gate.promise;
    });
    const first = firewall.rebuildRules(
      network,
      [{ ...client, firewallIps: ['192.0.2.1'] }],
      defaults,
      false
    );
    await entered.promise;
    let complete = false;
    const second = firewall
      .rebuildRules(
        network,
        [{ ...client, firewallIps: ['192.0.2.2'] }],
        defaults,
        false
      )
      .then(() => {
        complete = true;
      });
    expect(complete).toBe(false);
    gate.resolve('');
    await Promise.all([first, second]);
    const destinations = execMock.mock.calls
      .filter(([command]) => command.includes(' -d '))
      .map(([command]) => command);
    expect(destinations).toHaveLength(2);
    expect(destinations[0]).toContain(' -d 192.0.2.1 ');
    expect(destinations[1]).toContain(' -d 192.0.2.2 ');
  });
});

describe('firewall entries', () => {
  test.each([
    ['10.0.0.1', 'iptables', '10.8.0.2', '10.0.0.1', ['']],
    [
      '10.0.0.1:443/TCP',
      'iptables',
      '10.8.0.2',
      '10.0.0.1',
      [' -p tcp --dport 443'],
    ],
    [
      '[2001:db8::1]:53/UDP',
      'ip6tables',
      'fd00::2',
      '2001:db8::1',
      [' -p udp --dport 53'],
    ],
    [
      '10.0.0.0/24:443/tcp',
      'iptables',
      '10.8.0.2',
      '10.0.0.0/24',
      [' -p tcp --dport 443'],
    ],
    [
      '10.0.0.1:53/udp',
      'iptables',
      '10.8.0.2',
      '10.0.0.1',
      [' -p udp --dport 53'],
    ],
    [
      '10.0.0.1:443',
      'iptables',
      '10.8.0.2',
      '10.0.0.1',
      [' -p tcp --dport 443', ' -p udp --dport 443'],
    ],
    ['2001:db8::1', 'ip6tables', 'fd00::2', '2001:db8::1', ['']],
    ['[2001:db8::1]', 'ip6tables', 'fd00::2', '2001:db8::1', ['']],
    ['::/0', 'ip6tables', 'fd00::2', '::/0', ['']],
    [
      '[2001:db8::/32]:443/tcp',
      'ip6tables',
      'fd00::2',
      '2001:db8::/32',
      [' -p tcp --dport 443'],
    ],
    [
      '[2001:db8::1]:443',
      'ip6tables',
      'fd00::2',
      '2001:db8::1',
      [' -p tcp --dport 443', ' -p udp --dport 443'],
    ],
  ] as const)(
    'accepts %s and allows only its destination and protocols',
    async (entry, command, source, destination, protocols) => {
      expect(typesTestExports.FirewallIpEntrySchema.parse(entry)).toBe(entry);
      await firewall.applyClientRules(
        'wg0',
        { ...client, firewallIps: [entry] },
        [],
        true
      );
      expect(execMock.mock.calls.map(([command]) => command)).toEqual(
        protocols.map(
          (protocol) =>
            `${command} -A WG_CLIENTS_wg0 -s ${source} -d ${destination}${protocol} -m comment --comment "client 1: Laptop" -j ACCEPT`
        )
      );
    }
  );

  test.each([
    '',
    '1.1.1.256',
    '2001:dbx::1',
    '[]:443',
    '[::1]/32',
    '1.1.1.1:80/tcpp',
    '1.1.1.1:65536',
    '1.1.1.1:0',
    '1.1.1.1/33',
    '1.1.1.1/tcp',
    '[2001:db8::1]/udp',
    '2001:db8::1:443/tcp',
  ])('rejects invalid destinations, ports, and protocols: %s', (entry) => {
    expect(
      typesTestExports.FirewallIpEntrySchema.safeParse(entry).success
    ).toBe(false);
  });

  test('uses firewall destinations before allowed IPs and interface defaults', async () => {
    const cases = [
      {
        firewallIps: ['10.1.0.0/16'],
        allowedIps: ['10.2.0.0/16'],
        destination: '10.1.0.0/16',
      },
      {
        firewallIps: [],
        allowedIps: ['10.2.0.0/16'],
        destination: '10.2.0.0/16',
      },
      { firewallIps: null, allowedIps: null, destination: '10.3.0.0/16' },
    ];
    for (const { destination, ...overrides } of cases) {
      execMock.mockClear();
      await firewall.applyClientRules(
        'wg0',
        { ...client, ...overrides },
        ['10.3.0.0/16'],
        false
      );
      expect(execMock).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining(`-d ${destination} `)
      );
    }
  });

  test('omits IPv6 destinations when IPv6 is disabled', async () => {
    await firewall.applyClientRules('wg0', client, ['::/0'], false);
    expect(execMock).not.toHaveBeenCalled();
  });

  test('keeps client comments identifiable, shell-safe, and within 256 bytes', async () => {
    const name = 'café-2.lan_home$(cmd)`id`";/' + 'a'.repeat(300);
    await firewall.applyClientRules(
      'wg0',
      { ...client, name },
      ['10.0.0.1'],
      false
    );
    const comment =
      execMock.mock.calls[0]![0].match(/--comment "([^"]+)"/)![1]!;
    expect(comment).toMatch(/^client 1: caf-2\.lan_homecmdid/);
    expect(comment).toMatch(/^[a-zA-Z0-9 :_.-]+$/);
    expect(Buffer.byteLength(comment)).toBeLessThanOrEqual(256);
  });
});
