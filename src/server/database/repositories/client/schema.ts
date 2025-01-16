import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { oneTimeLink } from '../../schema';

export const client = sqliteTable('clients_table', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  ipv4Address: text('ipv4_address').notNull().unique(),
  ipv6Address: text('ipv6_address').notNull().unique(),
  privateKey: text('private_key').notNull(),
  publicKey: text('public_key').notNull(),
  preSharedKey: text('pre_shared_key').notNull(),
  expiresAt: text('expires_at'),
  allowedIps: text('allowed_ips', { mode: 'json' }).$type<string[]>().notNull(),
  serverAllowedIps: text('server_allowed_ips', { mode: 'json' })
    .$type<string[]>()
    .notNull(),
  persistentKeepalive: int('persistent_keepalive').notNull(),
  mtu: int().notNull(),
  dns: text({ mode: 'json' }).$type<string[]>().notNull(),
  enabled: int({ mode: 'boolean' }).notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const clientsRelations = relations(client, ({ one }) => ({
  oneTimeLink: one(oneTimeLink, {
    fields: [client.id],
    references: [oneTimeLink.clientId],
  }),
}));
