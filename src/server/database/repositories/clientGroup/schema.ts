import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { client } from '../client/schema';

export const clientGroup = sqliteTable(
  'client_groups_table',
  {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    description: text(),
    allowedIps: text('allowed_ips', { mode: 'json' }).$type<string[]>(),
    dns: text({ mode: 'json' }).$type<string[]>(),
    firewallIps: text('firewall_ips', { mode: 'json' }).$type<
      string[] | null
    >(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [uniqueIndex('client_groups_table_name_unique').on(table.name)]
);

export const clientGroupRelations = relations(clientGroup, ({ many }) => ({
  clients: many(client),
}));
