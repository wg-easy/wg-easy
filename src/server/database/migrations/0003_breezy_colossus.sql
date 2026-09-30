PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_interfaces_table` (
        `name` text PRIMARY KEY NOT NULL,
        `device` text NOT NULL,
        `port` integer NOT NULL,
        `private_key` text NOT NULL,
        `public_key` text NOT NULL,
        `ipv4_cidr` text NOT NULL,
        `ipv6_cidr` text NOT NULL,
        `mtu` integer NOT NULL,
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
        `enabled` integer NOT NULL,
        `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_interfaces_table`("name", "device", "port", "private_key", "public_key", "ipv4_cidr", "ipv6_cidr", "mtu", "j_c", "j_min", "j_max", "s1", "s2", "s3", "s4", "h1", "h2", "h3", "h4", "i1", "i2", "i3", "i4", "i5", "enabled", "created_at", "updated_at") SELECT "name", "device", "port", "private_key", "public_key", "ipv4_cidr", "ipv6_cidr", "mtu", "j_c", "j_min", "j_max", "s1", "s2", "s3", "s4", "h1", "h2", "h3", "h4", "i1", "i2", "i3", "i4", "i5", "enabled", "created_at", "updated_at" FROM `interfaces_table`;--> statement-breakpoint
DROP TABLE `interfaces_table`;--> statement-breakpoint
ALTER TABLE `__new_interfaces_table` RENAME TO `interfaces_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `interfaces_table_port_unique` ON `interfaces_table` (`port`);