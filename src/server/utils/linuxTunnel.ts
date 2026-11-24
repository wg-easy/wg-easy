import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { createError } from 'nuxt/server';

import { DefaultPolicy } from '#server/features/vpn/defaultPolicy';
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
  defaultPolicy = new DefaultPolicy();

  private attach(record: TunnelRecord) {
    this.running = record;
    this.defaultPolicy = new DefaultPolicy(record.policy, async (policy) => {
      await saveTunnelRecord({ ...this.running!, policy });
    });
  }

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
        if (!this.running) {
          this.attach(record);
        }
        return link.index;
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

  async create(network: InterfaceType, hooks: HooksType) {
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
      preDown: '',
      postDown: '',
      policy: { tag: alias, owned: { ipv4: [], ipv6: [] } },
    };
    this.attach(record);
    await saveTunnelRecord(record);
    if (hooks.preUp) {
      await wg.runHook(
        name,
        network.routingTable,
        expandHook(hooks.preUp, network, WG_ENV.PORT)
      );
    }
  }

  async completeStartup(network: InterfaceType, hooks: HooksType) {
    if (process.platform !== 'linux') {
      return;
    }
    if (!(await this.checkOwnership(network.name)) || !this.running) {
      throw new Error(
        `Tunnel interface ${network.name} disappeared during startup`
      );
    }
    const record = this.running;
    const applied = {
      ...record,
      preDown: expandHook(hooks.preDown, network, WG_ENV.PORT),
      postDown: expandHook(hooks.postDown, network, WG_ENV.PORT),
    };
    await saveTunnelRecord(applied);
    this.running = applied;
  }

  async configureLink(network: InterfaceType, enableIpv6: boolean) {
    const name = parseInterfaceName(network.name);
    for (const address of tunnelAddresses(network, enableIpv6)) {
      await exec(`ip address add ${address} dev ${name}`);
    }
    await setTunnelMtu(name, network.mtu);
    await exec(`ip link set dev ${name} up`);
  }

  async stop(name: string, skipHooks = false) {
    const index = await this.checkOwnership(name);
    const running = this.running;
    if (!running || index === undefined) {
      this.running = undefined;
      return;
    }
    // Consume PreDown before invoking Bash. A crash or partial hook failure
    // cannot safely establish which commands from that hook already ran.
    if (running.preDown || (skipHooks && running.postDown)) {
      const consumed = {
        ...running,
        preDown: '',
        postDown: skipHooks ? '' : running.postDown,
      };
      await saveTunnelRecord(consumed);
      this.running = consumed;
      if (!skipHooks && running.preDown) {
        await wg.runHook(
          name,
          running.table,
          running.preDown,
          running.disableIpv6
        );
        if (!(await this.checkOwnership(name))) {
          throw new Error(
            `Tunnel interface ${name} disappeared during PreDown`
          );
        }
      }
    }
    await this.defaultPolicy.stop(name, running.backend);
    await exec(`ip link delete dev ${name}`);
    this.running = undefined;
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
