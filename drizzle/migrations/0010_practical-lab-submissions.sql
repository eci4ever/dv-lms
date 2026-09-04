CREATE TABLE `lab_submission` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`lessonId` text NOT NULL,
	`response` text NOT NULL,
	`submittedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lab_submission_userId_lessonId_idx` ON `lab_submission` (`userId`,`lessonId`);