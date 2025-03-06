import { eq, sql } from 'drizzle-orm';
import { parseCidr } from 'cidr-tools';
import { wgInterface } from './schema';
import type { InterfaceCidrUpdateType, InterfaceUpdateType } from './types';
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

      for (const client of clients) {
        // TODO: optimize
        const clients = await tx.query.client.findMany().execute();

        // only calculate ip if cidr has changed

        let nextIpv4 = client.ipv4Address;
        if (data.ipv4Cidr !== oldCidr.ipv4Cidr) {
          nextIpv4 = nextIP(4, parseCidr(data.ipv4Cidr), clients);
        }

        let nextIpv6 = client.ipv6Address;
        if (data.ipv6Cidr !== oldCidr.ipv6Cidr) {
          nextIpv6 = nextIP(6, parseCidr(data.ipv6Cidr), clients);
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
