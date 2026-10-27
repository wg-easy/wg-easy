import {
  eq,
  sql,
  or,
  like,
  and,
  inArray,
  notInArray,
  isNull,
  gt,
  lte,
} from 'drizzle-orm';
import { containsCidr, parseCidr } from 'cidr-tools';

import { client } from './schema';
import type {
  ClientBulkType,
  ClientCreateFromExistingType,
  ClientCreateType,
  ClientQueryType,
  ClientType,
  UpdateClientType,
} from './types';

import { WG_ENV } from '#server/utils/config';
import Database from '#server/utils/Database';
import { nextIP } from '#server/utils/ip';
import type { ID } from '#server/utils/types';
import { wg } from '#server/utils/wgHelper';
import type { DBType } from '#db/sqlite';
import { wgInterface, userConfig } from '#db/schema';

function clientFilter(
  query: ClientQueryType,
  onlinePublicKeys: string[],
  now: number
) {
  const pattern = query.filter?.trim()
    ? `%${query.filter.trim().toLowerCase()}%`
    : undefined;
  const expiry = sql`julianday(${client.expiresAt})`;
  const today = sql`julianday(${new Date(now).toISOString()})`;
  const nextWeek = sql`julianday(${new Date(now + 7 * 86400000).toISOString()})`;

  return and(
    pattern === undefined
      ? undefined
      : or(
          like(client.name, pattern),
          like(client.ipv4Address, pattern),
          like(client.ipv6Address, pattern)
        ),
    query.status === 'enabled'
      ? eq(client.enabled, true)
      : query.status === 'disabled'
        ? eq(client.enabled, false)
        : query.status === 'online'
          ? and(
              eq(client.enabled, true),
              inArray(client.publicKey, onlinePublicKeys)
            )
          : query.status === 'offline'
            ? and(
                eq(client.enabled, true),
                notInArray(client.publicKey, onlinePublicKeys)
              )
            : undefined,
    query.expiry === 'permanent'
      ? isNull(client.expiresAt)
      : query.expiry === 'expired'
        ? lte(expiry, today)
        : query.expiry === 'expiring'
          ? and(gt(expiry, today), lte(expiry, nextWeek))
          : undefined
  );
}

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
    findByIdPublic: db.query.client
      .findFirst({
        where: eq(client.id, sql.placeholder('id')),
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        extras: {
          hasPreSharedKey: sql<number>`${client.preSharedKey} IS NOT NULL`.as(
            'has_pre_shared_key'
          ),
        },
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
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  /**
   * Never return values directly from this function. Use {@link getAllPublic} instead.
   */
  async getAll() {
    const result = await this.#statements.findAll.execute();
    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Returns all clients without sensitive data
   */
  async getAllPublic() {
    const result = await this.#db.query.client
      .findMany({
        with: {
          oneTimeLink: true,
        },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        orderBy: (t, { asc }) => asc(t.name),
      })
      .execute();

    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Counts and pages the same filtered, permission-scoped snapshot.
   */
  async getPage(
    query: ClientQueryType,
    userId?: ID,
    onlinePublicKeys: string[] = [],
    now = Date.now()
  ) {
    const where = and(
      userId === undefined ? undefined : eq(client.userId, userId),
      clientFilter(query, onlinePublicKeys, now)
    );
    return this.#db.transaction(async (tx) => {
      const total = await tx.$count(client, where);
      const page = Math.min(
        query.page,
        Math.max(1, Math.ceil(total / query.pageSize))
      );
      const result = await tx.query.client.findMany({
        where,
        with: { oneTimeLink: true },
        columns: {
          privateKey: false,
          preSharedKey: false,
        },
        orderBy: (t, { asc, desc }) => {
          const order = query.sort === 'desc' ? desc : asc;
          if (query.sortBy === 'createdAt') {
            return [order(sql`julianday(${t.createdAt})`), order(t.id)];
          }
          if (query.sortBy === 'expiresAt') {
            // Keep permanent clients last in either direction.
            return [
              asc(isNull(t.expiresAt)),
              order(sql`julianday(${t.expiresAt})`),
              order(t.id),
            ];
          }
          if (query.sortBy === 'ipv4Address') {
            // Compare numeric octets, so .2 sorts before .10.
            const octets = [0, 1, 2, 3].map((index) =>
              order(
                sql`json_extract('[' || replace(${t.ipv4Address}, '.', ',') || ']', ${`$[${index}]`})`
              )
            );
            return [...octets, order(t.id)];
          }
          return [order(t.name), order(t.id)];
        },
        limit: query.pageSize,
        offset: (page - 1) * query.pageSize,
      });

      return {
        clients: result.map((row) => ({
          ...row,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        })),
        total,
        page,
        pageSize: query.pageSize,
      };
    });
  }

  /**
   * Includes WireGuard secrets. JSON API responses should use {@link getPublic}.
   */
  get(id: ID) {
    return this.#statements.findById.execute({ id });
  }

  /**
   * Returns one client without sensitive data
   */
  async getPublic(id: ID) {
    const result = await this.#statements.findByIdPublic.execute({ id });
    if (!result) return undefined;

    return { ...result, hasPreSharedKey: Boolean(result.hasPreSharedKey) };
  }

  async create({ name, expiresAt }: ClientCreateType) {
    const privateKey = await wg.generatePrivateKey();
    const publicKey = await wg.getPublicKey(privateKey);

    return this.#db.transaction(async (tx) => {
      const clients = await tx.query.client.findMany().execute();
      const clientInterface = await tx.query.wgInterface
        .findFirst({
          where: eq(wgInterface.name, WG_ENV.WG_INTERFACE),
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

      const preSharedKey = clientConfig.defaultGeneratePreSharedKey
        ? await wg.generatePreSharedKey()
        : null;

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
          interfaceId: WG_ENV.WG_INTERFACE,
          expiresAt,
          privateKey,
          publicKey,
          preSharedKey: preSharedKey || null,
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
    return this.#statements.toggle.execute({ id, enabled });
  }

  delete(id: ID) {
    return this.#statements.delete.execute({ id });
  }

  async bulkAction(
    { action, clientIds }: ClientBulkType,
    validate: (
      clients: Pick<ClientType, 'id' | 'userId' | 'expiresAt'>[]
    ) => void
  ) {
    // Validate the entire batch and write against the same snapshot.
    return this.#db.transaction(async (tx) => {
      const where = inArray(client.id, clientIds);
      const clients = await tx.query.client.findMany({
        where,
        columns: { id: true, userId: true, expiresAt: true },
      });
      validate(clients);

      if (action === 'delete') {
        await tx.delete(client).where(where);
      } else {
        await tx
          .update(client)
          .set({ enabled: action === 'enable' })
          .where(where);
      }
      return clients.length;
    });
  }

  removePreSharedKey(id: ID) {
    return this.#db
      .update(client)
      .set({ preSharedKey: null })
      .where(eq(client.id, id))
      .execute();
  }

  async rotatePreSharedKey(id: ID) {
    const preSharedKey = await wg.generatePreSharedKey();
    if (!preSharedKey) {
      throw new Error('Failed to generate preshared key');
    }

    await this.#db
      .update(client)
      .set({ preSharedKey })
      .where(eq(client.id, id))
      .execute();
  }

  async rotateKeyPair(id: ID) {
    const privateKey = await wg.generatePrivateKey();
    const publicKey = await wg.getPublicKey(privateKey);

    await this.#db
      .update(client)
      .set({ privateKey, publicKey })
      .where(eq(client.id, id))
      .execute();
  }

  update(id: ID, data: UpdateClientType) {
    return this.#db.transaction(async (tx) => {
      const clientInterface = await tx.query.wgInterface
        .findFirst({
          where: eq(wgInterface.name, WG_ENV.WG_INTERFACE),
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
        interfaceId: WG_ENV.WG_INTERFACE,
        privateKey,
        publicKey,
        preSharedKey: preSharedKey || null,
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
