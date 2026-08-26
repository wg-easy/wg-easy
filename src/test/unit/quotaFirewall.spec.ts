import { afterEach, describe, expect, test, vi } from 'vitest';

import { buildQuotaRuleset } from '#server/utils/quotaFirewall';

const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }));

vi.mock('node:child_process', () => ({
  default: { execFile: execFileMock },
}));

afterEach(() => {
  vi.restoreAllMocks();
  execFileMock.mockReset();
});

const clients = [
  {
    id: 1,
    quotaId: 7,
    ipv4Address: '10.8.0.2',
    ipv6Address: 'fd00::2',
  },
  {
    id: 2,
    quotaId: 7,
    ipv4Address: '10.8.0.3',
    ipv6Address: 'fd00::3',
  },
];

describe('quota nftables rules', () => {
  test('shares a total quota and blocked marker across clients and directions', () => {
    const rules = buildQuotaRuleset(
      'wg0',
      [
        {
          id: 7,
          enabled: true,
          limit: { mode: 'TOTAL', totalBytes: 1000 },
          usedRxBytes: 200,
          usedTxBytes: 300,
          exceededAt: null,
        },
      ],
      clients,
      true
    );

    expect(rules).toContain(
      'quota q_7_total { over 1000 bytes used 500 bytes; }'
    );
    expect(rules.match(/quota name "q_7_total"/g)).toHaveLength(8);
    expect(rules).toContain('add @blocked { 7 } drop');
    expect(rules).toContain('ip saddr 10.8.0.2');
    expect(rules).toContain('ip6 daddr fd00::3');
  });

  test('uses separate directional quota objects with one blocked marker', () => {
    const rules = buildQuotaRuleset(
      'wg0',
      [
        {
          id: 7,
          enabled: true,
          limit: { mode: 'SEPARATE', rxBytes: 100, txBytes: 200 },
          usedRxBytes: 10,
          usedTxBytes: 20,
          exceededAt: null,
        },
      ],
      clients.slice(0, 1),
      false
    );

    expect(rules).toContain('quota q_7_rx { over 100 bytes used 10 bytes; }');
    expect(rules).toContain('quota q_7_tx { over 200 bytes used 20 bytes; }');
    expect(rules).not.toContain('ip6 ');
  });

  test('does not enforce disabled quotas', () => {
    const rules = buildQuotaRuleset(
      'wg0',
      [
        {
          id: 7,
          enabled: false,
          limit: { mode: 'RX', rxBytes: 100 },
          usedRxBytes: 100,
          usedTxBytes: 0,
          exceededAt: '2026-08-26T00:00:00.000Z',
        },
      ],
      clients,
      true
    );

    expect(rules).not.toContain('q_7');
    expect(rules).not.toContain('10.8.0.2');
  });
});

describe('quota nftables fallback', () => {
  test('switches to polling when rebuilding nftables rules fails', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    execFileMock.mockImplementation(
      (
        _command: string,
        args: string[],
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        if (args[0] === '--file') {
          callback(new Error('rebuild failed'), '', 'rebuild failed');
        } else {
          callback(null, '', '');
        }
        return { stdin: { end: vi.fn() } };
      }
    );
    vi.resetModules();
    const { quotaFirewall } = await import('#server/utils/quotaFirewall');

    await expect(quotaFirewall.rebuild('invalid rules')).resolves.toBe(false);
    expect(quotaFirewall.backend).toBe('polling');
  });
});
