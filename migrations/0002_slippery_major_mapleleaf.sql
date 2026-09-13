CREATE TABLE `course` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`level` text DEFAULT 'all-levels' NOT NULL,
	`language` text DEFAULT 'English' NOT NULL,
	`thumbnail_url` text,
	`price_in_sen` integer DEFAULT 0 NOT NULL,
	`original_price_in_sen` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_slug_unique` ON `course` (`slug`);--> statement-breakpoint
CREATE INDEX `course_organizationId_idx` ON `course` (`organization_id`);--> statement-breakpoint
CREATE INDEX `course_status_idx` ON `course` (`status`);--> statement-breakpoint
CREATE INDEX `course_category_idx` ON `course` (`category`);--> statement-breakpoint
CREATE TABLE `course_section` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `courseSection_courseId_idx` ON `course_section` (`course_id`);--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`video_url` text,
	`duration_minutes` integer DEFAULT 0 NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `course_section`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lesson_sectionId_idx` ON `lesson` (`section_id`);