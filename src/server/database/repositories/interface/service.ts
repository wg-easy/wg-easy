import { eq, sql } from 'drizzle-orm';
import { parseCidr } from 'cidr-tools';

import { userConfig } from '../userConfig/schema';
import { UserConfigUpdateSchema } from '../userConfig/types';

import { wgInterface } from './schema';
import {
  InterfaceUpdateSchema,
  type InterfaceCidrUpdateType,
  type InterfaceUpdateType,
} from './types';

import type { AwgProfile } from '#server/utils/awgProfile';
import { WG_ENV } from '#server/utils/config';
import { nextIPFromUsedAddresses } from '#server/utils/ip';
import { client as clientSchema } from '#db/schema';
import type { DBType } from '#db/sqlite';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.wgInterface
      .findFirst({ where: eq(wgInterface.name, sql.placeholder('interface')) })
      .prepare(),
    updateKeyPair: db
      .update(wgInterface)
      .set({
        privateKey: sql.placeholder('privateKey') as never as string,
        publicKey: sql.placeholder('publicKey') as never as string,
      })
      .where(eq(wgInterface.name, sql.placeholder('interface')))
      .prepare(),
    setFirewallEnabled: db
      .update(wgInterface)
      .set({
        firewallEnabled: sql.placeholder('firewallEnabled') as never as boolean,
      })
      .where(eq(wgInterface.name, sql.placeholder('interface')))
      .prepare(),
  };
}

export class InterfaceService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  async get() {
    const wgInterface = await this.#statements.get.execute({
      interface: WG_ENV.WG_INTERFACE,
    });
    if (!wgInterface) {
      throw new Error('Interface not found');
    }
    return wgInterface;
  }

  updateKeyPair(privateKey: string, publicKey: string) {
    return this.#statements.updateKeyPair.execute({
      interface: WG_ENV.WG_INTERFACE,
      privateKey,
      publicKey,
    });
  }

  update(data: InterfaceUpdateType) {
    const { awgProfileGenerated: _generated, ...editable } =
      data as typeof data & { awgProfileGenerated?: boolean };
    return this.#db
      .update(wgInterface)
      .set(editable)
      .where(eq(wgInterface.name, WG_ENV.WG_INTERFACE))
      .execute();
  }

  /** Persist server parameters and available client defaults together. */
  initializeAwgProfile(profile: AwgProfile) {
    return this.#db.transaction(async (tx) => {
      const current = await tx.query.wgInterface.findFirst({
        where: eq(wgInterface.name, WG_ENV.WG_INTERFACE),
      });
      if (!current) throw new Error('Interface not found');
      const clients = await tx.query.client.findMany({ limit: 1 });
      if (
        current.privateKey !== '---default---' ||
        current.publicKey !== '---default---' ||
        clients.length ||
        current.awgProfileGenerated
      ) {
        throw new Error('AWG_AUTO_GENERATE requires a fresh configuration');
      }
      const defaults = await tx.query.userConfig.findFirst({
        where: eq(userConfig.id, WG_ENV.WG_INTERFACE),
      });
      if (!defaults) throw new Error('User config not found');
      // Advanced defaults are applied when their corresponding settings exist.
      const optionalDefaults = Object.fromEntries(
        Object.entries(profile.clientDefaults).filter(
          ([key]) => key in defaults
        )
      );
      const changes = { ...profile.defaults, ...optionalDefaults };
      InterfaceUpdateSchema.parse({ ...current, ...profile.parameters });
      // The setup wizard has not supplied a host yet; leave its stored value alone.
      UserConfigUpdateSchema.parse({
        ...defaults,
        host: defaults.host || 'localhost',
        ...changes,
      });
      await tx
        .update(userConfig)
        .set(changes)
        .where(eq(userConfig.id, WG_ENV.WG_INTERFACE));
      await tx
        .update(wgInterface)
        .set({ ...profile.parameters, awgProfileGenerated: true })
        .where(eq(wgInterface.name, WG_ENV.WG_INTERFACE));
    });
  }

  setFirewallEnabled(firewallEnabled: boolean) {
    return this.#statements.setFirewallEnabled.execute({
      interface: WG_ENV.WG_INTERFACE,
      firewallEnabled,
    });
  }

  updateCidr(data: InterfaceCidrUpdateType) {
    return this.#db.transaction(async (tx) => {
      const oldCidr = await tx.query.wgInterface
        .findFirst({
          where: eq(wgInterface.name, WG_ENV.WG_INTERFACE),
          columns: { ipv4Cidr: true, ipv6Cidr: true },
        })
        .execute();

      if (!oldCidr) {
        throw new Error('Interface not found');
      }

      await tx
        .update(wgInterface)
        .set(data)
        .where(eq(wgInterface.name, WG_ENV.WG_INTERFACE))
        .execute();

      const clients = await tx.query.client.findMany().execute();
      const ipv4Addresses = new Set(
        clients.map((client) => client.ipv4Address)
      );
      const ipv6Addresses = new Set(
        clients.map((client) => client.ipv6Address)
      );

      for (const client of clients) {
        // only calculate ip if cidr has changed

        let nextIpv4 = client.ipv4Address;
        if (data.ipv4Cidr !== oldCidr.ipv4Cidr) {
          nextIpv4 = nextIPFromUsedAddresses(
            4,
            parseCidr(data.ipv4Cidr),
            ipv4Addresses
          );
          ipv4Addresses.add(nextIpv4);
          ipv4Addresses.delete(client.ipv4Address);
        }

        let nextIpv6 = client.ipv6Address;
        if (data.ipv6Cidr !== oldCidr.ipv6Cidr) {
          nextIpv6 = nextIPFromUsedAddresses(
            6,
            parseCidr(data.ipv6Cidr),
            ipv6Addresses
          );
          ipv6Addresses.add(nextIpv6);
          ipv6Addresses.delete(client.ipv6Address);
        }

        await tx
          .update(clientSchema)
          .set({
            ipv4Address: nextIpv4,
            ipv6Address: nextIpv6,
          })
          .where(eq(clientSchema.id, client.id))
          .execute();
      }
    });
  }
}
