import { and, asc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { client } from '../client/schema';
import type { ClientType } from '../client/types';

import { trafficState, trafficUsage } from './schema';
import type { TrafficPeer, TrafficQueryType, TrafficReport } from './types';

import type { DBType } from '#db/sqlite';
import type { ID } from '#server/utils/types';
import {
  calculateTrafficDelta,
  getExceededTrafficQuotas,
  getTrafficPeriodRange,
  sumTrafficDays,
  type TrafficDay,
} from '#server/utils/traffic';
import { formatUtcDate, parseUtcDate } from '#shared/utils/time';
import type { TrafficPeriod } from '#shared/utils/traffic';

type QuotaClient = Pick<
  ClientType,
  'id' | 'enabled' | 'dailyQuota' | 'weeklyQuota' | 'monthlyQuota'
>;

const quotaField = {
  daily: 'dailyQuota',
  weekly: 'weeklyQuota',
  monthly: 'monthlyQuota',
} as const satisfies Record<TrafficPeriod, keyof QuotaClient>;

function quotaRanges(date: Date) {
  return {
    daily: getTrafficPeriodRange('daily', date),
    weekly: getTrafficPeriodRange('weekly', date),
    monthly: getTrafficPeriodRange('monthly', date),
  };
}

async function getRelevantDays(
  db: Pick<DBType, 'select'>,
  clientId: ID,
  date: Date
): Promise<TrafficDay[]> {
  const ranges = Object.values(quotaRanges(date));
  const start = ranges.map((range) => range.start).sort()[0]!;
  const endExclusive = ranges
    .map((range) => range.endExclusive)
    .sort()
    .at(-1)!;

  return db
    .select({
      date: trafficUsage.date,
      receivedBytes: trafficUsage.receivedBytes,
      sentBytes: trafficUsage.sentBytes,
    })
    .from(trafficUsage)
    .where(
      and(
        eq(trafficUsage.clientId, clientId),
        gte(trafficUsage.date, start),
        lt(trafficUsage.date, endExclusive)
      )
    )
    .execute();
}

export class TrafficService {
  #db: DBType;

  constructor(db: DBType) {
    this.#db = db;
  }

  async record(peers: TrafficPeer[], now = new Date()) {
    const peersByPublicKey = new Map(
      peers.map((peer) => [peer.publicKey, peer])
    );
    const date = formatUtcDate(now);

    return this.#db.transaction(async (tx) => {
      const clients = await tx
        .select({
          id: client.id,
          publicKey: client.publicKey,
          enabled: client.enabled,
          dailyQuota: client.dailyQuota,
          weeklyQuota: client.weeklyQuota,
          monthlyQuota: client.monthlyQuota,
        })
        .from(client)
        .execute();
      const states = await tx.select().from(trafficState).execute();
      const statesByClientId = new Map(
        states.map((state) => [state.clientId, state])
      );

      for (const clientRow of clients) {
        const peer = peersByPublicKey.get(clientRow.publicKey);
        const state = statesByClientId.get(clientRow.id);
        const transferRx = peer?.transferRx ?? 0;
        const transferTx = peer?.transferTx ?? 0;
        const receivedBytes = peer
          ? calculateTrafficDelta(state?.transferRx ?? 0, transferRx)
          : 0;
        const sentBytes = peer
          ? calculateTrafficDelta(state?.transferTx ?? 0, transferTx)
          : 0;

        if (receivedBytes > 0 || sentBytes > 0) {
          await tx
            .insert(trafficUsage)
            .values({
              clientId: clientRow.id,
              date,
              receivedBytes,
              sentBytes,
            })
            .onConflictDoUpdate({
              target: [trafficUsage.clientId, trafficUsage.date],
              set: {
                receivedBytes: sql`${trafficUsage.receivedBytes} + ${receivedBytes}`,
                sentBytes: sql`${trafficUsage.sentBytes} + ${sentBytes}`,
              },
            })
            .execute();
        }

        await tx
          .insert(trafficState)
          .values({ clientId: clientRow.id, transferRx, transferTx })
          .onConflictDoUpdate({
            target: trafficState.clientId,
            set: { transferRx, transferTx },
          })
          .execute();
      }

      const disabledClientIds: ID[] = [];
      for (const clientRow of clients) {
        if (
          !clientRow.enabled ||
          (clientRow.dailyQuota === null &&
            clientRow.weeklyQuota === null &&
            clientRow.monthlyQuota === null)
        ) {
          continue;
        }

        const days = await getRelevantDays(tx, clientRow.id, now);
        if (getExceededTrafficQuotas(clientRow, days, now).length > 0) {
          disabledClientIds.push(clientRow.id);
        }
      }

      if (disabledClientIds.length > 0) {
        await tx
          .update(client)
          .set({ enabled: false })
          .where(inArray(client.id, disabledClientIds))
          .execute();
      }

      return disabledClientIds;
    });
  }

  resetBaselines() {
    return this.#db
      .update(trafficState)
      .set({ transferRx: 0, transferTx: 0 })
      .execute();
  }

  async getExceededQuotas(clientId: ID, now = new Date()) {
    const clientRow = await this.#db.query.client.findFirst({
      where: eq(client.id, clientId),
      columns: {
        id: true,
        enabled: true,
        dailyQuota: true,
        weeklyQuota: true,
        monthlyQuota: true,
      },
    });
    if (!clientRow) {
      return [];
    }

    const days = await getRelevantDays(this.#db, clientId, now);
    return getExceededTrafficQuotas(clientRow, days, now);
  }

  async getReport(
    clientRow: Pick<
      ClientType,
      'id' | 'dailyQuota' | 'weeklyQuota' | 'monthlyQuota'
    >,
    { period, date }: TrafficQueryType
  ): Promise<TrafficReport> {
    const containingDate = date ? parseUtcDate(date)! : new Date();
    const range = getTrafficPeriodRange(period, containingDate);
    const days = await this.#db
      .select({
        date: trafficUsage.date,
        receivedBytes: trafficUsage.receivedBytes,
        sentBytes: trafficUsage.sentBytes,
      })
      .from(trafficUsage)
      .where(
        and(
          eq(trafficUsage.clientId, clientRow.id),
          gte(trafficUsage.date, range.start),
          lt(trafficUsage.date, range.endExclusive)
        )
      )
      .orderBy(asc(trafficUsage.date))
      .execute();
    const usage = sumTrafficDays(days, range);
    const quotaBytes = clientRow[quotaField[period]];
    const totalBytes = usage.receivedBytes + usage.sentBytes;

    return {
      period,
      start: range.start,
      endExclusive: range.endExclusive,
      quotaBytes,
      receivedBytes: usage.receivedBytes,
      sentBytes: usage.sentBytes,
      totalBytes,
      exceeded: quotaBytes !== null && totalBytes >= quotaBytes,
      days: days.map((day) => ({
        ...day,
        totalBytes: day.receivedBytes + day.sentBytes,
      })),
    };
  }
}
