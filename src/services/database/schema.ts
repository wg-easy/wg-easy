import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users_table', {
  id: int().primaryKey({ autoIncrement: true }),
  username: text().notNull(),
  password: text().notNull(),
  email: text(),
  name: text().notNull(),
  role: int().notNull(),
  enabled: int().notNull().default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const clientsTable = sqliteTable('clients_table', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  ipv4Address: text('ipv4_address').notNull().unique(),
  ipv6Address: text('ipv6_address').notNull().unique(),
  privateKey: text('private_key').notNull(),
  publicKey: text('public_key').notNull(),
  preSharedKey: text('pre_shared_key').notNull(),
  expiresAt: text('expires_at'),
  allowedIps: text('allowed_ips', { mode: 'json' }).notNull(),
  serverAllowedIps: text('server_allowed_ips', { mode: 'json' }).notNull(),
  oneTimeLink: int('one_time_link').references(() => oneTimeLinksTable.id),
  persistentKeepalive: int('persistent_keepalive').notNull(),
  mtu: int().notNull(),
  dns: text({ mode: 'json' }).notNull(),
  enabled: int({ mode: 'boolean' }).notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const oneTimeLinksTable = sqliteTable('one_time_links_table', {
  id: int().primaryKey({ autoIncrement: true }),
  oneTimeLink: text('one_time_link').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

// maybe support multiple interfaces in the future
export const interfaceTable = sqliteTable('interface_table', {
  id: int().primaryKey({ autoIncrement: true }),
  device: text().notNull(),
  port: int().notNull(),
  privateKey: text('private_key').notNull(),
  publicKey: text('public_key').notNull(),
  ipv4Cidr: text('ipv4_cidr').notNull(),
  ipv6Cidr: text('ipv6_cidr').notNull(),
  mtu: int().notNull(),
  enabled: int({ mode: 'boolean' }).notNull(),
});

// default* means clients store it themselves
export const userConfigTable = sqliteTable('user_config_table', {
  id: int()
    .primaryKey({ autoIncrement: true })
    .references(() => interfaceTable.id),
  defaultMtu: int('default_mtu').notNull(),
  defaultPersistentKeepalive: int('default_persistent_keepalive').notNull(),
  defaultDns: text('default_dns', { mode: 'json' }).notNull(),
  defaultAllowedIps: text('default_allowed_ips', { mode: 'json' }).notNull(),
  host: text().notNull(),
  port: int().notNull(),
});

export const hooksTable = sqliteTable('hooks_table', {
  id: int()
    .primaryKey({ autoIncrement: true })
    .references(() => interfaceTable.id),
  preUp: text('pre_up').notNull(),
  postUp: text('post_up').notNull(),
  preDown: text('pre_down').notNull(),
  postDown: text('post_down').notNull(),
});

export const prometheusTable = sqliteTable('prometheus_table', {
  id: int()
    .primaryKey({ autoIncrement: true })
    .references(() => interfaceTable.id),
  password: text().notNull(),
});

export const generalTable = sqliteTable('general_table', {
  id: int().primaryKey({ autoIncrement: true }),
  sessionTimeout: int('session_timeout').notNull(),
});
