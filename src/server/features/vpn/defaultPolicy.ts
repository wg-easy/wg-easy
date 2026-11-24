import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual, promisify } from 'node:util';

import { createError } from 'nuxt/server';

import {
  kernelTable,
  routeProtocol,
  routingTable,
  type KernelRoute,
} from './linuxRouting';
import { tunnelAddresses } from './configuration';

import type { InterfaceType } from '#db/repositories/interface/types';
import { WG_ENV } from '#server/utils/config';

const run = promisify(execFile);
const families = ['ipv4', 'ipv6'] as const;
class DefaultRouteConflict extends Error {}

type Family = (typeof families)[number];
type Defaults = Partial<Record<Family, string>>;
type Item =
  | { kind: 'route'; table: number }
  | { kind: 'suppress'; priority: number }
  | { kind: 'lookup'; priority: number; table: number; mark: number }
  | { kind: 'listener'; port: number; mark: number }
  | { kind: 'protect'; address: string };

export type DefaultPolicyState = {
  tag: string;
  assignedMark?: number;
  owned: Record<Family, Item[]>;
};

type Rule = Record<string, unknown> & {
  priority: number;
  table?: string | number;
};
const metric = (family: Family) => (family === 'ipv4' ? 0 : 1024);
const flag = (family: Family) => (family === 'ipv4' ? '-4' : '-6');

async function inspect<T>(family: Family, ...args: string[]): Promise<T[]> {
  const { stdout } = await run('ip', [flag(family), '-N', '-j', '-d', ...args]);
  return JSON.parse(stdout);
}

function matchesRule(rule: Rule, item: Extract<Item, { priority: number }>) {
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

function priorities(rules: Rule[], owned: Item[], table: number, mark: number) {
  // Let host rules before the ordinary main lookup retain their precedence.
  const main = rules.find(
    (rule) =>
      kernelTable(rule.table) === 254 &&
      rule.src === 'all' &&
      Object.keys(rule).every((key) =>
        ['priority', 'table', 'src', 'protocol'].includes(key)
      )
  );
  const previous = owned.find((item) => item.kind === 'suppress');
  const usable = (priority: number) => {
    const occupants = rules.filter((rule) => rule.priority === priority);
    return (
      !occupants.length ||
      (occupants.length === 1 &&
        owned.some(
          (item) => 'priority' in item && matchesRule(occupants[0]!, item)
        ))
    );
  };
  const ceiling = main?.priority ?? 32766;
  if (
    previous &&
    owned.some(
      (item) =>
        item.kind === 'lookup' && item.table === table && item.mark === mark
    ) &&
    previous.priority + 1 < ceiling &&
    usable(previous.priority) &&
    usable(previous.priority + 1)
  ) {
    return previous.priority;
  }
  const occupied = new Set(rules.map((rule) => rule.priority));
  for (let p = ceiling - 2; p > 0; p--) {
    if (!occupied.has(p) && !occupied.has(p + 1)) {
      return p;
    }
  }
  throw new Error('No available routing rule priorities');
}

function firewallArgs(
  item: Extract<Item, { kind: 'listener' | 'protect' }>,
  name: string,
  tag: string,
  action: string
) {
  const common = ['-m', 'comment', '--comment', tag];
  if (item.kind === 'protect') {
    return [
      '-w',
      '-t',
      'raw',
      action,
      'PREROUTING',
      '!',
      '-i',
      name,
      '-d',
      item.address,
      '-m',
      'addrtype',
      '!',
      '--src-type',
      'LOCAL',
      ...common,
      '-j',
      'DROP',
    ];
  }
  // With strict rp_filter a new handshake must reach the listener even before
  // there is a marked conntrack reply. Preserve marks set by host policy.
  return [
    '-w',
    '-t',
    'mangle',
    action,
    'PREROUTING',
    '!',
    '-i',
    name,
    '-p',
    'udp',
    '--dport',
    String(item.port),
    '-m',
    'addrtype',
    '--dst-type',
    'LOCAL',
    '-m',
    'mark',
    '--mark',
    '0',
    ...common,
    '-j',
    'MARK',
    '--set-mark',
    String(item.mark),
  ];
}

/** A serializable journal of this interface's policy, including partial updates.
 * The lifecycle owns the instance identity and supplies durable persistence. */
export class DefaultPolicy {
  constructor(
    readonly state: DefaultPolicyState = {
      tag: 'wg-easy-' + randomUUID(),
      owned: { ipv4: [], ipv6: [] },
    },
    private readonly persist: (
      state: DefaultPolicyState
    ) => Promise<void> = async () => {}
  ) {}

  private async freeTable(preferred: number) {
    const used = new Set([0, 253, 254, 255]);
    for (const family of families) {
      const routes = await inspect<KernelRoute>(
        family,
        'route',
        'show',
        'table',
        'all'
      );
      const rules = await inspect<Rule>(family, 'rule', 'show');
      for (const entry of [...routes, ...rules]) {
        used.add(kernelTable(entry.table));
      }
    }
    let candidate = preferred;
    while (used.has(candidate)) {
      candidate = candidate === 0xffffffff ? 1 : candidate + 1;
    }
    return candidate;
  }

  private async automatic(name: string) {
    const backend = WG_ENV.WG_EXECUTABLE;
    const { stdout } = await run(backend, ['show', name, 'fwmark']);
    const current = stdout.trim() === 'off' ? 0 : Number(stdout.trim());
    if (this.state.assignedMark && this.state.assignedMark !== current) {
      delete this.state.assignedMark;
      await this.persist(this.state);
    }
    const previous = families
      .flatMap((f) => this.state.owned[f])
      .find((item) => item.kind === 'lookup');
    const table = previous?.table ?? (await this.freeTable(current || 51820));
    const mark = current || table;
    if (!current) {
      this.state.assignedMark = mark;
      await this.persist(this.state);
      await run(backend, ['set', name, 'fwmark', String(mark)]);
    }
    return { table, mark };
  }

  private async clearMark(name: string) {
    const mark = this.state.assignedMark;
    if (
      !mark ||
      families.some((f) =>
        this.state.owned[f].some(
          (item) => item.kind === 'lookup' || item.kind === 'listener'
        )
      )
    ) {
      return;
    }
    const backend = WG_ENV.WG_EXECUTABLE;
    const { stdout } = await run(backend, ['show', name, 'fwmark']);
    if (Number(stdout.trim()) === mark) {
      await run(backend, ['set', name, 'fwmark', '0']);
    }
    delete this.state.assignedMark;
    await this.persist(this.state);
  }

  private async desired(
    network: InterfaceType,
    family: Family,
    setting: string | undefined,
    auto?: { table: number; mark: number }
  ): Promise<Item[]> {
    if (!setting) {
      return [];
    }
    if (setting !== 'auto') {
      return [{ kind: 'route', table: routingTable(setting) }];
    }
    if (!auto) {
      throw new Error('No automatic routing table available');
    }
    const { table, mark } = auto;
    const priority = priorities(
      await inspect<Rule>(family, 'rule', 'show'),
      this.state.owned[family],
      table,
      mark
    );
    const address = tunnelAddresses(network, family === 'ipv6')[
      family === 'ipv4' ? 0 : 1
    ]!.split('/')[0]!;
    const items: Item[] = [
      { kind: 'route', table },
      { kind: 'protect', address },
    ];
    if (family === 'ipv4') {
      const { stdout } = await run('sysctl', [
        '-n',
        'net.ipv4.conf.all.src_valid_mark',
      ]);
      if (stdout.trim() !== '1') {
        await run('sysctl', ['-q', 'net.ipv4.conf.all.src_valid_mark=1']);
      }
      items.push({ kind: 'listener', port: network.port, mark });
    }
    items.push(
      { kind: 'suppress', priority },
      { kind: 'lookup', priority: priority + 1, table, mark }
    );
    return items;
  }

  private async reconcile(
    name: string,
    family: Family,
    item: Item,
    add: boolean
  ) {
    const owned = this.state.owned[family];
    const index = owned.findIndex((candidate) =>
      isDeepStrictEqual(candidate, item)
    );
    const recorded = index >= 0;
    const ip = [flag(family)];
    let command = 'ip';
    let args: string[];
    let installed: boolean;
    let satisfied: boolean;
    if (item.kind === 'route') {
      const entries = (
        await inspect<KernelRoute>(
          family,
          'route',
          'show',
          'table',
          'all',
          'exact',
          'default'
        )
      ).filter(
        (entry) =>
          kernelTable(entry.table) === item.table && entry.dst === 'default'
      );
      const direct = (r: KernelRoute) =>
        r.dev === name &&
        !r.gateway &&
        (r.type === undefined || Number(r.type) === 1 || r.type === 'unicast');
      const rank = Math.min(...entries.map((r) => r.metric ?? 0));
      const preferred = entries.filter((r) => (r.metric ?? 0) === rank);
      installed = entries.some(
        (r) =>
          direct(r) &&
          Number(r.protocol) === routeProtocol &&
          (r.metric ?? 0) === metric(family) &&
          Number(r.scope) === (family === 'ipv4' ? 253 : 0) &&
          !r.flags?.length &&
          (r.pref === undefined || r.pref === 'medium') &&
          Object.keys(r).every((key) =>
            [
              'dst',
              'dev',
              'table',
              'protocol',
              'metric',
              'scope',
              'flags',
              'type',
              'pref',
            ].includes(key)
          )
      );
      satisfied = preferred.length > 0 && preferred.every(direct);
      if (add && !satisfied && rank <= metric(family)) {
        throw new DefaultRouteConflict('An existing default route conflicts');
      }
      args = [
        ...ip,
        'route',
        add ? 'add' : 'del',
        'default',
        'dev',
        name,
        'table',
        String(item.table),
        'proto',
        String(routeProtocol),
        'metric',
        String(metric(family)),
      ];
    } else if (item.kind === 'suppress' || item.kind === 'lookup') {
      const slot = (await inspect<Rule>(family, 'rule', 'show')).filter(
        (r) =>
          r.priority === item.priority && Number(r.protocol) === routeProtocol
      );
      installed = slot.some((r) => matchesRule(r, item));
      if (slot.length > 1 && installed) {
        throw new Error('Ambiguous routing rule priority ' + item.priority);
      }
      satisfied = installed;
      const selector =
        item.kind === 'lookup'
          ? ['not', 'fwmark', String(item.mark), 'table', String(item.table)]
          : ['table', 'main', 'suppress_prefixlength', '0'];
      args = [
        ...ip,
        'rule',
        add ? 'add' : 'del',
        'pref',
        String(item.priority),
        ...selector,
        'protocol',
        String(routeProtocol),
      ];
    } else {
      command = family === 'ipv4' ? 'iptables' : 'ip6tables';
      try {
        await run(command, firewallArgs(item, name, this.state.tag, '-C'));
        installed = true;
      } catch (error) {
        if ((error as { code?: number }).code !== 1) {
          throw error;
        }
        installed = false;
      }
      satisfied = installed;
      args = firewallArgs(item, name, this.state.tag, add ? '-I' : '-D');
    }
    if (recorded && !installed) {
      owned.splice(index, 1);
      await this.persist(this.state);
    }
    if (add ? satisfied : !(recorded && installed)) {
      return false;
    }
    // Record a claim before installation. Recovery checks the exact kernel
    // selector before deleting it. A failed add never confers ownership.
    if (add) {
      owned.push(item);
      await this.persist(this.state);
    }
    try {
      await run(command, args);
    } catch (error) {
      if (add) {
        owned.splice(owned.indexOf(item), 1);
        await this.persist(this.state);
      }
      throw error;
    }
    if (!add) {
      owned.splice(index, 1);
      await this.persist(this.state);
    }
    return true;
  }

  private async family(name: string, family: Family, desired: Item[]) {
    const obsolete = this.state.owned[family].filter(
      (item) => !desired.some((wanted) => isDeepStrictEqual(wanted, item))
    );
    const changes = [
      ...desired.map((item) => ({ item, add: true })),
      ...obsolete.reverse().map((item) => ({ item, add: false })),
    ];
    const applied: typeof changes = [];
    try {
      for (const change of changes) {
        if (await this.reconcile(name, family, change.item, change.add)) {
          applied.push(change);
        }
      }
    } catch (cause) {
      const failures = [cause];
      for (const { item, add } of applied.reverse()) {
        try {
          await this.reconcile(name, family, item, !add);
        } catch (rollbackError) {
          failures.push(rollbackError);
        }
      }
      if (failures.length > 1) {
        throw new AggregateError(
          failures,
          'Could not restore previous default route policy',
          { cause }
        );
      }
      throw cause;
    }
  }

  async sync(network: InterfaceType, defaults: Defaults) {
    const name = network.name;
    let failure;
    for (const family of families) {
      const setting = defaults[family];
      if (!setting && !this.state.owned[family].length) {
        continue;
      }
      let table = setting;
      try {
        const auto =
          setting === 'auto' ? await this.automatic(name) : undefined;
        if (auto) {
          table = String(auto.table);
        }
        await this.family(
          name,
          family,
          await this.desired(network, family, setting, auto)
        );
      } catch (cause) {
        const prefix = family === 'ipv4' ? '0.0.0.0/0' : '::/0';
        failure ??= createError({
          status: cause instanceof DefaultRouteConflict ? 409 : 500,
          statusText: 'Default route update failed',
          message: `Settings saved. Could not update ${prefix} on ${name} in table ${table ?? 'previous'}. Maintenance will retry.`,
          cause,
        });
      }
    }
    await this.clearMark(name);
    return failure;
  }

  async stop(name: string) {
    for (const family of families) {
      await this.family(name, family, []);
    }
    await this.clearMark(name);
  }
}
