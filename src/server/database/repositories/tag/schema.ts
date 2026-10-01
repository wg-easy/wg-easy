import { sql, relations } from 'drizzle-orm';
import { int, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

import { client } from '../client/schema';

export const tag = sqliteTable('tags_table', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  description: text(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const clientTag = sqliteTable(
  'client_tags_table',
  {
    clientId: int('client_id')
      .notNull()
      .references(() => client.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    tagId: int('tag_id')
      .notNull()
      .references(() => tag.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [primaryKey({ columns: [table.clientId, table.tagId] })]
);

export const tagRelations = relations(tag, ({ many }) => ({
  clientTags: many(clientTag),
}));

export const clientTagRelations = relations(clientTag, ({ one }) => ({
  client: one(client, {
    fields: [clientTag.clientId],
    references: [client.id],
  }),
  tag: one(tag, {
    fields: [clientTag.tagId],
    references: [tag.id],
  }),
}));
