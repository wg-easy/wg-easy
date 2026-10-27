import { beforeEach, describe, expect, test, vi } from 'vitest';

import { exec } from '#server/utils/cmd';
import { firewall } from '#server/utils/firewall';
import { typesTestExports } from '#server/utils/types';

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
  execMock.mockClear();
});

describe('firewall chains', () => {
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
  });
});

describe('firewall entries', () => {
  test.each([
    ['10.0.0.1', 'iptables', '10.8.0.2', '10.0.0.1', ['']],
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
