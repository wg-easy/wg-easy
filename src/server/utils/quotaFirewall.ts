import childProcess from 'node:child_process';

import { createDebug } from 'obug';

import type { QuotaLimit } from './quota';

const QUOTA_DEBUG = createDebug('Quota');
const TABLE_NAME = 'wg_easy_quota';

type QuotaRule = {
  id: number;
  enabled: boolean;
  limit: QuotaLimit;
  usedRxBytes: number;
  usedTxBytes: number;
  exceededAt: string | null;
};

type QuotaClient = {
  id: number;
  quotaId: number | null;
  ipv4Address: string;
  ipv6Address: string;
};

type Direction = 'rx' | 'tx';

function quotaObjectName(quotaId: number, direction: Direction | 'total') {
  return `q_${quotaId}_${direction}`;
}

function quotaForDirection(quota: QuotaRule, direction: Direction) {
  switch (quota.limit.mode) {
    case 'RX':
      return direction === 'rx'
        ? {
            name: quotaObjectName(quota.id, 'rx'),
            limit: quota.limit.rxBytes,
            used: quota.usedRxBytes,
          }
        : null;
    case 'TX':
      return direction === 'tx'
        ? {
            name: quotaObjectName(quota.id, 'tx'),
            limit: quota.limit.txBytes,
            used: quota.usedTxBytes,
          }
        : null;
    case 'TOTAL':
      return {
        name: quotaObjectName(quota.id, 'total'),
        limit: quota.limit.totalBytes,
        used: quota.usedRxBytes + quota.usedTxBytes,
      };
    case 'SEPARATE':
      return direction === 'rx'
        ? {
            name: quotaObjectName(quota.id, 'rx'),
            limit: quota.limit.rxBytes,
            used: quota.usedRxBytes,
          }
        : {
            name: quotaObjectName(quota.id, 'tx'),
            limit: quota.limit.txBytes,
            used: quota.usedTxBytes,
          };
  }
}

function blockedMatch(quotaId: number) {
  return `numgen inc mod 1 offset ${quotaId} @blocked drop`;
}

function addressMatch(
  interfaceName: string,
  client: QuotaClient,
  direction: Direction,
  version: 4 | 6
) {
  const family = version === 4 ? 'ip' : 'ip6';
  const address = version === 4 ? client.ipv4Address : client.ipv6Address;
  return direction === 'rx'
    ? `iifname "${interfaceName}" ${family} saddr ${address}`
    : `oifname "${interfaceName}" ${family} daddr ${address}`;
}

export function buildQuotaRuleset(
  interfaceName: string,
  quotas: QuotaRule[],
  clients: QuotaClient[],
  enableIpv6: boolean
) {
  const enabledQuotas = quotas.filter((quota) => quota.enabled);
  const enabledQuotasById = new Map(
    enabledQuotas.map((quota) => [quota.id, quota])
  );
  const assignedClients = clients.filter(
    (client) => client.quotaId !== null && enabledQuotasById.has(client.quotaId)
  );
  const objectDefinitions = new Map<string, { limit: number; used: number }>();

  for (const quota of enabledQuotas) {
    for (const direction of ['rx', 'tx'] as const) {
      const object = quotaForDirection(quota, direction);
      if (object) {
        objectDefinitions.set(object.name, {
          limit: object.limit,
          used: object.used,
        });
      }
    }
  }

  const blockedIds = enabledQuotas
    .filter((quota) => quota.exceededAt !== null)
    .map((quota) => quota.id);
  const lines = [`table inet ${TABLE_NAME} {`];
  lines.push(
    `  set blocked { type mark; flags dynamic;${blockedIds.length ? ` elements = { ${blockedIds.join(', ')} };` : ''} }`
  );
  for (const [name, object] of objectDefinitions) {
    lines.push(
      `  quota ${name} { over ${object.limit} bytes used ${object.used} bytes; }`
    );
  }

  for (const direction of ['rx', 'tx'] as const) {
    const hook = direction === 'rx' ? 'prerouting' : 'postrouting';
    lines.push(
      `  chain ${direction} { type filter hook ${hook} priority -10; policy accept;`
    );
    for (const client of assignedClients) {
      const quota = enabledQuotasById.get(client.quotaId!)!;
      const object = quotaForDirection(quota, direction);
      for (const version of enableIpv6 ? ([4, 6] as const) : ([4] as const)) {
        const match = addressMatch(interfaceName, client, direction, version);
        lines.push(`    ${match} ${blockedMatch(quota.id)}`);
        if (object) {
          // Let the crossing packet reach WireGuard so its persisted counter
          // records the exceeded state; the blocked-set rule drops later traffic.
          lines.push(
            `    ${match} quota name "${object.name}" add @blocked { ${quota.id} }`
          );
        }
      }
    }
    lines.push('  }');
  }
  lines.push('}');
  return lines.join('\n');
}

function runNft(args: string[], input?: string) {
  if (process.platform !== 'linux') return Promise.resolve('');
  return new Promise<string>((resolve, reject) => {
    const child = childProcess.execFile(
      'nft',
      args,
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || error.message)));
        } else {
          resolve(String(stdout).trim());
        }
      }
    );
    if (input) child.stdin?.end(input);
  });
}

let nftQuotaAvailable: boolean | null = null;

export const quotaFirewall = {
  get backend() {
    return nftQuotaAvailable === true
      ? ('nftables' as const)
      : ('polling' as const);
  },

  async isAvailable() {
    if (nftQuotaAvailable !== null) return nftQuotaAvailable;
    if (process.platform !== 'linux') {
      nftQuotaAvailable = false;
      return false;
    }
    const probe = `table inet wg_easy_quota_probe {
  set blocked { type mark; flags dynamic; }
  quota q { over 1 bytes; }
  chain rx { type filter hook prerouting priority -10; policy accept;
    quota name "q" add @blocked { 1 } drop
  }
}`;
    try {
      await runNft(['--check', '--file', '-'], probe);
      nftQuotaAvailable = true;
    } catch (error) {
      nftQuotaAvailable = false;
      QUOTA_DEBUG(
        'nftables quota unavailable; using polling enforcement',
        error
      );
    }
    return nftQuotaAvailable;
  },

  async rebuild(ruleset: string) {
    if (!(await this.isAvailable())) return false;
    await runNft(['delete', 'table', 'inet', TABLE_NAME]).catch(() => {});
    try {
      await runNft(['--file', '-'], ruleset);
      return true;
    } catch (error) {
      nftQuotaAvailable = false;
      QUOTA_DEBUG(
        'nftables quota rebuild failed; using polling enforcement',
        error
      );
      await runNft(['delete', 'table', 'inet', TABLE_NAME]).catch(() => {});
      return false;
    }
  },
};
