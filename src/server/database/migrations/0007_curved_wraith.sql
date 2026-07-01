CREATE TABLE `client_traffic_state_table` (
	`client_id` integer PRIMARY KEY NOT NULL,
	`transfer_rx` integer DEFAULT 0 NOT NULL,
	`transfer_tx` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients_table`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `client_traffic_usage_table` (
	`client_id` integer NOT NULL,
	`date` text NOT NULL,
	`received_bytes` integer DEFAULT 0 NOT NULL,
	`sent_bytes` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`client_id`, `date`),
	FOREIGN KEY (`client_id`) REFERENCES `clients_table`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `clients_table` ADD `daily_quota` integer;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `weekly_quota` integer;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `monthly_quota` integer;