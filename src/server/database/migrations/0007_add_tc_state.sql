CREATE TABLE `tc_state_table` (
  `id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
  `total_ul_rate` integer NOT NULL DEFAULT 100,
  `default_class_id` integer NOT NULL DEFAULT 21,
  `classes` text NOT NULL DEFAULT '[]',
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);