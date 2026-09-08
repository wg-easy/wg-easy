import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { wgInterface } from '../interface/schema';
import { oneTimeLink } from '../oneTimeLink/schema';
import { quota } from '../quota/schema';
import { user } from '../user/schema';

/** null means use value from userConfig */

export const client = sqliteTable(
  'clients_table',
  {
    id: int().primaryKey({ autoIncrement: true }),
    userId: int('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    interfaceId: text('interface_id')
      .notNull()
      .references(() => wgInterface.name, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    quotaId: int('quota_id').references(() => quota.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    name: text().notNull(),
    ipv4Address: text('ipv4_address').notNull().unique(),
    ipv6Address: text('ipv6_address').notNull().unique(),
    preUp: text('pre_up').default('').notNull(),
    postUp: text('post_up').default('').notNull(),
    preDown: text('pre_down').default('').notNull(),
    postDown: text('post_down').default('').notNull(),
    privateKey: text('private_key').notNull(),
    publicKey: text('public_key').notNull(),
    preSharedKey: text('pre_shared_key').notNull(),
    expiresAt: text('expires_at'),
    allowedIps: text('allowed_ips', { mode: 'json' }).$type<string[]>(),
    serverAllowedIps: text('server_allowed_ips', { mode: 'json' })
      .$type<string[]>()
      .notNull(),
    // Firewall-enforced allowed IPs (null = use allowedIps)
    firewallIps: text('firewall_ips', { mode: 'json' }).$type<
      string[] | null
    >(),
    persistentKeepalive: int('persistent_keepalive').notNull(),
    mtu: int().notNull(),
    jC: int('j_c'),
    jMin: int('j_min'),
    jMax: int('j_max'),
    i1: text(),
    i2: text(),
    i3: text(),
    i4: text(),
    i5: text(),
    dns: text({ mode: 'json' }).$type<string[]>(),
    serverEndpoint: text('server_endpoint'),
    enabled: int({ mode: 'boolean' }).notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('public_key_interface_unique').on(
      table.publicKey,
      table.interfaceId
    ),
  ]
);

export const quotaClientCounter = sqliteTable('quota_client_counters_table', {
  clientId: int('client_id')
    .primaryKey()
    .references(() => client.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  previousRxBytes: int('previous_rx_bytes').default(0).notNull(),
  previousTxBytes: int('previous_tx_bytes').default(0).notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const clientsRelations = relations(client, ({ one }) => ({
  oneTimeLink: one(oneTimeLink, {
    fields: [client.id],
    references: [oneTimeLink.id],
  }),
  user: one(user, {
    fields: [client.userId],
    references: [user.id],
  }),
  interface: one(wgInterface, {
    fields: [client.interfaceId],
    references: [wgInterface.name],
  }),
  quota: one(quota, {
    fields: [client.quotaId],
    references: [quota.id],
  }),
  quotaCounter: one(quotaClientCounter, {
    fields: [client.id],
    references: [quotaClientCounter.clientId],
  }),
}));

export const quotaClientCounterRelations = relations(
  quotaClientCounter,
  ({ one }) => ({
    client: one(client, {
      fields: [quotaClientCounter.clientId],
      references: [client.id],
    }),
  })
);
