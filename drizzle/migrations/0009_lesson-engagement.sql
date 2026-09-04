CREATE TABLE `lesson_engagement` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`lessonId` text NOT NULL,
	`playbackPositionSeconds` integer DEFAULT 0 NOT NULL,
	`learningSeconds` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_engagement_userId_lessonId_uidx` ON `lesson_engagement` (`userId`,`lessonId`);