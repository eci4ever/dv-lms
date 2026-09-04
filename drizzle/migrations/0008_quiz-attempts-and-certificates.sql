CREATE TABLE `certificate` (
	`id` text PRIMARY KEY NOT NULL,
	`verificationId` text NOT NULL,
	`userId` text NOT NULL,
	`courseId` text NOT NULL,
	`issuedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificate_verificationId_unique` ON `certificate` (`verificationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `certificate_userId_courseId_uidx` ON `certificate` (`userId`,`courseId`);--> statement-breakpoint
CREATE TABLE `quiz_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`lessonId` text NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`answers` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_attempt_userId_lessonId_idx` ON `quiz_attempt` (`userId`,`lessonId`);