ALTER TABLE `course` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `thumbnailUrl` text;--> statement-breakpoint
ALTER TABLE `course` ADD `publishedAt` integer;--> statement-breakpoint
ALTER TABLE `course` ADD `updatedAt` integer;--> statement-breakpoint
ALTER TABLE `lesson` ADD `contentType` text DEFAULT 'video' NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson` ADD `videoUrl` text;--> statement-breakpoint
ALTER TABLE `lesson` ADD `content` text;--> statement-breakpoint
ALTER TABLE `lesson` ADD `attachmentUrl` text;--> statement-breakpoint
ALTER TABLE `lesson` ADD `isPreview` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson` ADD `updatedAt` integer;--> statement-breakpoint
UPDATE `course`
SET `status` = 'published', `publishedAt` = `createdAt`, `updatedAt` = `createdAt`;--> statement-breakpoint
UPDATE `lesson` SET `updatedAt` = `createdAt`;
