CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`organization_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`impersonated` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `auditLog_actor_idx` ON `audit_log` (`actor_id`);--> statement-breakpoint
CREATE INDEX `auditLog_action_idx` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `auditLog_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `creator_application` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`applicant_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`decision_reason` text,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`applicant_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creator_application_organization_id_unique` ON `creator_application` (`organization_id`);--> statement-breakpoint
CREATE INDEX `creatorApplication_status_idx` ON `creator_application` (`status`);--> statement-breakpoint
CREATE INDEX `creatorApplication_organization_idx` ON `creator_application` (`organization_id`);--> statement-breakpoint
CREATE TABLE `moderation_action` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`actor_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `moderationAction_target_idx` ON `moderation_action` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `moderationAction_created_idx` ON `moderation_action` (`created_at`);--> statement-breakpoint
CREATE TABLE `platform_category` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_category_slug_unique` ON `platform_category` (`slug`);--> statement-breakpoint
CREATE INDEX `platformCategory_active_position_idx` ON `platform_category` (`active`,`position`);--> statement-breakpoint
CREATE TABLE `platform_setting` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_fee_percent` integer DEFAULT 10 NOT NULL,
	`refund_window_days` integer DEFAULT 14 NOT NULL,
	`creator_applications_open` integer DEFAULT true NOT NULL,
	`maintenance_mode` integer DEFAULT false NOT NULL,
	`updated_by` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `course` ADD `moderation_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `moderation_previous_status` text;--> statement-breakpoint
ALTER TABLE `course_order` ADD `platform_fee_percent_snapshot` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `course_order` ADD `refund_window_days_snapshot` integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE `product` ADD `moderation_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `product` ADD `moderation_previous_status` text;--> statement-breakpoint
INSERT INTO `platform_setting` (`id`, `platform_fee_percent`, `refund_window_days`, `creator_applications_open`, `maintenance_mode`)
VALUES ('global', 10, 14, 1, 0);--> statement-breakpoint
INSERT INTO `platform_category` (`id`, `slug`, `name`, `description`, `position`, `featured`, `active`) VALUES
('category-development', 'development', 'Development', '', 0, 1, 1),
('category-design', 'design', 'Design', '', 1, 1, 1),
('category-business', 'business', 'Business', '', 2, 1, 1),
('category-data-analytics', 'data-analytics', 'Data & Analytics', '', 3, 1, 1),
('category-it-software', 'it-software', 'IT & Software', '', 4, 1, 1),
('category-health-wellness', 'health-wellness', 'Health & Wellness', '', 5, 1, 1),
('category-languages', 'languages', 'Languages', '', 6, 1, 1),
('category-personal-growth', 'personal-growth', 'Personal Growth', '', 7, 1, 1);--> statement-breakpoint
INSERT INTO `creator_application` (`id`, `organization_id`, `applicant_id`, `status`, `note`, `decision_reason`, `resolved_at`)
SELECT 'creator-approval-' || cp.organization_id, cp.organization_id, m.user_id, 'approved', 'Existing creator backfill', 'Approved during platform governance migration', cast(unixepoch('subsecond') * 1000 as integer)
FROM `creator_profile` cp
INNER JOIN `member` m ON m.organization_id = cp.organization_id AND instr(',' || m.role || ',', ',owner,') > 0
WHERE m.id = (SELECT min(m2.id) FROM `member` m2 WHERE m2.organization_id = cp.organization_id AND instr(',' || m2.role || ',', ',owner,') > 0);
