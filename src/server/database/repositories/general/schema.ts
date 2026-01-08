import { sql } from 'drizzle-orm';
import { sqliteTable, text, int } from 'drizzle-orm/sqlite-core';

export const general = sqliteTable('general_table', {
  id: int().primaryKey({ autoIncrement: false }).default(1),

  setupStep: int('setup_step').notNull(),

  sessionPassword: text('session_password').notNull(),
  sessionTimeout: int('session_timeout').notNull(),

  metricsPrometheus: int('metrics_prometheus', { mode: 'boolean' }).notNull(),
  metricsJson: int('metrics_json', { mode: 'boolean' }).notNull(),
  metricsPassword: text('metrics_password'),

  bandwidthEnabled: int('bandwidth_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  downloadLimitMbps: int('download_limit_mbps').notNull().default(0),
  uploadLimitMbps: int('upload_limit_mbps').notNull().default(0),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
