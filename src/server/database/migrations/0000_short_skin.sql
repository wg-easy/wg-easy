CREATE TABLE `clients_table` (
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
	`pre_shared_key` text NOT NULL,
	`expires_at` text,
	`allowed_ips` text,
	`server_allowed_ips` text NOT NULL,
	`persistent_keepalive` integer NOT NULL,
	`mtu` integer NOT NULL,
	`dns` text,
	`server_endpoint` text,
	`enabled` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`interface_id`) REFERENCES `interfaces_table`(`name`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv4_address_unique` ON `clients_table` (`ipv4_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv6_address_unique` ON `clients_table` (`ipv6_address`);--> statement-breakpoint
CREATE TABLE `general_table` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`setup_step` integer NOT NULL,
	`session_password` text NOT NULL,
	`session_timeout` integer NOT NULL,
	`metrics_prometheus` integer NOT NULL,
	`metrics_json` integer NOT NULL,
	`metrics_password` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hooks_table` (
	`id` text PRIMARY KEY NOT NULL,
	`pre_up` text NOT NULL,
	`post_up` text NOT NULL,
	`pre_down` text NOT NULL,
	`post_down` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `interfaces_table`(`name`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `interfaces_table` (
	`name` text PRIMARY KEY NOT NULL,
	`device` text NOT NULL,
	`port` integer NOT NULL,
	`private_key` text NOT NULL,
	`public_key` text NOT NULL,
	`ipv4_cidr` text NOT NULL,
	`ipv6_cidr` text NOT NULL,
	`mtu` integer NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interfaces_table_port_unique` ON `interfaces_table` (`port`);--> statement-breakpoint
CREATE TABLE `one_time_links_table` (
	`id` integer PRIMARY KEY NOT NULL,
	`one_time_link` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `clients_table`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_time_links_table_one_time_link_unique` ON `one_time_links_table` (`one_time_link`);--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`email` text,
	`name` text NOT NULL,
	`role` integer NOT NULL,
	`totp_key` text,
	`totp_verified` integer NOT NULL,
	`enabled` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_username_unique` ON `users_table` (`username`);--> statement-breakpoint
CREATE TABLE `user_configs_table` (
	`id` text PRIMARY KEY NOT NULL,
	`default_mtu` integer NOT NULL,
	`default_persistent_keepalive` integer NOT NULL,
	`default_dns` text NOT NULL,
	`default_allowed_ips` text NOT NULL,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `interfaces_table`(`name`) ON UPDATE cascade ON DELETE cascade
);
