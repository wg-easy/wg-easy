CREATE TABLE `quota_client_counters_table` (
	`client_id` integer PRIMARY KEY NOT NULL,
	`previous_rx_bytes` integer DEFAULT 0 NOT NULL,
	`previous_tx_bytes` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients_table`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quotas_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`enabled` integer NOT NULL,
	`mode` text NOT NULL,
	`rx_bytes` integer,
	`tx_bytes` integer,
	`total_bytes` integer,
	`used_rx_bytes` integer DEFAULT 0 NOT NULL,
	`used_tx_bytes` integer DEFAULT 0 NOT NULL,
	`exceeded_at` text,
	`reset_frequency` text NOT NULL,
	`reset_time` text,
	`reset_weekday` integer,
	`reset_day` integer,
	`reset_timezone` text,
	`last_reset_at` text,
	`next_reset_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quota_name_unique` ON `quotas_table` (`name`);--> statement-breakpoint
ALTER TABLE `clients_table` ADD `quota_id` integer REFERENCES quotas_table(id) ON UPDATE cascade ON DELETE set null;
