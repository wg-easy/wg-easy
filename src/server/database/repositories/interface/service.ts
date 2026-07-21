import { eq, sql } from 'drizzle-orm';
import { parseCidr } from 'cidr-tools';

import { wgInterface } from './schema';
import type { InterfaceCidrUpdateType, InterfaceUpdateType } from './types';

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
      interface: 'wg0',
    });
    if (!wgInterface) {
      throw new Error('Interface not found');
    }
    return wgInterface;
  }

  updateKeyPair(privateKey: string, publicKey: string) {
    return this.#statements.updateKeyPair.execute({
      interface: 'wg0',
      privateKey,
      publicKey,
    });
  }

  update(data: InterfaceUpdateType) {
    return this.#db
      .update(wgInterface)
      .set(data)
      .where(eq(wgInterface.name, 'wg0'))
      .execute();
  }

  setFirewallEnabled(firewallEnabled: boolean) {
    return this.#statements.setFirewallEnabled.execute({
      interface: 'wg0',
      firewallEnabled,
    });
  }

  updateCidr(data: InterfaceCidrUpdateType) {
    return this.#db.transaction(async (tx) => {
      const oldCidr = await tx.query.wgInterface
        .findFirst({
          where: eq(wgInterface.name, 'wg0'),
          columns: { ipv4Cidr: true, ipv6Cidr: true },
        })
        .execute();

      if (!oldCidr) {
        throw new Error('Interface not found');
      }

      await tx
        .update(wgInterface)
        .set(data)
        .where(eq(wgInterface.name, 'wg0'))
        .execute();

      const clients = await tx.query.client.findMany().execute();
      const ipv4CidrChanged = data.ipv4Cidr !== oldCidr.ipv4Cidr;
      const ipv6CidrChanged = data.ipv6Cidr !== oldCidr.ipv6Cidr;
      const ipv4Cidr = ipv4CidrChanged ? parseCidr(data.ipv4Cidr) : null;
      const ipv6Cidr = ipv6CidrChanged ? parseCidr(data.ipv6Cidr) : null;
      const ipv4Addresses = new Set(
        clients.map((client) => client.ipv4Address)
      );
      const ipv6Addresses = new Set(
        clients.map((client) => client.ipv6Address)
      );

      for (const client of clients) {
        // only calculate ip if cidr has changed

        let nextIpv4 = client.ipv4Address;
        if (ipv4Cidr) {
          nextIpv4 = nextIPFromUsedAddresses(4, ipv4Cidr, ipv4Addresses);
          ipv4Addresses.add(nextIpv4);
          ipv4Addresses.delete(client.ipv4Address);
        }

        let nextIpv6 = client.ipv6Address;
        if (ipv6Cidr) {
          nextIpv6 = nextIPFromUsedAddresses(6, ipv6Cidr, ipv6Addresses);
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
