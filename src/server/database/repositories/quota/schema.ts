import { sql } from 'drizzle-orm';
import { int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const quota = sqliteTable(
  'quotas_table',
  {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    enabled: int({ mode: 'boolean' }).notNull(),
    mode: text().$type<'RX' | 'TX' | 'TOTAL' | 'SEPARATE'>().notNull(),
    rxBytes: int('rx_bytes'),
    txBytes: int('tx_bytes'),
    totalBytes: int('total_bytes'),
    usedRxBytes: int('used_rx_bytes').default(0).notNull(),
    usedTxBytes: int('used_tx_bytes').default(0).notNull(),
    exceededAt: text('exceeded_at'),
    resetFrequency: text('reset_frequency')
      .$type<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>()
      .notNull(),
    resetTime: text('reset_time'),
    resetWeekday: int('reset_weekday'),
    resetDay: int('reset_day'),
    resetTimezone: text('reset_timezone'),
    lastResetAt: text('last_reset_at'),
    nextResetAt: text('next_reset_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [uniqueIndex('quota_name_unique').on(table.name)]
);
