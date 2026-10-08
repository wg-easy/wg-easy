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

import {
  assertAwgParameters,
  type AwgVersion,
} from '#server/utils/awgProtocol';
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

  async update(data: InterfaceUpdateType) {
    assertAwgParameters((await this.get()).awgProtocolVersion, data);
    const {
      awgProtocolVersion: _version,
      awgProfileGenerated: _generated,
      ...editable
    } = data as typeof data & {
      awgProtocolVersion?: AwgVersion;
      awgProfileGenerated?: boolean;
    };
    return this.#db
      .update(wgInterface)
      .set(editable)
      .where(eq(wgInterface.name, WG_ENV.WG_INTERFACE))
      .execute();
  }

  /** Save profile and client defaults together, before generating VPN keys. */
  initializeAwgProfile(version: AwgVersion, profile?: AwgProfile) {
    return this.#db.transaction(async (tx) => {
      const current = await tx.query.wgInterface.findFirst({
        where: eq(wgInterface.name, WG_ENV.WG_INTERFACE),
      });
      if (!current) throw new Error('Interface not found');
      if (
        current.awgProtocolVersion &&
        current.awgProtocolVersion !== version
      ) {
        throw new Error('Changing an existing AWG profile requires migration');
      }
      if (profile) {
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
        assertAwgParameters(version, profile.parameters);
        InterfaceUpdateSchema.parse({ ...current, ...profile.parameters });
        // Host is still empty before the setup wizard; it is not changed here.
        UserConfigUpdateSchema.parse({
          ...defaults,
          host: defaults.host || 'localhost',
          ...profile.defaults,
        });
        await tx
          .update(userConfig)
          .set(profile.defaults)
          .where(eq(userConfig.id, WG_ENV.WG_INTERFACE));
      }
      if (!profile) {
        assertAwgParameters(version, current);
        const defaults = await tx.query.userConfig.findFirst({
          where: eq(userConfig.id, WG_ENV.WG_INTERFACE),
        });
        if (!defaults) throw new Error('User config not found');
        assertAwgParameters(version, defaults);
        for (const client of await tx.query.client.findMany())
          assertAwgParameters(version, client);
      }
      await tx
        .update(wgInterface)
        .set({
          ...profile?.parameters,
          awgProtocolVersion: version,
          ...(profile ? { awgProfileGenerated: true } : {}),
        })
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
