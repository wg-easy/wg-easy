import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { userConfig, hooks } from '../../schema';

// maybe support multiple interfaces in the future
export const wgInterface = sqliteTable('interfaces_table', {
  name: text().primaryKey(),
  device: text().notNull(),
  port: int().notNull().unique(),
  privateKey: text('private_key').notNull(),
  publicKey: text('public_key').notNull(),
  ipv4Cidr: text('ipv4_cidr').notNull(),
  ipv6Cidr: text('ipv6_cidr').notNull(),
  mtu: int().notNull(),
  jC: int('j_c').default(7),
  jMin: int('j_min').default(10),
  jMax: int('j_max').default(1000),
  s1: int().default(128),
  s2: int().default(56),
  s3: int(),
  s4: int(),
  h1: text(),
  h2: text(),
  h3: text(),
  h4: text(),
  i1: text(),
  i2: text(),
  i3: text(),
  i4: text(),
  i5: text(),
  // does nothing yet
  enabled: int({ mode: 'boolean' }).notNull(),
  // Enable per-client firewall filtering via iptables
  firewallEnabled: int('firewall_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
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
    fields: [wgInterface.name],
    references: [hooks.id],
  }),
  userConfig: one(userConfig, {
    fields: [wgInterface.name],
    references: [userConfig.id],
  }),
}));
