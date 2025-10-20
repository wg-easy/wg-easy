ALTER TABLE `clients_table` ADD `j_c` integer;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `j_min` integer;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `j_max` integer;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `i1` text;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `i2` text;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `i3` text;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `i4` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `j_c` integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `j_min` integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `j_max` integer DEFAULT 1000;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `s1` integer DEFAULT 128;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `s2` integer DEFAULT 56;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `s3` integer;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `s4` integer;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `i1` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `i2` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `i3` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `i4` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `h1` integer;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `h2` integer;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `h3` integer;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `h4` integer;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_j_c` integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_j_min` integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_j_max` integer DEFAULT 1000;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_i1` text;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_i2` text;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_i3` text;--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_i4` text;