CREATE TABLE `creator_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`display_name` text NOT NULL,
	`headline` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`hero_url` text,
	`website_url` text,
	`youtube_url` text,
	`github_url` text,
	`twitter_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creator_profile_organization_id_unique` ON `creator_profile` (`organization_id`);--> statement-breakpoint
CREATE TABLE `offer` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`price_in_sen` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`billing_type` text NOT NULL,
	`billing_interval` text,
	`status` text DEFAULT 'active' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `offer_productId_idx` ON `offer` (`product_id`);--> statement-breakpoint
CREATE INDEX `offer_status_idx` ON `offer` (`status`);--> statement-breakpoint
CREATE TABLE `order_entitlement` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`course_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`granted_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `course_order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orderEntitlement_order_course_unique` ON `order_entitlement` (`order_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `orderEntitlement_courseId_idx` ON `order_entitlement` (`course_id`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`type` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_organization_slug_unique` ON `product` (`organization_id`,`slug`);--> statement-breakpoint
CREATE INDEX `product_organizationId_idx` ON `product` (`organization_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE TABLE `product_course` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`course_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `productCourse_product_course_unique` ON `product_course` (`product_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `productCourse_productId_idx` ON `product_course` (`product_id`);--> statement-breakpoint
CREATE INDEX `productCourse_courseId_idx` ON `product_course` (`course_id`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`offer_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`cancelled_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`offer_id`) REFERENCES `offer`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `subscription_buyerId_idx` ON `subscription` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `subscription_offerId_idx` ON `subscription` (`offer_id`);--> statement-breakpoint
CREATE INDEX `subscription_organizationId_idx` ON `subscription` (`organization_id`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);--> statement-breakpoint
CREATE TABLE `subscription_entitlement` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`course_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`granted_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptionEntitlement_subscription_course_unique` ON `subscription_entitlement` (`subscription_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `subscriptionEntitlement_courseId_idx` ON `subscription_entitlement` (`course_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_course_order` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`course_id` text,
	`product_id` text,
	`offer_id` text,
	`subscription_id` text,
	`organization_id` text NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`gross_in_sen` integer NOT NULL,
	`platform_fee_in_sen` integer NOT NULL,
	`seller_net_in_sen` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`mock_payment_reference` text,
	`product_name_snapshot` text,
	`offer_name_snapshot` text,
	`billing_type_snapshot` text,
	`billing_interval_snapshot` text,
	`expires_at` integer NOT NULL,
	`paid_at` integer,
	`refunded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`offer_id`) REFERENCES `offer`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_course_order`("id", "buyer_id", "course_id", "product_id", "offer_id", "subscription_id", "organization_id", "currency", "gross_in_sen", "platform_fee_in_sen", "seller_net_in_sen", "status", "mock_payment_reference", "product_name_snapshot", "offer_name_snapshot", "billing_type_snapshot", "billing_interval_snapshot", "expires_at", "paid_at", "refunded_at", "created_at", "updated_at") SELECT "id", "buyer_id", "course_id", NULL, NULL, NULL, "organization_id", "currency", "gross_in_sen", "platform_fee_in_sen", "seller_net_in_sen", "status", "mock_payment_reference", NULL, NULL, NULL, NULL, "expires_at", "paid_at", "refunded_at", "created_at", "updated_at" FROM `course_order`;--> statement-breakpoint
DROP TABLE `course_order`;--> statement-breakpoint
ALTER TABLE `__new_course_order` RENAME TO `course_order`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `course_order_mock_payment_reference_unique` ON `course_order` (`mock_payment_reference`);--> statement-breakpoint
CREATE INDEX `courseOrder_buyerId_idx` ON `course_order` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_courseId_idx` ON `course_order` (`course_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_productId_idx` ON `course_order` (`product_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_offerId_idx` ON `course_order` (`offer_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_subscriptionId_idx` ON `course_order` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_organizationId_idx` ON `course_order` (`organization_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_status_idx` ON `course_order` (`status`);--> statement-breakpoint
INSERT INTO `creator_profile` (`id`, `organization_id`, `display_name`, `status`)
SELECT 'profile-' || `id`, `id`, `name`, 'draft' FROM `organization`;--> statement-breakpoint
INSERT INTO `product` (`id`, `organization_id`, `type`, `slug`, `name`, `summary`, `description`, `image_url`, `status`, `published_at`, `created_at`, `updated_at`)
SELECT 'legacy-product-' || `id`, `organization_id`, 'course', `slug`, `title`, `summary`, `description`, `thumbnail_url`, `status`, `published_at`, `created_at`, `updated_at` FROM `course`;--> statement-breakpoint
INSERT INTO `product_course` (`id`, `product_id`, `course_id`, `position`)
SELECT 'legacy-product-course-' || `id`, 'legacy-product-' || `id`, `id`, 0 FROM `course`;--> statement-breakpoint
INSERT INTO `offer` (`id`, `product_id`, `name`, `price_in_sen`, `currency`, `billing_type`, `billing_interval`, `status`, `position`)
SELECT 'legacy-offer-' || `id`, 'legacy-product-' || `id`, 'One-time access', `price_in_sen`, 'MYR', 'one_time', NULL, 'active', 0 FROM `course` WHERE `price_in_sen` > 0;--> statement-breakpoint
UPDATE `course_order`
SET `product_id` = 'legacy-product-' || `course_id`,
	`offer_id` = CASE WHEN `gross_in_sen` > 0 THEN 'legacy-offer-' || `course_id` ELSE NULL END,
	`product_name_snapshot` = (SELECT `title` FROM `course` WHERE `course`.`id` = `course_order`.`course_id`),
	`offer_name_snapshot` = CASE WHEN `gross_in_sen` > 0 THEN 'One-time access' ELSE NULL END,
	`billing_type_snapshot` = CASE WHEN `gross_in_sen` > 0 THEN 'one_time' ELSE NULL END
WHERE `course_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `order_entitlement` (`id`, `order_id`, `course_id`, `status`, `granted_at`, `revoked_at`)
SELECT 'legacy-entitlement-' || `id`, `id`, `course_id`,
	CASE WHEN `status` = 'refunded' THEN 'revoked' ELSE 'active' END,
	COALESCE(`paid_at`, `created_at`),
	CASE WHEN `status` = 'refunded' THEN `refunded_at` ELSE NULL END
FROM `course_order`
WHERE `course_id` IS NOT NULL AND `status` IN ('paid', 'refunded');
