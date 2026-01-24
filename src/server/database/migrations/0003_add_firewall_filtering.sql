ALTER TABLE `interfaces_table` ADD `firewall_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `clients_table` ADD `firewall_ips` text;
