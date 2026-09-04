ALTER TABLE `enrollment` ADD `lastAccessedLessonId` text REFERENCES lesson(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `enrollment` ADD `lastAccessedAt` integer;
