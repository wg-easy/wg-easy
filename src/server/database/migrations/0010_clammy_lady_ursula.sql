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
);
--> statement-breakpoint
INSERT INTO `__new_clients_table`("id", "user_id", "interface_id", "name", "ipv4_address", "ipv6_address", "pre_up", "post_up", "pre_down", "post_down", "private_key", "public_key", "pre_shared_key", "expires_at", "allowed_ips", "server_allowed_ips", "firewall_ips", "persistent_keepalive", "mtu", "j_c", "j_min", "j_max", "i1", "i2", "i3", "i4", "i5", "content_padding_addition", "rekey_after_time", "rekey_timeout", "reject_after_time", "keepalive_timeout", "max_handshake_attempts", "disable_cookies", "dns", "server_endpoint", "enabled", "created_at", "updated_at") SELECT "id", "user_id", "interface_id", "name", "ipv4_address", "ipv6_address", "pre_up", "post_up", "pre_down", "post_down", "private_key", "public_key", "pre_shared_key", "expires_at", "allowed_ips", "server_allowed_ips", "firewall_ips", "persistent_keepalive", "mtu", "j_c", "j_min", "j_max", "i1", "i2", "i3", "i4", "i5", "content_padding_addition", "rekey_after_time", "rekey_timeout", "reject_after_time", "keepalive_timeout", "max_handshake_attempts", "disable_cookies", "dns", "server_endpoint", "enabled", "created_at", "updated_at" FROM `clients_table`;--> statement-breakpoint
DROP TABLE `clients_table`;--> statement-breakpoint
ALTER TABLE `__new_clients_table` RENAME TO `clients_table`;--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv4_address_unique` ON `clients_table` (`ipv4_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_table_ipv6_address_unique` ON `clients_table` (`ipv6_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `public_key_interface_unique` ON `clients_table` (`public_key`,`interface_id`);--> statement-breakpoint
CREATE TABLE `__new_interfaces_table` (
	`name` text PRIMARY KEY NOT NULL,
	`device` text NOT NULL,
	`port` integer NOT NULL,
	`private_key` text NOT NULL,
	`public_key` text NOT NULL,
	`ipv4_cidr` text NOT NULL,
	`ipv6_cidr` text NOT NULL,
	`mtu` integer,
	`routing_table` text DEFAULT 'auto' NOT NULL,
	`j_c` integer DEFAULT 7,
	`j_min` integer DEFAULT 10,
	`j_max` integer DEFAULT 1000,
	`s1` integer DEFAULT 128,
	`s2` integer DEFAULT 56,
	`s3` integer,
	`s4` integer,
	`h1` text,
	`h2` text,
	`h3` text,
	`h4` text,
	`i1` text,
	`i2` text,
	`i3` text,
	`i4` text,
	`i5` text,
	`header_protection_key` text,
	`content_padding_addition` text,
	`rekey_after_time` text,
	`rekey_timeout` text,
	`reject_after_time` text,
	`keepalive_timeout` text,
	`max_handshake_attempts` text,
	`random_trailers` integer,
	`disable_cookies` integer,
	`enabled` integer NOT NULL,
	`firewall_enabled` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_interfaces_table`("name", "device", "port", "private_key", "public_key", "ipv4_cidr", "ipv6_cidr", "mtu", "routing_table", "j_c", "j_min", "j_max", "s1", "s2", "s3", "s4", "h1", "h2", "h3", "h4", "i1", "i2", "i3", "i4", "i5", "header_protection_key", "content_padding_addition", "rekey_after_time", "rekey_timeout", "reject_after_time", "keepalive_timeout", "max_handshake_attempts", "random_trailers", "disable_cookies", "enabled", "firewall_enabled", "created_at", "updated_at") SELECT "name", "device", "port", "private_key", "public_key", "ipv4_cidr", "ipv6_cidr", "mtu", "routing_table", "j_c", "j_min", "j_max", "s1", "s2", "s3", "s4", "h1", "h2", "h3", "h4", "i1", "i2", "i3", "i4", "i5", "header_protection_key", "content_padding_addition", "rekey_after_time", "rekey_timeout", "reject_after_time", "keepalive_timeout", "max_handshake_attempts", "random_trailers", "disable_cookies", "enabled", "firewall_enabled", "created_at", "updated_at" FROM `interfaces_table`;--> statement-breakpoint
DROP TABLE `interfaces_table`;--> statement-breakpoint
ALTER TABLE `__new_interfaces_table` RENAME TO `interfaces_table`;--> statement-breakpoint
CREATE UNIQUE INDEX `interfaces_table_port_unique` ON `interfaces_table` (`port`);--> statement-breakpoint
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
ALTER TABLE `__new_user_configs_table` RENAME TO `user_configs_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
