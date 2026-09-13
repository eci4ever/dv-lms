CREATE TABLE `enrollment` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`enrolled_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_course_user_unique` ON `enrollment` (`course_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `enrollment_userId_idx` ON `enrollment` (`user_id`);--> statement-breakpoint
CREATE INDEX `enrollment_courseId_idx` ON `enrollment` (`course_id`);--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`position_seconds` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessonProgress_enrollment_lesson_unique` ON `lesson_progress` (`enrollment_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `lessonProgress_enrollmentId_idx` ON `lesson_progress` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `lessonProgress_lessonId_idx` ON `lesson_progress` (`lesson_id`);