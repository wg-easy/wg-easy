import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { userConfig, hooks } from '../../schema';

// H1/H2/H3/H4 — must be unique among each other; recommended range is from 5 to 2147483647 inclusive
const generateRandomHeaderValue = () =>
  Math.floor(Math.random() * 2147483642) + 5;

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
  i1: text(),
  i2: text(),
  i3: text(),
  i4: text(),
  h1: int().$defaultFn(generateRandomHeaderValue),
  h2: int().$defaultFn(generateRandomHeaderValue),
  h3: int().$defaultFn(generateRandomHeaderValue),
  h4: int().$defaultFn(generateRandomHeaderValue),
  // does nothing yet
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
    fields: [wgInterface.name],
    references: [hooks.id],
  }),
  userConfig: one(userConfig, {
    fields: [wgInterface.name],
    references: [userConfig.id],
  }),
}));
