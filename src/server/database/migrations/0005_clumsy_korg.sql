PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text,
	`email` text,
	`name` text NOT NULL,
	`role` integer NOT NULL,
	`totp_key` text,
	`totp_verified` integer NOT NULL,
	`enabled` integer NOT NULL,
	`oauth_provider` text,
	`oauth_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users_table`("id", "username", "password", "email", "name", "role", "totp_key", "totp_verified", "enabled", "created_at", "updated_at") SELECT "id", "username", "password", "email", "name", "role", "totp_key", "totp_verified", "enabled", "created_at", "updated_at" FROM `users_table`;--> statement-breakpoint
DROP TABLE `users_table`;--> statement-breakpoint
ALTER TABLE `__new_users_table` RENAME TO `users_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_username_unique` ON `users_table` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_provider_id_unique` ON `users_table` (`oauth_provider`,`oauth_id`);