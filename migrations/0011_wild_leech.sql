CREATE TABLE `organization_subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`billing_owner_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`billing_interval` text DEFAULT 'month' NOT NULL,
	`price_in_sen_snapshot` integer DEFAULT 0 NOT NULL,
	`plan_snapshot` text DEFAULT '{}' NOT NULL,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `platform_plan`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`billing_owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_subscription_organization_id_unique` ON `organization_subscription` (`organization_id`);--> statement-breakpoint
CREATE INDEX `organizationSubscription_plan_idx` ON `organization_subscription` (`plan_id`);--> statement-breakpoint
CREATE INDEX `organizationSubscription_status_idx` ON `organization_subscription` (`status`);--> statement-breakpoint
CREATE TABLE `organization_subscription_event` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`type` text NOT NULL,
	`actor_id` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `organization_subscription`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `organizationSubscriptionEvent_subscription_idx` ON `organization_subscription_event` (`subscription_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `platform_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`monthly_price_in_sen` integer DEFAULT 0 NOT NULL,
	`yearly_price_in_sen` integer DEFAULT 0 NOT NULL,
	`trial_days` integer DEFAULT 0 NOT NULL,
	`max_published_courses` integer DEFAULT 1 NOT NULL,
	`max_products` integer DEFAULT 1 NOT NULL,
	`max_team_members` integer DEFAULT 1 NOT NULL,
	`max_customers` integer DEFAULT 100 NOT NULL,
	`analytics_retention_days` integer DEFAULT 30 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_plan_slug_unique` ON `platform_plan` (`slug`);--> statement-breakpoint
CREATE INDEX `platformPlan_status_position_idx` ON `platform_plan` (`status`,`position`);
--> statement-breakpoint
UPDATE `member` SET `role` = 'member' WHERE `role` NOT IN ('owner', 'admin', 'member');
--> statement-breakpoint
UPDATE `invitation` SET `role` = 'member' WHERE `role` IS NULL OR `role` NOT IN ('owner', 'admin', 'member');
--> statement-breakpoint
INSERT INTO `platform_plan` (`id`, `slug`, `name`, `description`, `status`, `monthly_price_in_sen`, `yearly_price_in_sen`, `trial_days`, `max_published_courses`, `max_products`, `max_team_members`, `max_customers`, `analytics_retention_days`, `position`) VALUES
	('plan_free', 'free', 'Free', 'Start building your creator business.', 'active', 0, 0, 0, 1, 1, 1, 100, 30, 0),
	('plan_starter', 'starter', 'Starter', 'For individual creators launching their first products.', 'active', 3900, 39000, 14, 5, 10, 3, 1000, 90, 1),
	('plan_pro', 'pro', 'Pro', 'For established creator businesses and growing teams.', 'active', 9900, 99000, 14, 50, 100, 10, 10000, 365, 2),
	('plan_business', 'business', 'Business', 'For larger teams with high-volume operations.', 'active', 24900, 249000, 30, 500, 1000, 50, 100000, 365, 3),
	('plan_legacy', 'legacy-pro', 'Legacy Pro', 'Compatibility plan for organizations created before SaaS billing.', 'archived', 0, 0, 0, 100000, 100000, 100000, 1000000, 3650, 99);
--> statement-breakpoint
INSERT INTO `organization_subscription` (`id`, `organization_id`, `plan_id`, `billing_owner_id`, `status`, `billing_interval`, `price_in_sen_snapshot`, `plan_snapshot`, `current_period_start`, `current_period_end`)
SELECT
	'orgsub_' || lower(hex(randomblob(12))),
	o.`id`,
	'plan_legacy',
	m.`user_id`,
	'active',
	'year',
	0,
	'{"slug":"legacy-pro","name":"Legacy Pro","maxPublishedCourses":100000,"maxProducts":100000,"maxTeamMembers":100000,"maxCustomers":1000000,"analyticsRetentionDays":3650}',
	cast(unixepoch('subsecond') * 1000 as integer),
	cast((unixepoch('subsecond') + 315360000) * 1000 as integer)
FROM `organization` o
INNER JOIN `member` m ON m.`organization_id` = o.`id` AND instr(',' || m.`role` || ',', ',owner,') > 0
WHERE NOT EXISTS (SELECT 1 FROM `organization_subscription` os WHERE os.`organization_id` = o.`id`);
