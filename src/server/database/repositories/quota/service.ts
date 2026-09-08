import { and, eq, inArray, ne, sql } from 'drizzle-orm';

import { quota } from './schema';
import {
  quotaLimitFromRow,
  quotaResetFromRow,
  type QuotaInput,
  type QuotaPublic,
  type QuotaType,
} from './types';

import { client, quotaClientCounter } from '#db/repositories/client/schema';
import type { DBType } from '#db/sqlite';
import type { ID } from '#server/utils/types';
import { getNextResetAt, isQuotaExceeded } from '#server/utils/quota';

const COUNTER_UPSERT_BATCH_SIZE = 1_000;

type QuotaTransaction = Parameters<Parameters<DBType['transaction']>[0]>[0];
type ClientCounterSnapshot = {
  clientId: ID;
  previousRxBytes: number;
  previousTxBytes: number;
};

async function upsertClientCounters(
  tx: QuotaTransaction,
  snapshots: ClientCounterSnapshot[]
) {
  for (
    let offset = 0;
    offset < snapshots.length;
    offset += COUNTER_UPSERT_BATCH_SIZE
  ) {
    await tx
      .insert(quotaClientCounter)
      .values(snapshots.slice(offset, offset + COUNTER_UPSERT_BATCH_SIZE))
      .onConflictDoUpdate({
        target: quotaClientCounter.clientId,
        set: {
          previousRxBytes: sql`excluded.${sql.identifier(quotaClientCounter.previousRxBytes.name)}`,
          previousTxBytes: sql`excluded.${sql.identifier(quotaClientCounter.previousTxBytes.name)}`,
        },
      });
  }
}

function inputToColumns(input: QuotaInput) {
  const limit = {
    mode: input.limit.mode,
    rxBytes:
      input.limit.mode === 'RX' || input.limit.mode === 'SEPARATE'
        ? input.limit.rxBytes
        : null,
    txBytes:
      input.limit.mode === 'TX' || input.limit.mode === 'SEPARATE'
        ? input.limit.txBytes
        : null,
    totalBytes: input.limit.mode === 'TOTAL' ? input.limit.totalBytes : null,
  };
  const reset = {
    resetFrequency: input.reset.frequency,
    resetTime: input.reset.frequency === 'NONE' ? null : input.reset.time,
    resetTimezone:
      input.reset.frequency === 'NONE' ? null : input.reset.timezone,
    resetWeekday:
      input.reset.frequency === 'WEEKLY' ? input.reset.weekday : null,
    resetDay: input.reset.frequency === 'MONTHLY' ? input.reset.day : null,
    nextResetAt: getNextResetAt(input.reset)?.toISOString() ?? null,
  };

  return { name: input.name, enabled: input.enabled, ...limit, ...reset };
}

function toPublic(row: QuotaType, clientIds: number[]): QuotaPublic {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    limit: quotaLimitFromRow(row),
    reset: quotaResetFromRow(row),
    clientIds,
    clientCount: clientIds.length,
    usedRxBytes: row.usedRxBytes,
    usedTxBytes: row.usedTxBytes,
    exceededAt: row.exceededAt,
    lastResetAt: row.lastResetAt,
    nextResetAt: row.nextResetAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class QuotaService {
  constructor(private readonly db: DBType) {}

  async getAll(): Promise<QuotaPublic[]> {
    const rows = await this.db.query.quota.findMany({
      orderBy: (table, { asc }) => asc(table.name),
    });
    const assignments = await this.db
      .select({ id: client.id, quotaId: client.quotaId })
      .from(client)
      .where(sql`${client.quotaId} is not null`);
    const clientIdsByQuota = new Map<number, number[]>();
    for (const assignment of assignments) {
      if (assignment.quotaId === null) continue;
      const clientIds = clientIdsByQuota.get(assignment.quotaId) ?? [];
      clientIds.push(assignment.id);
      clientIdsByQuota.set(assignment.quotaId, clientIds);
    }

    return rows.map((row) => toPublic(row, clientIdsByQuota.get(row.id) ?? []));
  }

  async get(id: ID): Promise<QuotaPublic | undefined> {
    const row = await this.db.query.quota.findFirst({
      where: eq(quota.id, id),
    });
    if (!row) return undefined;

    const assignments = await this.db
      .select({ id: client.id })
      .from(client)
      .where(eq(client.quotaId, id));
    return toPublic(
      row,
      assignments.map((assignment) => assignment.id)
    );
  }

  async create(input: QuotaInput) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(quota)
        .values(inputToColumns(input))
        .returning({ id: quota.id });
      await this.assignClients(tx, created!.id, input.clientIds);
      return created!.id;
    });
  }

  async update(id: ID, input: QuotaInput) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(quota).where(eq(quota.id, id));
      if (!current) return false;

      const columns = inputToColumns(input);
      const exceeded = isQuotaExceeded(input.limit, {
        rxBytes: current.usedRxBytes,
        txBytes: current.usedTxBytes,
      });
      await tx
        .update(quota)
        .set({
          ...columns,
          exceededAt:
            input.enabled && exceeded
              ? (current.exceededAt ?? new Date().toISOString())
              : null,
        })
        .where(eq(quota.id, id));
      await this.assignClients(tx, id, input.clientIds);
      return true;
    });
  }

  async delete(id: ID) {
    return this.db.transaction(async (tx) => {
      await tx
        .update(client)
        .set({ quotaId: null })
        .where(eq(client.quotaId, id));
      const result = await tx.delete(quota).where(eq(quota.id, id)).returning();
      return result.length > 0;
    });
  }

  async assignClient(clientId: ID, quotaId: ID | null) {
    return this.db.transaction(async (tx) => {
      if (quotaId !== null) {
        const [existingQuota] = await tx
          .select({ id: quota.id })
          .from(quota)
          .where(eq(quota.id, quotaId));
        if (!existingQuota) return 'quota-not-found' as const;
      }

      const [updated] = await tx
        .update(client)
        .set({ quotaId })
        .where(eq(client.id, clientId))
        .returning({ id: client.id });
      return updated ? ('assigned' as const) : ('client-not-found' as const);
    });
  }

  async reset(id: ID, now = new Date()) {
    const row = await this.db.query.quota.findFirst({
      where: eq(quota.id, id),
    });
    if (!row) return false;
    const nextResetAt = getNextResetAt(quotaResetFromRow(row), now);
    await this.db
      .update(quota)
      .set({
        usedRxBytes: 0,
        usedTxBytes: 0,
        exceededAt: null,
        lastResetAt: now.toISOString(),
        nextResetAt: nextResetAt?.toISOString() ?? null,
      })
      .where(eq(quota.id, id));
    return true;
  }

  async getDue(now = new Date()) {
    return this.db.query.quota.findMany({
      where: and(
        ne(quota.resetFrequency, 'NONE'),
        sql`${quota.nextResetAt} <= ${now.toISOString()}`
      ),
    });
  }

  async checkpointClientCounters(
    counters: readonly {
      publicKey: string;
      transferRx: number;
      transferTx: number;
    }[]
  ) {
    const clients = await this.db.query.client.findMany({
      columns: { id: true, publicKey: true },
    });
    const byPublicKey = new Map(
      counters.map((counter) => [counter.publicKey, counter])
    );
    const snapshots: ClientCounterSnapshot[] = [];
    for (const item of clients) {
      const counter = byPublicKey.get(item.publicKey);
      if (!counter) continue;
      snapshots.push({
        clientId: item.id,
        previousRxBytes: counter.transferRx,
        previousTxBytes: counter.transferTx,
      });
    }

    await this.db.transaction(async (tx) => {
      await upsertClientCounters(tx, snapshots);
    });
  }

  async collectClientCounters(
    counters: readonly {
      publicKey: string;
      transferRx: number;
      transferTx: number;
    }[]
  ) {
    const byPublicKey = new Map(
      counters.map((counter) => [counter.publicKey, counter])
    );
    return this.db.transaction(async (tx) => {
      const clients = await tx.query.client.findMany({
        where: sql`${client.quotaId} is not null`,
        with: { quotaCounter: true },
      });
      const increments = new Map<
        number,
        { rxBytes: number; txBytes: number }
      >();
      const snapshots: ClientCounterSnapshot[] = [];

      for (const item of clients) {
        const current = byPublicKey.get(item.publicKey);
        if (!current || item.quotaId === null) continue;
        const previous = item.quotaCounter;
        const rxBytes = previous
          ? current.transferRx >= previous.previousRxBytes
            ? current.transferRx - previous.previousRxBytes
            : current.transferRx
          : 0;
        const txBytes = previous
          ? current.transferTx >= previous.previousTxBytes
            ? current.transferTx - previous.previousTxBytes
            : current.transferTx
          : 0;
        const increment = increments.get(item.quotaId) ?? {
          rxBytes: 0,
          txBytes: 0,
        };
        increment.rxBytes += rxBytes;
        increment.txBytes += txBytes;
        increments.set(item.quotaId, increment);
        snapshots.push({
          clientId: item.id,
          previousRxBytes: current.transferRx,
          previousTxBytes: current.transferTx,
        });
      }
      await upsertClientCounters(tx, snapshots);

      let blockStateChanged = false;
      for (const [quotaId, increment] of increments) {
        if (increment.rxBytes === 0 && increment.txBytes === 0) continue;
        const [row] = await tx
          .select()
          .from(quota)
          .where(eq(quota.id, quotaId));
        if (!row) continue;

        const usedRxBytes = row.usedRxBytes + increment.rxBytes;
        const usedTxBytes = row.usedTxBytes + increment.txBytes;
        const exceeded =
          row.enabled &&
          isQuotaExceeded(quotaLimitFromRow(row), {
            rxBytes: usedRxBytes,
            txBytes: usedTxBytes,
          });
        const exceededAt = exceeded
          ? (row.exceededAt ?? new Date().toISOString())
          : null;
        await tx
          .update(quota)
          .set({ usedRxBytes, usedTxBytes, exceededAt })
          .where(eq(quota.id, quotaId));
        if (Boolean(row.exceededAt) !== exceeded) {
          blockStateChanged = true;
        }
      }
      return blockStateChanged;
    });
  }

  private async assignClients(
    tx: QuotaTransaction,
    quotaId: ID,
    clientIds: ID[]
  ) {
    await tx
      .update(client)
      .set({ quotaId: null })
      .where(eq(client.quotaId, quotaId));
    if (clientIds.length > 0) {
      const existingClients = await tx
        .select({ id: client.id })
        .from(client)
        .where(inArray(client.id, clientIds));
      if (existingClients.length !== clientIds.length) {
        throw new QuotaClientNotFoundError();
      }
      await tx
        .update(client)
        .set({ quotaId })
        .where(inArray(client.id, clientIds));
    }
  }
}

export class QuotaClientNotFoundError extends Error {
  constructor() {
    super('One or more quota clients do not exist');
    this.name = 'QuotaClientNotFoundError';
  }
}
