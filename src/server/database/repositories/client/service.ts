import { eq, sql, or, like, and } from 'drizzle-orm';
import { containsCidr, parseCidr } from 'cidr-tools';
import { client } from './schema';
import type {
  ClientCreateFromExistingType,
  ClientCreateType,
  UpdateClientType,
} from './types';
import type { DBType } from '#db/sqlite';
import { wgInterface, userConfig } from '#db/schema';

function createPreparedStatement(db: DBType, direction: 'ASC' | 'DESC') {
  return {
    findAll: db.query.client
      .findMany({
        with: {
          oneTimeLink: true,
        },
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    findAllPublic: db.query.client
      .findMany({
        with: {
          oneTimeLink: true,
        },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    countAll: db
      .select({
        total: sql<number>`count(*)`
      })
      .from(client)
      .prepare(),
    findPaginatedListPublic: db.query.client
      .findMany({
        with: {
          oneTimeLink: true,
        },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        limit: sql.placeholder('limit'),
        offset: sql.placeholder('offset'),
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    findById: db.query.client
      .findFirst({ where: eq(client.id, sql.placeholder('id')) })
      .prepare(),
    findByUserId: db.query.client
      .findMany({
        where: eq(client.userId, sql.placeholder('userId')),
        with: { oneTimeLink: true },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    countByUserId: db
      .select({
        total: sql<number>`count(*)`
      })
      .from(client)
      .where(
        and(
          eq(client.userId, sql.placeholder('userId'))
        )
      )
      .prepare(),
    findPaginatedListByUserId: db.query.client
      .findMany({
        where: eq(client.userId, sql.placeholder('userId')),
        with: { oneTimeLink: true },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        limit: sql.placeholder('limit'),
        offset: sql.placeholder('offset'),
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    findAllPublicFiltered: db.query.client
      .findMany({
        where: or(
          like(client.name, sql.placeholder('filter')),
          like(client.ipv4Address, sql.placeholder('filter')),
          like(client.ipv6Address, sql.placeholder('filter'))
        ),
        with: {
          oneTimeLink: true,
        },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    countAllFiltered: db
      .select({
        total: sql<number>`count(*)`
      })
      .from(client)
      .where(
        and(
          or(
            like(client.name, sql.placeholder('filter')),
            like(client.ipv4Address, sql.placeholder('filter')),
            like(client.ipv6Address, sql.placeholder('filter'))
          )
        )
      )
      .prepare(),
    findPaginatedListPublicFiltered: db.query.client
      .findMany({
        where: or(
          like(client.name, sql.placeholder('filter')),
          like(client.ipv4Address, sql.placeholder('filter')),
          like(client.ipv6Address, sql.placeholder('filter'))
        ),
        with: {
          oneTimeLink: true,
        },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        limit: sql.placeholder('limit'),
        offset: sql.placeholder('offset'),
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    findByUserIdFiltered: db.query.client
      .findMany({
        where: and(
          eq(client.userId, sql.placeholder('userId')),
          or(
            like(client.name, sql.placeholder('filter')),
            like(client.ipv4Address, sql.placeholder('filter')),
            like(client.ipv6Address, sql.placeholder('filter'))
          )
        ),
        with: { oneTimeLink: true },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
      .prepare(),
    countByUserIdFiltered: db
      .select({
        total: sql<number>`count(*)`
      })
      .from(client)
      .where(
        and(
          eq(client.userId, sql.placeholder('userId')),
          or(
            like(client.name, sql.placeholder('filter')),
            like(client.ipv4Address, sql.placeholder('filter')),
            like(client.ipv6Address, sql.placeholder('filter'))
          )
        )
      )
      .prepare(),
    findPaginatedListByUserIdFiltered: db.query.client
      .findMany({
        where: and(
          eq(client.userId, sql.placeholder('userId')),
          or(
            like(client.name, sql.placeholder('filter')),
            like(client.ipv4Address, sql.placeholder('filter')),
            like(client.ipv6Address, sql.placeholder('filter'))
          )
        ),
        with: { oneTimeLink: true },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        limit: sql.placeholder('limit'),
        offset: sql.placeholder('offset'),
        orderBy: sql`${client.name} ${sql.raw(direction)}`,
      })
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

  constructor(db: DBType) {
    this.#db = db;
  }

  getStatements(direction?: 'ASC' | 'DESC'){
    return createPreparedStatement(this.#db, direction ?? "ASC");
  }

  async getForUser(userId: ID, sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const result = await this.getStatements(direction).findByUserId.execute({ userId });
    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  async countForUser(userId: ID) {
    const result = await this.getStatements().countByUserId.execute({ userId });

    return result?.at(0)?.total ?? 0;
  }

  async getPaginatedListForUser(userId: ID, page: number, limit: number, sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const result = await this.getStatements(direction).findPaginatedListByUserId.execute({ 
      userId,
      limit,
      offset });
    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Never return values directly from this function. Use {@link getAllPublic} instead.
   */
  async getAll(sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const result = await this.getStatements(direction).findAll.execute();
    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Returns all clients without sensitive data
   */
  async getAllPublic(sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';

    const result = await this.getStatements(direction).findAllPublic.execute();
    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Returns count all clients
   */
  async countAll() {
    const result = await this.getStatements().countAll.execute();

    return result?.at(0)?.total ?? 0;
  }

  /**
   * Get a paginated list of clients without sensitive data
   */
  async getPaginatedListPublic(page: number, limit: number, sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const result = await this.getStatements(direction).findPaginatedListPublic.execute({
      limit,
      offset,
    });

    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get clients based on user ID and filter conditions
   */
  async getForUserFiltered(userId: ID, filter: string, sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const filterPattern = `%${filter.toLowerCase()}%`;

    const result = await this.getStatements(direction).findByUserIdFiltered.execute({
      userId,
      filter: filterPattern,
    });

    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get count clients based on user ID and filter conditions
   */
  async countForUserFiltered(userId: ID, filter: string) {
    const filterPattern = `%${filter.toLowerCase()}%`;

    const result = await this.getStatements().countByUserIdFiltered.execute({
      userId,
      filter: filterPattern,
    });

    return result?.at(0)?.total ?? 0;
  }

  /**
   * Get a paginated list of clients based on user ID and filter conditions
   */
  async getPaginatedListForUserFiltered(userId: ID, filter: string, page: number, limit: number, sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const filterPattern = `%${filter.toLowerCase()}%`;
    const offset = (page - 1) * limit;

    const result = await this.getStatements(direction).findPaginatedListByUserIdFiltered.execute({
      userId,
      filter: filterPattern,
      limit,
      offset
    });

    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get all clients based on filter conditions without sensitive data
   */
  async getAllPublicFiltered(filter: string, sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const filterPattern = `%${filter.toLowerCase()}%`;

    const result = await this.getStatements(direction).findAllPublicFiltered.execute({
      filter: filterPattern,
    });

    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get count all clients based on filter conditions
   */
  async countAllFiltered(filter: string) {
    const filterPattern = `%${filter.toLowerCase()}%`;

    const result = await this.getStatements().countAllFiltered.execute({
      filter: filterPattern,
    });

    return result?.at(0)?.total ?? 0;
  }

  /**
   * Get a paginated list of clients based on filter conditions without sensitive data.
   */
  async getPaginatedListPublicFiltered(filter: string, page: number, limit: number, sortClient: boolean) {
    const direction = sortClient ? 'ASC' : 'DESC';
    const filterPattern = `%${filter.toLowerCase()}%`;

    const offset = (page - 1) * limit;

    const result = await this.getStatements(direction).findPaginatedListPublicFiltered.execute({
      filter: filterPattern,
      limit,
      offset,
      sortClient
    });

    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  get(id: ID) {
    return this.getStatements().findById.execute({ id });
  }

  async create({ name, expiresAt }: ClientCreateType) {
    const privateKey = await wg.generatePrivateKey();
    const publicKey = await wg.getPublicKey(privateKey);
    const preSharedKey = await wg.generatePreSharedKey();

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

      return await tx
        .insert(client)
        .values({
          name,
          // TODO: properly assign user id
          userId: 1,
          interfaceId: 'wg0',
          expiresAt,
          privateKey,
          publicKey,
          preSharedKey,
          ipv4Address,
          ipv6Address,
          mtu: clientConfig.defaultMtu,
          jC: clientConfig.defaultJC,
          jMin: clientConfig.defaultJMin,
          jMax: clientConfig.defaultJMax,
          i1: clientConfig.defaultI1,
          i2: clientConfig.defaultI2,
          i3: clientConfig.defaultI3,
          i4: clientConfig.defaultI4,
          i5: clientConfig.defaultI5,
          persistentKeepalive: clientConfig.defaultPersistentKeepalive,
          serverAllowedIps: [],
          enabled: true,
        })
        .returning({ clientId: client.id })
        .execute();
    });
  }

  toggle(id: ID, enabled: boolean) {
    return this.getStatements().toggle.execute({ id, enabled });
  }

  delete(id: ID) {
    return this.getStatements().delete.execute({ id });
  }

  update(id: ID, data: UpdateClientType) {
    return this.#db.transaction(async (tx) => {
      const clientInterface = await tx.query.wgInterface
        .findFirst({
          where: eq(wgInterface.name, 'wg0'),
        })
        .execute();

      if (!clientInterface) {
        throw new Error('WireGuard interface not found');
      }

      if (!containsCidr(clientInterface.ipv4Cidr, data.ipv4Address)) {
        throw new Error('IPv4 address is not within the CIDR range');
      }

      if (!containsCidr(clientInterface.ipv6Cidr, data.ipv6Address)) {
        throw new Error('IPv6 address is not within the CIDR range');
      }

      await tx.update(client).set(data).where(eq(client.id, id)).execute();
    });
  }

  async createFromExisting({
    name,
    enabled,
    ipv4Address,
    ipv6Address,
    preSharedKey,
    privateKey,
    publicKey,
  }: ClientCreateFromExistingType) {
    const clientConfig = await Database.userConfigs.get();

    return this.#db
      .insert(client)
      .values({
        name,
        userId: 1,
        interfaceId: 'wg0',
        privateKey,
        publicKey,
        preSharedKey,
        ipv4Address,
        ipv6Address,
        mtu: clientConfig.defaultMtu,
        jC: clientConfig.defaultJC,
        jMin: clientConfig.defaultJMin,
        jMax: clientConfig.defaultJMax,
        i1: clientConfig.defaultI1,
        i2: clientConfig.defaultI2,
        i3: clientConfig.defaultI3,
        i4: clientConfig.defaultI4,
        allowedIps: clientConfig.defaultAllowedIps,
        dns: clientConfig.defaultDns,
        persistentKeepalive: clientConfig.defaultPersistentKeepalive,
        serverAllowedIps: [],
        enabled,
      })
      .execute();
  }
}
