ALTER TABLE `interfaces_table` ADD `header_protection_key` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `content_padding_addition` integer;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `rekey_after_time` integer;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `rekey_timeout` integer;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `header_protection_key` text;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `content_padding_addition` integer;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `rekey_after_time` integer;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `rekey_timeout` integer;
