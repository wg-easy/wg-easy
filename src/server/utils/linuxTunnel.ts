import { readFile } from 'node:fs/promises';

import { createError } from 'nuxt/server';

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

type QuickStartup = { contents: string; nativePostUp?: boolean };
type RunningLink = {
  index: number;
  table: string;
  preDown: string;
  postDown: string;
  quick: boolean;
};

async function interfaceIndex(name: string) {
  if (process.platform !== 'linux') {
    return;
  }
  try {
    return Number(await readFile(`/sys/class/net/${name}/ifindex`, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export class LinuxTunnel {
  private running?: RunningLink;

  async checkOwnership(name: string) {
    const index = await interfaceIndex(parseInterfaceName(name));
    if (index !== undefined && index !== this.running?.index) {
      throw createError({
        status: 409,
        statusText: 'Interface name collision',
        message: `Interface ${name} already exists and is not owned by wg-easy.`,
      });
    }
    return index;
  }

  async create(network: InterfaceType, hooks: HooksType, quick?: QuickStartup) {
    const name = parseInterfaceName(network.name);
    if (quick) {
      await wg.up(name, quick);
    } else {
      try {
        await exec(`ip link add dev ${name} type wireguard`);
      } catch (error) {
        // A missing link kind is recoverable. Permission and name collisions
        // must be reported, since attaching a userspace process is unsafe.
        if (
          !(error instanceof Error) ||
          !/unknown device type|operation not supported/i.test(error.message)
        ) {
          throw error;
        }
        await exec(`wireguard-go ${name}`);
      }
    }
    const index = await interfaceIndex(name);
    if (index === undefined && process.platform === 'linux') {
      throw new Error(`Tunnel interface ${name} disappeared during creation`);
    }
    const expand = (text: string) => expandHook(text, network, WG_ENV.PORT);
    this.running = {
      index: index ?? 0,
      quick: Boolean(quick),
      table: network.routingTable,
      preDown: expand(hooks.preDown),
      postDown: expand(hooks.postDown),
    };
    if (!quick && hooks.preUp) {
      await wg.runHook(name, network.routingTable, expand(hooks.preUp));
    }
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
    if (running.quick) {
      await wg.down(
        name,
        skipHooks ? { routingTable: running.table } : undefined
      );
    } else {
      if (!skipHooks && running.preDown) {
        await wg.runHook(name, running.table, running.preDown);
      }
      await exec(`ip link delete dev ${name}`);
    }
    this.running = undefined;
    if (!running.quick && !skipHooks && running.postDown) {
      await wg.runHook(name, running.table, running.postDown);
    }
  }
}
