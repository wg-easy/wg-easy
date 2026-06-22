import { relations } from 'drizzle-orm';
import { int, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { client } from '../client/schema';

export const trafficState = sqliteTable('client_traffic_state_table', {
  clientId: int('client_id')
    .primaryKey()
    .references(() => client.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  transferRx: int('transfer_rx').notNull().default(0),
  transferTx: int('transfer_tx').notNull().default(0),
});

export const trafficUsage = sqliteTable(
  'client_traffic_usage_table',
  {
    clientId: int('client_id')
      .notNull()
      .references(() => client.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    date: text().notNull(),
    receivedBytes: int('received_bytes').notNull().default(0),
    sentBytes: int('sent_bytes').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.clientId, table.date] })]
);

export const trafficStateRelations = relations(trafficState, ({ one }) => ({
  client: one(client, {
    fields: [trafficState.clientId],
    references: [client.id],
  }),
}));

export const trafficUsageRelations = relations(trafficUsage, ({ one }) => ({
  client: one(client, {
    fields: [trafficUsage.clientId],
    references: [client.id],
  }),
}));
