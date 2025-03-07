import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { client } from '../../schema';

export const oneTimeLink = sqliteTable('one_time_links_table', {
  /** same as `client.id` */
  id: int()
    .primaryKey()
    .references(() => client.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  oneTimeLink: text('one_time_link').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const oneTimeLinksRelations = relations(oneTimeLink, ({ one }) => ({
  client: one(client, {
    fields: [oneTimeLink.id],
    references: [client.id],
  }),
}));
