import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { userConfig } from './userConfig';
import { hooks } from './hooks';
import { prometheus } from './metrics';

// maybe support multiple interfaces in the future
export const wgInterface = sqliteTable('interface_table', {
  id: int().primaryKey({ autoIncrement: true }),
  device: text().notNull().unique(),
  port: int().notNull().unique(),
  privateKey: text('private_key').notNull(),
  publicKey: text('public_key').notNull(),
  ipv4Cidr: text('ipv4_cidr').notNull(),
  ipv6Cidr: text('ipv6_cidr').notNull(),
  mtu: int().notNull(),
  enabled: int({ mode: 'boolean' }).notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const wgInterfaceRelations = relations(wgInterface, ({ one }) => ({
  hooks: one(hooks, {
    fields: [wgInterface.id],
    references: [hooks.id],
  }),
  prometheus: one(prometheus, {
    fields: [wgInterface.id],
    references: [prometheus.id],
  }),
  userConfig: one(userConfig, {
    fields: [wgInterface.id],
    references: [userConfig.id],
  }),
}));
