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

import { client } from './schema';

import type { ClientQueryType } from '#shared/contracts/client';
import type { DBExecutor } from '#db/types';

const publicColumns = { privateKey: false, preSharedKey: false } as const;

function withTimestamps<T extends { createdAt: string; updatedAt: string }>(
  row: T
) {
  const { createdAt, updatedAt, ...fields } = row;
  return {
    ...fields,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
  };
}

function clientFilter(
  query: ClientQueryType,
  onlinePublicKeys: string[],
  now: number
) {
  const filter = query.filter?.trim();
  const pattern = filter ? `%${filter.toLowerCase()}%` : undefined;
  const expiry = sql`julianday(${client.expiresAt})`;
  const today = sql`julianday(${new Date(now).toISOString()})`;
  const nextWeek = sql`julianday(${new Date(now + 7 * 86400000).toISOString()})`;
  const statusFilters = {
    all: undefined,
    enabled: eq(client.enabled, true),
    disabled: eq(client.enabled, false),
    online: and(
      eq(client.enabled, true),
      inArray(client.publicKey, onlinePublicKeys)
    ),
    offline: and(
      eq(client.enabled, true),
      notInArray(client.publicKey, onlinePublicKeys)
    ),
  };
  const expiryFilters = {
    all: undefined,
    permanent: isNull(client.expiresAt),
    expired: lte(expiry, today),
    expiring: and(gt(expiry, today), lte(expiry, nextWeek)),
  };

  return and(
    pattern === undefined
      ? undefined
      : or(
          like(client.name, pattern),
          like(client.ipv4Address, pattern),
          like(client.ipv6Address, pattern)
        ),
    statusFilters[query.status ?? 'all'],
    expiryFilters[query.expiry ?? 'all']
  );
}

export class ClientRepository {
  constructor(private readonly db: DBExecutor) {}

  /**
   * Never return values directly from this function. Use {@link getAllPublic} instead.
   */
  async getAll() {
    const result = await this.db.query.client.findMany({
      with: { oneTimeLink: true },
    });
    return result.map(withTimestamps);
  }

  /**
   * Returns all clients without sensitive data
   */
  async getAllPublic() {
    const result = await this.db.query.client.findMany({
      with: { oneTimeLink: true },
      columns: publicColumns,
      orderBy: (t, { asc }) => asc(t.name),
    });

    return result.map(withTimestamps);
  }

  /**
   * Counts and pages the same filtered, permission-scoped snapshot.
   */
  async getPage(
    query: ClientQueryType,
    userId?: number,
    onlinePublicKeys: string[] = [],
    now = Date.now()
  ) {
    const where = and(
      userId === undefined ? undefined : eq(client.userId, userId),
      clientFilter(query, onlinePublicKeys, now)
    );
    return this.db.transaction(async (tx) => {
      const total = await tx.$count(client, where);
      const page = Math.min(
        query.page,
        Math.max(1, Math.ceil(total / query.pageSize))
      );
      const result = await tx.query.client.findMany({
        where,
        with: { oneTimeLink: true },
        columns: publicColumns,
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
        clients: result.map(withTimestamps),
        total,
        page,
        pageSize: query.pageSize,
      };
    });
  }

  /**
   * Includes WireGuard secrets. JSON API responses should use {@link getPublic}.
   */
  async get(id: number) {
    return this.db.query.client.findFirst({ where: eq(client.id, id) });
  }

  /**
   * Returns one client without sensitive data
   */
  async getPublic(id: number) {
    const result = await this.db.query.client.findFirst({
      where: eq(client.id, id),
      columns: publicColumns,
      extras: {
        hasPreSharedKey: sql<number>`${client.preSharedKey} IS NOT NULL`.as(
          'has_pre_shared_key'
        ),
      },
    });
    if (!result) return undefined;

    return { ...result, hasPreSharedKey: Boolean(result.hasPreSharedKey) };
  }

  async insert(data: typeof client.$inferInsert) {
    return this.db
      .insert(client)
      .values(data)
      .returning({ clientId: client.id });
  }

  async findByIds(ids: number[]) {
    return this.db.query.client.findMany({
      where: inArray(client.id, ids),
      columns: { id: true, userId: true, expiresAt: true },
    });
  }

  async deleteMany(ids: number[]) {
    return this.db.delete(client).where(inArray(client.id, ids));
  }

  async setEnabled(ids: number[], enabled: boolean) {
    return this.db
      .update(client)
      .set({ enabled })
      .where(inArray(client.id, ids));
  }

  async update(id: number, data: Partial<typeof client.$inferInsert>) {
    return this.db.update(client).set(data).where(eq(client.id, id));
  }
}
