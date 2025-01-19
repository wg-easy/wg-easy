import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { client } from './schema';
import type { ClientCreateType, UpdateClientType } from './types';
import type { ID } from '#db/schema';
import { wgInterface, userConfig } from '#db/schema';
import { parseCidr } from 'cidr-tools';

function createPreparedStatement(db: DBType) {
  return {
    findAll: db.query.client
      .findMany({
        with: {
          oneTimeLink: true,
        },
      })
      .prepare(),
    findById: db.query.client
      .findFirst({ where: eq(client.id, sql.placeholder('id')) })
      .prepare(),
    toggle: db
      .update(client)
      .set({ enabled: sql.placeholder('enabled') as never as boolean })
      .where(eq(client.id, sql.placeholder('id')))
      .prepare(),
    delete: db
      .delete(client)
      .where(eq(client.id, sql.placeholder('id')))
      .prepare(),
  };
}

export class ClientService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  async getAll() {
    const result = await this.#statements.findAll.execute();
    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  get(id: ID) {
    return this.#statements.findById.execute({ id });
  }

  async create({ name, expiresAt }: ClientCreateType) {
    const privateKey = await wg.generatePrivateKey();
    const publicKey = await wg.getPublicKey(privateKey);
    const preSharedKey = await wg.generatePreSharedKey();

    let parsedExpiresAt = expiresAt;
    if (parsedExpiresAt) {
      const expiresAtDate = new Date(parsedExpiresAt);
      expiresAtDate.setHours(23);
      expiresAtDate.setMinutes(59);
      expiresAtDate.setSeconds(59);
      parsedExpiresAt = expiresAtDate.toISOString();
    }

    return this.#db.transaction(async (tx) => {
      const clients = await tx.query.client.findMany().execute();
      const clientInterface = await tx.query.wgInterface
        .findFirst({
          where: eq(wgInterface.name, 'wg0'),
        })
        .execute();

      if (!clientInterface) {
        throw new Error('WireGuard interface not found');
      }

      const clientConfig = await tx.query.userConfig
        .findFirst({
          where: eq(userConfig.id, clientInterface.name),
        })
        .execute();

      if (!clientConfig) {
        throw new Error('WireGuard interface configuration not found');
      }

      const ipv4Cidr = parseCidr(clientInterface.ipv4Cidr);
      const ipv4Address = nextIP(4, ipv4Cidr, clients);
      const ipv6Cidr = parseCidr(clientInterface.ipv6Cidr);
      const ipv6Address = nextIP(6, ipv6Cidr, clients);

      await tx
        .insert(client)
        .values({
          name,
          expiresAt: parsedExpiresAt,
          privateKey,
          publicKey,
          preSharedKey,
          ipv4Address,
          ipv6Address,
          mtu: clientConfig.defaultMtu,
          allowedIps: clientConfig.defaultAllowedIps,
          dns: clientConfig.defaultDns,
          persistentKeepalive: clientConfig.defaultPersistentKeepalive,
          serverAllowedIps: [],
          enabled: true,
        })
        .execute();
    });
  }

  toggle(id: ID, enabled: boolean) {
    return this.#statements.toggle.execute({ id, enabled });
  }

  delete(id: ID) {
    return this.#statements.delete.execute({ id });
  }

  update(id: ID, data: UpdateClientType) {
    return this.#db.update(client).set(data).where(eq(client.id, id)).prepare();
  }
}
