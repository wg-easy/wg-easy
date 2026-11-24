import { randomUUID } from 'node:crypto';
import { readlink } from 'node:fs/promises';

import { createError } from 'nuxt/server';

import {
  installDefaultRoutes,
  removeDefaultRules,
  type DefaultRouteTables,
} from '#server/features/vpn/defaultPolicy';
import { SiteRoutes } from '#server/features/vpn/siteRoutes';
import {
  readTunnelRecord,
  removeTunnelRecord,
  saveTunnelRecord,
  type TunnelRecord,
} from '#server/features/vpn/tunnelRecord';
import type { HooksType } from '#db/repositories/hooks/types';
import type { InterfaceType } from '#db/repositories/interface/types';
import {
  expandHook,
  tunnelAddresses,
} from '#server/features/vpn/configuration';
import { exec } from '#server/utils/cmd';
import { WG_ENV } from '#server/utils/config';
import { firewall } from '#server/utils/firewall';
import { parseInterfaceName } from '#server/utils/interfaceName';
import { setTunnelMtu } from '#server/utils/tunnelMtu';
import { wg } from '#server/utils/wgHelper';

type Link = {
  ifname: string;
  ifindex: number;
  ifalias?: string;
  altnames?: string[];
};

async function linkIdentity(name: string): Promise<Link | undefined> {
  if (process.platform !== 'linux') {
    return;
  }
  try {
    const links: Link[] = JSON.parse(await exec(`ip -j link show dev ${name}`));
    return links[0];
  } catch (error) {
    if (
      !/Device .* does not exist|Cannot find device/.test(
        (error as { stderr?: string }).stderr ?? ''
      )
    ) {
      throw error;
    }
  }
}

async function createLink(name: string, kind: 'wireguard' | 'amneziawg') {
  try {
    await exec(`ip link add dev ${name} type ${kind}`);
    return false;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !/unknown device type|operation not supported/i.test(error.message)
    ) {
      throw error;
    }
    await exec(`ip tuntap add dev ${name} mode tun vnet_hdr`);
    return true;
  }
}

function temporaryName(record: TunnelRecord) {
  // IFNAMSIZ allows 15 characters. The private record reserves this random name.
  return 'wg' + record.policy.tag.slice(8).replaceAll('-', '').slice(0, 13);
}

export class LinuxTunnel {
  private running?: TunnelRecord;
  private pendingDownHooks = false;
  readonly sites = new SiteRoutes();

  async checkOwnership(name: string) {
    const link = await linkIdentity(parseInterfaceName(name));
    if (!link) {
      return;
    }
    try {
      const record = this.running ?? (await readTunnelRecord(name));
      if (
        record?.name === name &&
        link.ifname === name &&
        (link.altnames?.includes(record.policy.tag) ||
          link.ifalias === record.policy.tag) &&
        record.index === link.ifindex
      ) {
        this.running = record;
        return record;
      }
    } catch (cause) {
      // Missing, unreadable and malformed records all leave ownership unproven.
      console.error(
        `Could not verify tunnel recovery record for ${name}`,
        (cause as Error).name
      );
    }
    throw createError({
      status: 409,
      statusText: 'Interface name collision',
      message: `Interface ${name} already exists and is not owned by wg-easy.`,
    });
  }

  async create(network: InterfaceType) {
    const name = parseInterfaceName(network.name);
    if (process.platform !== 'linux') {
      return;
    }
    const kind = WG_ENV.WG_EXECUTABLE === 'awg' ? 'amneziawg' : 'wireguard';
    const alias = 'wg-easy-' + randomUUID();
    const record: TunnelRecord = {
      version: 1,
      index: null,
      phase: 'creating',
      namespace: await readlink('/proc/self/ns/net'),
      name,
      backend: WG_ENV.WG_EXECUTABLE,
      table: network.routingTable,
      disableIpv6: WG_ENV.DISABLE_IPV6,
      filtering: false,
      preDown: '',
      postDown: '',
      policy: { tag: alias, owned: { ipv4: [], ipv6: [] } },
    };
    // Publish the configured name only after its generation is recoverable.
    const temporary = temporaryName(record);
    await saveTunnelRecord(record);
    this.running = record;
    let userspace;
    try {
      userspace = await createLink(temporary, kind);
    } catch (error) {
      // Neither exclusive create succeeded. Do not claim an existing device.
      this.running = undefined;
      await removeTunnelRecord(name);
      throw error;
    }
    const link = await linkIdentity(temporary);
    if (!link) {
      throw new Error(
        `Tunnel interface ${temporary} disappeared during creation`
      );
    }
    record.index = link.ifindex;
    await exec(`ip link property add dev ${temporary} altname ${alias}`);
    await saveTunnelRecord(record);
    try {
      await exec(`ip link set dev ${temporary} name ${name}`);
    } catch (error) {
      // A collision at the public name must leave neither device modified.
      const pending = await linkIdentity(temporary);
      if (
        pending?.ifindex === link.ifindex &&
        pending.altnames?.includes(alias)
      ) {
        await exec(`ip link delete dev ${alias}`);
        await removeTunnelRecord(name);
        this.running = undefined;
      }
      throw error;
    }
    if (!(await this.checkOwnership(name))) {
      throw new Error(`Tunnel interface ${name} disappeared during creation`);
    }
    if (userspace) {
      await exec(`setsid ${kind}-go ${name}`);
    }
    delete record.phase;
    await saveTunnelRecord(record);
  }

  async recordFiltering(enabled: boolean) {
    if (this.running && this.running.filtering !== enabled) {
      const updated = { ...this.running, filtering: enabled };
      await saveTunnelRecord(updated);
      this.running = updated;
    }
  }

  async guardTraffic(network: InterfaceType, enableIpv6: boolean) {
    if (network.firewallEnabled) {
      await this.recordFiltering(true);
      await firewall.blockTraffic(network.name, enableIpv6);
    }
  }

  armDownHooks(network: InterfaceType, hooks: HooksType) {
    if (process.platform !== 'linux') {
      return;
    }
    if (this.running?.name !== network.name) {
      throw new Error(`No tunnel recovery record for ${network.name}`);
    }
    // A stop during a storage outage still needs this generation's hooks.
    this.running = {
      ...this.running,
      preDown: expandHook(hooks.preDown, network, WG_ENV.PORT),
      postDown: expandHook(hooks.postDown, network, WG_ENV.PORT),
    };
    this.pendingDownHooks = true;
  }

  async persistDownHooks() {
    if (!this.pendingDownHooks || !this.running) {
      return;
    }
    const { name } = this.running;
    if (!(await this.checkOwnership(name))) {
      throw new Error(`Tunnel interface ${name} disappeared during startup`);
    }
    try {
      await saveTunnelRecord(this.running);
      this.pendingDownHooks = false;
    } catch (cause) {
      // Ownership is verified. A write failure must not skip live repairs.
      return new Error(
        `Could not write the tunnel recovery record for ${name}`,
        {
          cause,
        }
      );
    }
  }

  async configureLink(
    network: InterfaceType,
    enableIpv6: boolean,
    defaultTables: DefaultRouteTables
  ) {
    if (process.platform !== 'linux') {
      return;
    }
    if (this.running?.name !== network.name) {
      throw new Error(`No tunnel recovery record for ${network.name}`);
    }
    const { name } = this.running;
    for (const address of tunnelAddresses(network, enableIpv6)) {
      await exec(`ip address add ${address} dev ${name}`);
    }
    await setTunnelMtu(name, network.mtu);
    await exec(`ip link set dev ${name} up`);
    return installDefaultRoutes(this.running, network, defaultTables);
  }

  async stop(name: string, skipHooks = false) {
    if (process.platform !== 'linux') {
      return;
    }
    parseInterfaceName(name);
    let running = await this.checkOwnership(name);
    if (!running) {
      const record = this.running ?? (await readTunnelRecord(name));
      if (
        record?.phase &&
        record.namespace === (await readlink('/proc/self/ns/net'))
      ) {
        if (record.phase === 'creating') {
          const temporary = temporaryName(record);
          const link = await linkIdentity(temporary);
          if (
            link &&
            link.ifname === temporary &&
            (record.index === null || record.index === link.ifindex)
          ) {
            await exec(`ip link delete dev ${temporary}`);
          }
          await removeTunnelRecord(name);
        } else {
          await this.finishDeletion(record, skipHooks);
        }
      }
      this.running = undefined;
      return;
    }
    // Consume PreDown before invoking Bash. A crash or partial hook failure
    // cannot safely establish which commands from that hook already ran.
    if (running.preDown || (skipHooks && running.postDown)) {
      const { preDown, postDown } = running;
      running = {
        ...running,
        preDown: '',
        postDown: skipHooks ? '' : postDown,
      };
      await saveTunnelRecord(running);
      this.running = running;
      if (!skipHooks && preDown) {
        await wg.runHook(name, running.table, preDown, running.disableIpv6);
        if (!(await this.checkOwnership(name))) {
          throw new Error(
            `Tunnel interface ${name} disappeared during PreDown`
          );
        }
      }
    }
    await removeDefaultRules(running);
    running = {
      ...running,
      phase: 'deleting',
      namespace: await readlink('/proc/self/ns/net'),
    };
    await saveTunnelRecord(running);
    this.running = running;
    const tag = running.policy.tag;
    let target = await linkIdentity(tag);
    if (!target) {
      // Migrate a link created by a version that used only IFLA_IFALIAS.
      const legacy = await linkIdentity(name);
      if (legacy?.ifindex !== running.index || legacy.ifalias !== tag) {
        throw new Error(`Interface ${name} changed during teardown`);
      }
      await exec(`ip link property add dev ${name} altname ${tag}`);
      target = await linkIdentity(tag);
    }
    if (
      target?.ifindex !== running.index ||
      target.ifname !== name ||
      !target.altnames?.includes(tag)
    ) {
      throw new Error(`Tunnel identity changed during teardown of ${name}`);
    }
    await exec(`ip link delete dev ${tag}`);
    await this.finishDeletion(running, skipHooks);
    this.running = undefined;
  }

  private async finishDeletion(running: TunnelRecord, skipHooks: boolean) {
    const { name } = running;
    // Keep filtering in place through link deletion. Never remove rules or
    // run PostDown for an interface that has since taken the same name.
    if (await linkIdentity(name)) {
      throw new Error(`Interface ${name} was replaced during teardown`);
    }
    if (running.filtering) {
      await firewall.removeOwnedFiltering(name, !running.disableIpv6);
    }
    if (!skipHooks && running.postDown) {
      // Consume before entering Bash. A process restart cannot replay a
      // partially executed PostDown.
      const consumed = { ...running, postDown: '' };
      await saveTunnelRecord(consumed);
      this.running = consumed;
      await wg.runHook(
        name,
        running.table,
        running.postDown,
        running.disableIpv6
      );
    }
    await removeTunnelRecord(name);
  }
}
