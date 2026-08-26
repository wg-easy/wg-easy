CREATE TABLE `tags_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_table_name_unique` ON `tags_table` (`name`);--> statement-breakpoint
CREATE TABLE `client_tags_table` (
	`client_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`client_id`, `tag_id`),
	FOREIGN KEY (`client_id`) REFERENCES `clients_table`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags_table`(`id`) ON UPDATE cascade ON DELETE cascade
);
