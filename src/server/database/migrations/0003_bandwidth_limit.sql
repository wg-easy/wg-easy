ALTER TABLE `general_table` ADD `bandwidth_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `general_table` ADD `download_limit_mbps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `general_table` ADD `upload_limit_mbps` integer DEFAULT 0 NOT NULL;
