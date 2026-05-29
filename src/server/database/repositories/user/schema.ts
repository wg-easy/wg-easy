import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { client } from '../../schema';

export const user = sqliteTable(
  'users_table',
  {
    id: int().primaryKey({ autoIncrement: true }),
    username: text().notNull().unique(),
    /** `password == null` means password login disabled */
    password: text(),
    email: text(),
    name: text().notNull(),
    role: int().$type<Role>().notNull(),
    totpKey: text('totp_key'),
    totpVerified: int('totp_verified', { mode: 'boolean' }).notNull(),
    enabled: int({ mode: 'boolean' }).notNull(),
    oauthProvider: text('oauth_provider').$type<OAUTH_PROVIDER>(),
    oauthId: text('oauth_id'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('oauth_provider_id_unique').on(
      table.oauthProvider,
      table.oauthId
    ),
  ]
);

export const usersRelations = relations(user, ({ many }) => ({
  clients: many(client),
}));
