ALTER TABLE `clients_table` ADD `firewall_ips` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `firewall_enabled` integer DEFAULT false NOT NULL;