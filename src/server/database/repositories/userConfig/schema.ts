import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { wgInterface } from '../../schema';

// default* means clients store it themselves
export const userConfig = sqliteTable('user_configs_table', {
  /** same as `wgInterface.name` */
  id: text()
    .primaryKey()
    .references(() => wgInterface.name, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  defaultMtu: int('default_mtu').notNull(),
  defaultPersistentKeepalive: int('default_persistent_keepalive').notNull(),
  defaultDns: text('default_dns', { mode: 'json' }).$type<string[]>().notNull(),
  defaultAllowedIps: text('default_allowed_ips', { mode: 'json' })
    .$type<string[]>()
    .notNull(),
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
