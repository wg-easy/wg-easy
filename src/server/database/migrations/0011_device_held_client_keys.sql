ALTER TABLE `clients_table` RENAME COLUMN `private_key` TO `old_private_key`;--> statement-breakpoint
ALTER TABLE `clients_table` ADD COLUMN `private_key` text;--> statement-breakpoint
UPDATE `clients_table` SET `private_key` = NULLIF(`old_private_key`, '');--> statement-breakpoint
ALTER TABLE `clients_table` DROP COLUMN `old_private_key`;
