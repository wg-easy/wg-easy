import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tcState = sqliteTable('tc_state_table', {
  id: int().primaryKey({ autoIncrement: false }).default(1),

  totalUlRate: int('total_ul_rate').notNull().default(100),
  defaultClassId: int('default_class_id').notNull().default(211), // 2{ulRate} convention: 211 means ulRate=11

  /** JSON array of { id: number, ulRate: number, clientIps: string[] } */
  classes: text({ mode: 'json' }).$type<TcClass[]>().notNull().default([]),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export type TcClass = {
  id: number;
  ulRate: number;
  clientIps: string[];
};