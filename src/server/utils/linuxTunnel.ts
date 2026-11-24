import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

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

async function linkIdentity(name: string) {
  if (process.platform !== 'linux') {
    return;
  }
  try {
    const directory = `/sys/class/net/${name}`;
    const [index, alias] = await Promise.all([
      readFile(directory + '/ifindex', 'utf8'),
      readFile(directory + '/ifalias', 'utf8'),
    ]);
    return { index: Number(index), alias: alias.replace(/\n$/, '') };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export class LinuxTunnel {
  private running?: TunnelRecord;
  private pendingDownHooks = false;
  // Only this process can finish removal after it observed link deletion.
  private deleted?: TunnelRecord;
  readonly sites = new SiteRoutes();

  async checkOwnership(name: string) {
    const link = await linkIdentity(parseInterfaceName(name));
    if (!link) {
      return;
    }
    try {
      const record = this.running ?? (await readTunnelRecord(name));
      if (
        record.name === name &&
        record.policy.tag === link.alias &&
        record.index === link.index
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
    try {
      await exec(`ip link add dev ${name} type ${kind}`);
    } catch (error) {
      // A missing link kind is recoverable. Permission and name collisions
      // must be reported, since attaching a userspace process is unsafe.
      if (
        !(error instanceof Error) ||
        !/unknown device type|operation not supported/i.test(error.message)
      ) {
        throw error;
      }
      // Keep the userspace link alive while the container init forwards TERM
      // to the app. stop() runs PreDown, then deletes the link and its daemon.
      await exec(`setsid ${kind}-go ${name}`);
    }
    const alias = 'wg-easy-' + randomUUID();
    await exec(`ip link set dev ${name} alias ${alias}`);
    const link = await linkIdentity(name);
    if (!link || link.alias !== alias) {
      throw new Error(`Tunnel interface ${name} changed during creation`);
    }
    const record: TunnelRecord = {
      version: 1,
      index: link.index,
      name,
      backend: WG_ENV.WG_EXECUTABLE,
      table: network.routingTable,
      disableIpv6: WG_ENV.DISABLE_IPV6,
      filtering: false,
      preDown: '',
      postDown: '',
      policy: { tag: alias, owned: { ipv4: [], ipv6: [] } },
    };
    this.running = record;
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
    let running = await this.checkOwnership(name);
    if (!running) {
      this.running = undefined;
      return this.finishDeletion(skipHooks);
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
    await exec(`ip link delete dev ${name}`);
    this.deleted = this.running;
    this.running = undefined;
    await this.finishDeletion(skipHooks);
  }

  private async finishDeletion(skipHooks: boolean) {
    const running = this.deleted;
    if (!running) {
      return;
    }
    const { name } = running;
    // Keep filtering in place through link deletion. Never remove rules or
    // run PostDown for an interface that has since taken the same name.
    if (await linkIdentity(name)) {
      throw new Error(`Interface ${name} was replaced during teardown`);
    }
    if (running.filtering) {
      await firewall.removeOwnedFiltering(name, !running.disableIpv6);
    }
    this.deleted = undefined;
    try {
      if (!skipHooks && running.postDown) {
        await wg.runHook(
          name,
          running.table,
          running.postDown,
          running.disableIpv6
        );
      }
    } finally {
      await removeTunnelRecord(name);
    }
  }
}
