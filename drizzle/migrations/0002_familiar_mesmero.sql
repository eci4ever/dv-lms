CREATE TABLE `course` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`priceSen` integer NOT NULL,
	`duration` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_slug_unique` ON `course` (`slug`);--> statement-breakpoint
CREATE TABLE `enrollment` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`courseId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_userId_courseId_uidx` ON `enrollment` (`userId`,`courseId`);--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`courseId` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`duration` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_courseId_position_uidx` ON `lesson` (`courseId`,`position`);--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`lessonId` text NOT NULL,
	`completedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_progress_userId_lessonId_uidx` ON `lesson_progress` (`userId`,`lessonId`);
--> statement-breakpoint
INSERT INTO `course` (`id`, `slug`, `title`, `description`, `priceSen`, `duration`, `createdAt`) VALUES
	('network-administration-essentials', 'network-administration-essentials', 'Network Administration Essentials', 'Practical networking for Malaysian Diploma IT students', 2900, '2 weeks', 0);
--> statement-breakpoint
INSERT INTO `lesson` (`id`, `courseId`, `position`, `title`, `description`, `duration`, `createdAt`) VALUES
	('network-welcome', 'network-administration-essentials', 1, 'Welcome & your lab setup', 'Set up Cisco Packet Tracer and understand the lab workflow.', '8 min', 0),
	('network-subnetting', 'network-administration-essentials', 2, 'IP addressing & subnetting', 'Break down subnetting with a repeatable method for lab questions.', '24 min', 0),
	('network-lan', 'network-administration-essentials', 3, 'Build your first LAN', 'Connect devices, assign addresses, and test your network.', '31 min', 0),
	('network-vlans', 'network-administration-essentials', 4, 'VLANs in Packet Tracer', 'Separate departments with VLANs and verify the configuration.', '28 min', 0),
	('network-routing', 'network-administration-essentials', 5, 'Routing fundamentals', 'Route traffic between networks with static routes.', '35 min', 0);
