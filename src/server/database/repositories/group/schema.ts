import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { client } from '../client/schema';

export const group = sqliteTable('groups_table', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  // Optional hex color used to render the group badge in the UI
  color: text(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const groupsRelations = relations(group, ({ many }) => ({
  clients: many(client),
}));
