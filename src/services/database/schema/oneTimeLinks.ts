import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { clients } from './clients';

export const oneTimeLinks = sqliteTable('one_time_links_table', {
  id: int().primaryKey({ autoIncrement: true }),
  oneTimeLink: text('one_time_link').notNull(),
  expiresAt: text('expires_at').notNull(),
  clientId: int()
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const oneTimeLinksRelations = relations(oneTimeLinks, ({ one }) => ({
  client: one(clients, {
    fields: [oneTimeLinks.clientId],
    references: [clients.id],
  }),
}));
