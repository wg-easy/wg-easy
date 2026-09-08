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
	`pre_shared_key` text NOT NULL,
	`expires_at` text,
	`allowed_ips` text,
	`server_allowed_ips` text NOT NULL,
	`firewall_ips` text,
	`persistent_keepalive` integer NOT NULL,
	`mtu` integer,
	`j_c` integer,
	`j_min` integer,
	`j_max` integer,
	`i1` text,
	`i2` text,
	`i3` text,
	`i4` text,
	`i5` text,
	`dns` text,
	`server_endpoint` text,
	`enabled` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`interface_id`) REFERENCES `interfaces_table`(`name`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_clients_table`("id", "user_id", "interface_id", "name", "ipv4_address", "ipv6_address", "pre_up", "post_up", "pre_down", "post_down", "private_key", "public_key", "pre_shared_key", "expires_at", "allowed_ips", "server_allowed_ips", "firewall_ips", "persistent_keepalive", "mtu", "j_c", "j_min", "j_max", "i1", "i2", "i3", "i4", "i5", "dns", "server_endpoint", "enabled", "created_at", "updated_at") SELECT "id", "user_id", "interface_id", "name", "ipv4_address", "ipv6_address", "pre_up", "post_up", "pre_down", "post_down", "private_key", "public_key", "pre_shared_key", "expires_at", "allowed_ips", "server_allowed_ips", "firewall_ips", "persistent_keepalive", "mtu", "j_c", "j_min", "j_max", "i1", "i2", "i3", "i4", "i5", "dns", "server_endpoint", "enabled", "created_at", "updated_at" FROM `clients_table`;--> statement-breakpoint
DROP TABLE `clients_table`;--> statement-breakpoint
ALTER TABLE `__new_clients_table` RENAME TO `clients_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv4_address_unique` ON `clients_table` (`ipv4_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv6_address_unique` ON `clients_table` (`ipv6_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `public_key_interface_unique` ON `clients_table` (`public_key`,`interface_id`);--> statement-breakpoint
CREATE TABLE `__new_user_configs_table` (
	`id` text PRIMARY KEY NOT NULL,
	`default_mtu` integer,
	`default_persistent_keepalive` integer NOT NULL,
	`default_dns` text NOT NULL,
	`default_allowed_ips` text NOT NULL,
	`default_j_c` integer DEFAULT 7,
	`default_j_min` integer DEFAULT 10,
	`default_j_max` integer DEFAULT 1000,
	`default_i1` text,
	`default_i2` text,
	`default_i3` text,
	`default_i4` text,
	`default_i5` text,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `interfaces_table`(`name`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_configs_table`("id", "default_mtu", "default_persistent_keepalive", "default_dns", "default_allowed_ips", "default_j_c", "default_j_min", "default_j_max", "default_i1", "default_i2", "default_i3", "default_i4", "default_i5", "host", "port", "created_at", "updated_at") SELECT "id", "default_mtu", "default_persistent_keepalive", "default_dns", "default_allowed_ips", "default_j_c", "default_j_min", "default_j_max", "default_i1", "default_i2", "default_i3", "default_i4", "default_i5", "host", "port", "created_at", "updated_at" FROM `user_configs_table`;--> statement-breakpoint
DROP TABLE `user_configs_table`;--> statement-breakpoint
ALTER TABLE `__new_user_configs_table` RENAME TO `user_configs_table`;