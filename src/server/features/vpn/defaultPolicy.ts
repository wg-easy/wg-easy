import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { parseCidr } from 'cidr-tools';
import { createError } from 'nuxt/server';

import {
  preferredRoute,
  routeMetric,
  kernelTable,
  routeProtocol,
  type KernelRoute,
  type RouteFamily,
} from './linuxRouting';
import type { ServerPeer } from './configuration';
import {
  saveTunnelRecord,
  type PolicyRule,
  type TunnelRecord,
} from './tunnelRecord';

import { parseRoutingTableId } from '#shared/utils/routingTable';
import type { InterfaceType } from '#db/repositories/interface/types';
import { exec } from '#server/utils/cmd';
import { WG_ENV } from '#server/utils/config';
import { getGatewayAddress } from '#server/utils/ip';

const run = promisify(execFile);
const families = ['ipv4', 'ipv6'] as const;
class DefaultRouteConflict extends Error {}

export type DefaultRouteTables = Partial<Record<RouteFamily, number | 'auto'>>;

export function defaultRouteTables(
  setting: string,
  clients: ServerPeer[],
  enableIpv6: boolean
): DefaultRouteTables {
  const tables: DefaultRouteTables = {};
  const table = setting === 'auto' ? 'auto' : parseRoutingTableId(setting);
  if (table === undefined) {
    return tables;
  }
  for (const peer of clients) {
    if (!peer.enabled) {
      continue;
    }
    for (const prefix of peer.serverAllowedIps ?? []) {
      if (/\/0+$/.test(prefix)) {
        const family = prefix.includes(':') ? 'ipv6' : 'ipv4';
        if (enableIpv6 || family === 'ipv4') {
          tables[family] = table || 254;
        }
      }
    }
  }
  return tables;
}

type Rule = Record<string, unknown> & {
  priority: number;
  table?: string | number;
};
const flag = (family: RouteFamily) => (family === 'ipv4' ? '-4' : '-6');

async function inspect<T>(
  family: RouteFamily,
  ...args: string[]
): Promise<T[]> {
  const { stdout } = await run('ip', [flag(family), '-N', '-j', '-d', ...args]);
  return JSON.parse(stdout);
}

function matchesRule(
  rule: Rule,
  item: Extract<PolicyRule, { priority: number }>
) {
  if (
    rule.priority !== item.priority ||
    Number(rule.protocol) !== routeProtocol ||
    rule.src !== 'all'
  ) {
    return false;
  }
  const fields = ['priority', 'src', 'protocol', 'table'];
  if (item.kind === 'suppress') {
    return (
      kernelTable(rule.table) === 254 &&
      rule.suppress_prefixlen === 0 &&
      Object.keys(rule).every((key) =>
        [...fields, 'suppress_prefixlen'].includes(key)
      )
    );
  }
  return (
    kernelTable(rule.table) === item.table &&
    Object.hasOwn(rule, 'not') &&
    Number(rule.fwmark) === item.mark &&
    Object.keys(rule).every((key) => [...fields, 'fwmark', 'not'].includes(key))
  );
}

function availableMark(preferred: number, rules: Rule[]) {
  // Zero disables the socket mark. A masked RPDB selector can reserve many
  // more marks than its literal value, including an entire half of the range.
  const excluded = [{ value: 0, mask: 0xffffffff }];
  let initial = preferred;
  let fixed = 0;
  const conflict = () =>
    new DefaultRouteConflict(
      'No firewall mark is available for automatic routing.'
    );
  for (const rule of rules) {
    if (rule.fwmark === undefined) {
      continue;
    }
    const value = Number(rule.fwmark);
    const mask = Number(rule.fwmask ?? 0xffffffff);
    if (Object.hasOwn(rule, 'not')) {
      // To avoid an inverted mark selector its masked bits must match.
      if (((initial ^ value) & fixed & mask) !== 0) {
        throw conflict();
      }
      initial = (initial & ~mask) | (value & mask);
      fixed |= mask;
    } else {
      excluded.push({ value, mask });
    }
  }

  function choose(candidate: number, fixedBits: number): number | undefined {
    const match = excluded.find(
      ({ value, mask }) => ((candidate ^ value) & mask) === 0
    );
    if (!match) {
      return candidate >>> 0;
    }
    // A free mark must differ on a masked bit. Try both values of one
    // adjustable bit, fixing it so each recursive step makes progress.
    const adjustable = match.mask & ~fixedBits;
    if (adjustable) {
      const bit = adjustable & -adjustable;
      const fixed = fixedBits | bit;
      return choose(candidate ^ bit, fixed) ?? choose(candidate, fixed);
    }
  }
  const mark = choose(initial, fixed);
  if (mark === undefined) {
    throw conflict();
  }
  return mark;
}

function suppressPriority(rules: Rule[]) {
  const main = rules.find(
    (rule) =>
      kernelTable(rule.table) === 254 &&
      rule.src === 'all' &&
      Object.keys(rule).every((key) =>
        ['priority', 'table', 'src', 'protocol'].includes(key)
      )
  );
  // An earlier pair would put the tunnel ahead of the intervening host policy.
  const first = (main?.priority ?? 0) - 2;
  if (
    first <= 0 ||
    rules.some((rule) => rule.priority === first || rule.priority === first + 1)
  ) {
    throw new DefaultRouteConflict(
      'No available routing rule priorities between host policy and the main table.'
    );
  }
  return first;
}

function runFirewallRule(
  { name, policy }: TunnelRecord,
  family: RouteFamily,
  rule: Extract<PolicyRule, { kind: 'listener' | 'protect' }>,
  action: '-I' | '-C' | '-D'
) {
  const command = family === 'ipv4' ? 'iptables' : 'ip6tables';
  const ingress = [action, 'PREROUTING', '!', '-i', name];
  const comment = ['-m', 'comment', '--comment', policy.tag];
  if (rule.kind === 'protect') {
    const external = [
      '-d',
      rule.address,
      '-m',
      'addrtype',
      '!',
      '--src-type',
      'LOCAL',
    ];
    return run(command, [
      '-w',
      '2',
      '-t',
      'raw',
      ...ingress,
      ...external,
      ...comment,
      '-j',
      'DROP',
    ]);
  }
  // Mark fresh handshakes for strict rp_filter without overwriting a host mark.
  const listener = ['-p', 'udp', '--dport', String(rule.port)];
  const local = ['-m', 'addrtype', '--dst-type', 'LOCAL'];
  const unmarked = ['-m', 'mark', '--mark', '0'];
  const setMark = ['-j', 'MARK', '--set-mark', String(rule.mark)];
  return run(command, [
    '-w',
    '2',
    '-t',
    'mangle',
    ...ingress,
    ...listener,
    ...local,
    ...unmarked,
    ...comment,
    ...setMark,
  ]);
}

function missingTable(error: unknown) {
  return /FIB table does not exist/.test(
    (error as { stderr?: string }).stderr ?? ''
  );
}

async function installRoute(name: string, family: RouteFamily, table: number) {
  const routes = await inspect<KernelRoute>(
    family,
    'route',
    'show',
    'table',
    String(table),
    'exact',
    'default'
  ).catch((error) => {
    if (missingTable(error)) {
      return [];
    }
    throw error;
  });
  const preferred = preferredRoute(
    routes.filter((route) => route.dst === 'default' && !route.from),
    name
  );
  if (preferred.viaTunnel) {
    return;
  }
  if (preferred.metric <= routeMetric(family)) {
    throw new DefaultRouteConflict(
      'An existing route conflicts with this default.'
    );
  }
  // Linux removes routes bound to this link when the interface is deleted.
  await run('ip', [
    flag(family),
    'route',
    'add',
    'default',
    'dev',
    name,
    'table',
    String(table),
    'proto',
    String(routeProtocol),
    'metric',
    String(routeMetric(family)),
  ]);
}

function changeRule(
  record: TunnelRecord,
  family: RouteFamily,
  rule: PolicyRule,
  action: 'add' | 'del'
) {
  if (!('priority' in rule)) {
    return runFirewallRule(
      record,
      family,
      rule,
      action === 'add' ? '-I' : '-D'
    );
  }
  const selector =
    rule.kind === 'lookup'
      ? ['not', 'fwmark', String(rule.mark), 'table', String(rule.table)]
      : ['table', 'main', 'suppress_prefixlength', '0'];
  return run('ip', [
    flag(family),
    'rule',
    action,
    'pref',
    String(rule.priority),
    ...selector,
    'protocol',
    String(routeProtocol),
  ]);
}

async function rulesAt(family: RouteFamily, priority: number) {
  const rules = await inspect<Rule>(family, 'rule', 'show');
  return rules.filter((rule) => rule.priority === priority);
}

async function ruleStillOwned(
  record: TunnelRecord,
  family: RouteFamily,
  item: PolicyRule
) {
  if ('priority' in item) {
    const candidates = (await rulesAt(family, item.priority)).filter(
      (rule) => Number(rule.protocol) === routeProtocol
    );
    if (!candidates.some((rule) => matchesRule(rule, item))) {
      return false;
    }
    // The deletion selector can also match a more specific rule at this priority.
    if (candidates.length > 1) {
      throw new Error('Ambiguous routing rule priority ' + item.priority);
    }
    return true;
  }
  try {
    await runFirewallRule(record, family, item, '-C');
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 1) {
      return false;
    }
    throw error;
  }
}

async function tableHasRoutes(family: RouteFamily, table: number) {
  try {
    const size = await exec(
      `set -o pipefail; ip ${flag(family)} route show table ${table} | wc -c`
    );
    return Number(size) > 0;
  } catch (error) {
    if (missingTable(error)) {
      return false;
    }
    throw error;
  }
}

async function automaticIds(name: string) {
  const used = new Set([0, 253, 254, 255]);
  const rules: Rule[] = [];
  const supported: RouteFamily[] = [];
  for (const family of families) {
    let familyRules;
    try {
      familyRules = await inspect<Rule>(family, 'rule', 'show');
    } catch (error) {
      const { stderr } = error as { stderr?: string };
      if (
        family === 'ipv6' &&
        WG_ENV.DISABLE_IPV6 &&
        /address family not supported|operation not supported/i.test(
          stderr ?? ''
        )
      ) {
        continue;
      }
      throw error;
    }
    supported.push(family);
    for (const rule of familyRules) {
      rules.push(rule);
      used.add(kernelTable(rule.table));
    }
  }
  const backend = WG_ENV.WG_EXECUTABLE;
  const { stdout } = await run(backend, ['show', name, 'fwmark']);
  const current = stdout.trim() === 'off' ? 0 : Number(stdout.trim());
  let table = current || 51820;
  while (
    used.has(table) ||
    (
      await Promise.all(
        supported.map((family) => tableHasRoutes(family, table))
      )
    ).some(Boolean)
  ) {
    table = table === 0xffffffff ? 1 : table + 1;
  }
  const mark = current || availableMark(table, rules);
  if (!current) {
    await run(backend, ['set', name, 'fwmark', String(mark)]);
  }
  return { table, mark };
}

/** Claim a rule before installing it so an interrupted start can be cleaned up. */
async function installRule(
  record: TunnelRecord,
  family: RouteFamily,
  rule: PolicyRule
) {
  if ('priority' in rule && (await rulesAt(family, rule.priority)).length) {
    throw new DefaultRouteConflict(
      `Routing rule priority ${rule.priority} is occupied.`
    );
  }
  const owned = record.policy.owned[family];
  owned.push(rule);
  try {
    await saveTunnelRecord(record);
    await changeRule(record, family, rule, 'add');
  } catch (error) {
    owned.pop();
    await saveTunnelRecord(record);
    throw error;
  }
}

export async function installDefaultRoutes(
  record: TunnelRecord,
  network: InterfaceType,
  tables: DefaultRouteTables
) {
  const { name } = network;
  let auto;
  for (const family of families) {
    let table = tables[family];
    if (table === undefined) {
      continue;
    }
    try {
      if (table !== 'auto') {
        await installRoute(name, family, table);
        continue;
      }
      const priority = suppressPriority(
        await inspect<Rule>(family, 'rule', 'show')
      );
      auto ??= await automaticIds(name);
      table = auto.table;
      await installRoute(name, family, auto.table);
      const address = getGatewayAddress(parseCidr(network[`${family}Cidr`]));
      await installRule(record, family, { kind: 'protect', address });
      if (family === 'ipv4') {
        const { stdout } = await run('sysctl', [
          '-n',
          'net.ipv4.conf.all.src_valid_mark',
        ]);
        if (stdout.trim() !== '1') {
          await run('sysctl', ['-q', 'net.ipv4.conf.all.src_valid_mark=1']);
        }
        await installRule(record, family, {
          kind: 'listener',
          port: network.port,
          mark: auto.mark,
        });
      }
      await installRule(record, family, { kind: 'suppress', priority });
      await installRule(record, family, {
        kind: 'lookup',
        priority: priority + 1,
        ...auto,
      });
    } catch (cause) {
      const prefix = family === 'ipv4' ? '0.0.0.0/0' : '::/0';
      return createError({
        status: cause instanceof DefaultRouteConflict ? 409 : 500,
        statusText: 'Default route setup failed',
        message: `Could not start ${name} with ${prefix} in table ${table}. ${cause instanceof DefaultRouteConflict ? cause.message + ' ' : ''}Maintenance will retry.`,
        cause,
      });
    }
  }
}

export async function removeDefaultRules(record: TunnelRecord) {
  for (const family of families) {
    const owned = record.policy.owned[family];
    for (const rule of [...owned].reverse()) {
      if (await ruleStillOwned(record, family, rule)) {
        await changeRule(record, family, rule, 'del');
      }
      owned.pop();
      await saveTunnelRecord(record);
    }
  }
}
