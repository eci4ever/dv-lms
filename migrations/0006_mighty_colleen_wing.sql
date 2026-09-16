CREATE TABLE `analytics_event` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text,
	`user_id` text,
	`event_type` text NOT NULL,
	`visitor_id` text NOT NULL,
	`source` text NOT NULL,
	`deduplication_key` text NOT NULL,
	`occurred_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_event_deduplication_key_unique` ON `analytics_event` (`deduplication_key`);--> statement-breakpoint
CREATE INDEX `analyticsEvent_organization_date_idx` ON `analytics_event` (`organization_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `analyticsEvent_product_date_idx` ON `analytics_event` (`product_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `analyticsEvent_type_date_idx` ON `analytics_event` (`event_type`,`occurred_at`);