CREATE TABLE `course_review` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`content` text NOT NULL,
	`access_source` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`featured_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courseReview_course_user_unique` ON `course_review` (`course_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `courseReview_course_status_idx` ON `course_review` (`course_id`,`status`);--> statement-breakpoint
CREATE INDEX `courseReview_organization_idx` ON `course_review` (`organization_id`);--> statement-breakpoint
CREATE INDEX `courseReview_featured_idx` ON `course_review` (`featured_at`);--> statement-breakpoint
CREATE TABLE `review_report` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `course_review`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviewReport_review_organization_unique` ON `review_report` (`review_id`,`organization_id`);--> statement-breakpoint
CREATE INDEX `reviewReport_status_idx` ON `review_report` (`status`);