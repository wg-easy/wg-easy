CREATE TABLE `client_groups_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`allowed_ips` text,
	`dns` text,
	`firewall_ips` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_groups_table_name_unique` ON `client_groups_table` (`name`);--> statement-breakpoint
ALTER TABLE `clients_table` ADD `group_id` integer REFERENCES `client_groups_table`(`id`) ON UPDATE cascade ON DELETE set null;--> statement-breakpoint
CREATE INDEX `clients_table_group_id_index` ON `clients_table` (`group_id`);
