import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { wgInterface } from '../../schema';

export const prometheus = sqliteTable('prometheus_table', {
  id: int()
    .primaryKey({ autoIncrement: true })
    .references(() => wgInterface.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  password: text().notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
