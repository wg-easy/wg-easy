-- Replace only the keepalive columns to preserve clients, links and AUTOINCREMENT.
ALTER TABLE `clients_table` ADD `__range_persistent_keepalive` text DEFAULT '0' NOT NULL;--> statement-breakpoint
UPDATE `clients_table` SET `__range_persistent_keepalive` = CAST(`persistent_keepalive` AS TEXT);--> statement-breakpoint
ALTER TABLE `clients_table` DROP COLUMN `persistent_keepalive`;--> statement-breakpoint
ALTER TABLE `clients_table` RENAME COLUMN `__range_persistent_keepalive` TO `persistent_keepalive`;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `__range_default_persistent_keepalive` text DEFAULT '0' NOT NULL;--> statement-breakpoint
UPDATE `user_configs_table` SET `__range_default_persistent_keepalive` = CAST(`default_persistent_keepalive` AS TEXT);--> statement-breakpoint
ALTER TABLE `user_configs_table` DROP COLUMN `default_persistent_keepalive`;--> statement-breakpoint
ALTER TABLE `user_configs_table` RENAME COLUMN `__range_default_persistent_keepalive` TO `default_persistent_keepalive`;