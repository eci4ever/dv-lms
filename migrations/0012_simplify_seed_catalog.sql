UPDATE `organization_subscription`
SET
	`plan_id` = 'plan_pro',
	`plan_snapshot` = '{"slug":"pro","name":"Pro","maxPublishedCourses":50,"maxProducts":100,"maxTeamMembers":10,"maxCustomers":10000,"analyticsRetentionDays":365}',
	`updated_at` = cast(unixepoch('subsecond') * 1000 as integer)
WHERE `plan_id` NOT IN ('plan_free', 'plan_starter', 'plan_pro');
--> statement-breakpoint
DELETE FROM `platform_plan`
WHERE `id` NOT IN ('plan_free', 'plan_starter', 'plan_pro');
--> statement-breakpoint
UPDATE `platform_plan` SET `position` = 0 WHERE `id` = 'plan_free';
--> statement-breakpoint
UPDATE `platform_plan` SET `position` = 1 WHERE `id` = 'plan_starter';
--> statement-breakpoint
UPDATE `platform_plan` SET `position` = 2 WHERE `id` = 'plan_pro';
--> statement-breakpoint
DELETE FROM `platform_category`;
--> statement-breakpoint
INSERT INTO `platform_category` (`id`, `slug`, `name`, `description`, `position`, `featured`, `active`) VALUES
	('category-it-network', 'it-network', 'IT & Network', '', 0, 1, 1),
	('category-system-administration', 'system-administration', 'System Administration', '', 1, 1, 1),
	('category-programming', 'programming', 'Programming', '', 2, 1, 1);
