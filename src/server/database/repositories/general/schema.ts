import { sql } from 'drizzle-orm';
import { sqliteTable, text, int } from 'drizzle-orm/sqlite-core';

export const general = sqliteTable('general_table', {
  id: int().primaryKey({ autoIncrement: false }).default(1),

  setupStep: int().notNull(),

  sessionPassword: text('session_password').notNull(),
  sessionTimeout: int('session_timeout').notNull(),

  metricsPrometheus: int({ mode: 'boolean' }).notNull(),
  metricsJson: int({ mode: 'boolean' }).notNull(),
  metricsPassword: text(),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
