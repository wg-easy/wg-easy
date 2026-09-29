import { eq, sql } from 'drizzle-orm';
import { parseCidr } from 'cidr-tools';

import { wgInterface } from './schema';
import type { InterfaceCidrUpdateType, InterfaceUpdateType } from './types';

import { assertSeparateNetworks } from '#server/utils/protocol';
import { createAwgDefaults } from '#server/utils/awgDefaults';
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

  getAll() {
    return this.#db.query.wgInterface.findMany().execute();
  }

  async get(interfaceName = WG_ENV.WG_INTERFACE) {
    const wgInterface = await this.#statements.get.execute({
      interface: interfaceName,
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

  async initialize(
    privateKey: string,
    publicKey: string,
    interfaceName = WG_ENV.WG_INTERFACE
  ) {
    const current = await this.get(interfaceName);
    return this.#db
      .update(wgInterface)
      .set({
        ...(current.protocol === 'awg' ? createAwgDefaults() : {}),
        privateKey,
        publicKey,
      })
      .where(eq(wgInterface.name, interfaceName))
      .execute();
  }

  update(data: InterfaceUpdateType, interfaceName = WG_ENV.WG_INTERFACE) {
    return this.#db
      .update(wgInterface)
      .set(data)
      .where(eq(wgInterface.name, interfaceName))
      .execute();
  }

  setFirewallEnabled(
    firewallEnabled: boolean,
    interfaceName = WG_ENV.WG_INTERFACE
  ) {
    return this.#statements.setFirewallEnabled.execute({
      interface: interfaceName,
      firewallEnabled,
    });
  }

  updateCidr(
    data: InterfaceCidrUpdateType,
    interfaceName = WG_ENV.WG_INTERFACE
  ) {
    return this.#db.transaction(async (tx) => {
      const interfaces = await tx.query.wgInterface.findMany().execute();
      for (const other of interfaces) {
        if (other.name !== interfaceName) assertSeparateNetworks(data, other);
      }
      const oldCidr = await tx.query.wgInterface
        .findFirst({
          where: eq(wgInterface.name, interfaceName),
          columns: { ipv4Cidr: true, ipv6Cidr: true },
        })
        .execute();

      if (!oldCidr) {
        throw new Error('Interface not found');
      }

      await tx
        .update(wgInterface)
        .set(data)
        .where(eq(wgInterface.name, interfaceName))
        .execute();

      const clients = await tx.query.client
        .findMany({ where: eq(clientSchema.interfaceId, interfaceName) })
        .execute();
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
