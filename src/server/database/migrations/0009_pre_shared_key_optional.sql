PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clients_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`interface_id` text NOT NULL,
	`name` text NOT NULL,
	`ipv4_address` text NOT NULL,
	`ipv6_address` text NOT NULL,
	`pre_up` text DEFAULT '' NOT NULL,
	`post_up` text DEFAULT '' NOT NULL,
	`pre_down` text DEFAULT '' NOT NULL,
	`post_down` text DEFAULT '' NOT NULL,
	`private_key` text NOT NULL,
	`public_key` text NOT NULL,
	`pre_shared_key` text,
	`expires_at` text,
	`allowed_ips` text,
	`server_allowed_ips` text NOT NULL,
	`firewall_ips` text,
	`persistent_keepalive` integer NOT NULL,
	`mtu` integer NOT NULL,
	`j_c` integer,
	`j_min` integer,
	`j_max` integer,
	`i1` text,
	`i2` text,
	`i3` text,
	`i4` text,
	`i5` text,
	`content_padding_addition` text,
	`rekey_after_time` text,
	`rekey_timeout` text,
	`reject_after_time` text,
	`keepalive_timeout` text,
	`max_handshake_attempts` text,
	`disable_cookies` integer,
	`dns` text,
	`server_endpoint` text,
	`enabled` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`interface_id`) REFERENCES `interfaces_table`(`name`) ON UPDATE cascade ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_clients_table` SELECT * FROM `clients_table`;--> statement-breakpoint
DROP TABLE `clients_table`;--> statement-breakpoint
ALTER TABLE `__new_clients_table` RENAME TO `clients_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv4_address_unique` ON `clients_table` (`ipv4_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv6_address_unique` ON `clients_table` (`ipv6_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `public_key_interface_unique` ON `clients_table` (`public_key`,`interface_id`);--> statement-breakpoint
ALTER TABLE `user_configs_table` ADD `default_pre_shared_key` integer NOT NULL DEFAULT true;
