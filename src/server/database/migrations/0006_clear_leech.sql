CREATE UNIQUE INDEX `public_key_interface_unique` ON `clients_table` (`public_key`,`interface_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_email_unique` ON `users_table` (`email`);