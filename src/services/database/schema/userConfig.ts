import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { wgInterface } from './interface';

// default* means clients store it themselves
export const userConfig = sqliteTable('user_config_table', {
  id: int()
    .primaryKey({ autoIncrement: true })
    .references(() => wgInterface.id),
  defaultMtu: int('default_mtu').notNull(),
  defaultPersistentKeepalive: int('default_persistent_keepalive').notNull(),
  defaultDns: text('default_dns', { mode: 'json' }).notNull(),
  defaultAllowedIps: text('default_allowed_ips', { mode: 'json' }).notNull(),
  host: text().notNull(),
  port: int().notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
