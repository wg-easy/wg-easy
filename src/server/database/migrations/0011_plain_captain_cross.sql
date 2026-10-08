ALTER TABLE `interfaces_table` ADD `awg_protocol_version` text;--> statement-breakpoint
ALTER TABLE `interfaces_table` ADD `awg_profile_generated` integer DEFAULT false NOT NULL;