import { sql, relations } from 'drizzle-orm';
import {
  index,
  int,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

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

export const clientGroupMembership = sqliteTable(
  'client_group_memberships_table',
  {
    clientId: int('client_id')
      .notNull()
      .references(() => client.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    groupId: int('group_id')
      .notNull()
      .references(() => clientGroup.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    position: int().notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    primaryKey({
      name: 'client_group_memberships_table_client_group_pk',
      columns: [table.clientId, table.groupId],
    }),
    index('client_group_memberships_table_client_id_index').on(table.clientId),
    index('client_group_memberships_table_group_id_index').on(table.groupId),
    uniqueIndex('client_group_memberships_table_client_position_unique').on(
      table.clientId,
      table.position
    ),
  ]
);

export const clientGroupMembershipRelations = relations(
  clientGroupMembership,
  ({ one }) => ({
    client: one(client, {
      fields: [clientGroupMembership.clientId],
      references: [client.id],
    }),
    group: one(clientGroup, {
      fields: [clientGroupMembership.groupId],
      references: [clientGroup.id],
    }),
  })
);

export const clientGroupRelations = relations(clientGroup, ({ many }) => ({
  memberships: many(clientGroupMembership),
}));
