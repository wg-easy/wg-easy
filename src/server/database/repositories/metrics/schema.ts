import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { wgInterface } from '../../schema';

export const prometheus = sqliteTable('prometheus_table', {
  id: text()
    .primaryKey()
    .references(() => wgInterface.name, {
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
