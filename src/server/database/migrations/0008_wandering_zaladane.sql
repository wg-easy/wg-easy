CREATE TABLE `groups_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_table_name_unique` ON `groups_table` (`name`);--> statement-breakpoint
ALTER TABLE `clients_table` ADD `group_id` integer REFERENCES groups_table(id);