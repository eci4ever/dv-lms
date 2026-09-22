ALTER TABLE `creator_profile` ADD `moderation_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `creator_profile` ADD `moderation_previous_status` text;