CREATE TABLE `creator_ledger_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`order_id` text,
	`payout_id` text,
	`type` text NOT NULL,
	`amount_in_sen` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`order_id`) REFERENCES `course_order`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payout_id`) REFERENCES `creator_payout`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creatorLedger_order_type_unique` ON `creator_ledger_entry` (`order_id`,`type`);--> statement-breakpoint
CREATE INDEX `creatorLedger_organization_idx` ON `creator_ledger_entry` (`organization_id`);--> statement-breakpoint
CREATE INDEX `creatorLedger_payout_idx` ON `creator_ledger_entry` (`payout_id`);--> statement-breakpoint
CREATE TABLE `creator_payout` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`amount_in_sen` integer NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`transfer_reference` text,
	`failure_reason` text,
	`created_by` text,
	`processed_by` text,
	`processed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`processed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `creatorPayout_organization_idx` ON `creator_payout` (`organization_id`);--> statement-breakpoint
CREATE INDEX `creatorPayout_status_idx` ON `creator_payout` (`status`);--> statement-breakpoint
CREATE TABLE `creator_payout_profile` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`account_holder_name` text NOT NULL,
	`bank_name` text NOT NULL,
	`bank_account_encrypted` text NOT NULL,
	`bank_account_last4` text NOT NULL,
	`updated_by` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `payment_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text DEFAULT 'billplz' NOT NULL,
	`provider_payment_id` text NOT NULL,
	`payment_url` text NOT NULL,
	`transaction_reference` text,
	`payment_channel` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`callback_payload` text DEFAULT '{}' NOT NULL,
	`failure_reason` text,
	`paid_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `course_order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paymentAttempt_providerPayment_unique` ON `payment_attempt` (`provider`,`provider_payment_id`);--> statement-breakpoint
CREATE INDEX `paymentAttempt_order_idx` ON `payment_attempt` (`order_id`);--> statement-breakpoint
CREATE INDEX `paymentAttempt_status_idx` ON `payment_attempt` (`status`);--> statement-breakpoint
ALTER TABLE `course_order` ADD `payment_provider` text DEFAULT 'mock' NOT NULL;--> statement-breakpoint
ALTER TABLE `course_order` ADD `payment_failure_reason` text;--> statement-breakpoint
ALTER TABLE `refund_request` ADD `account_holder_name` text;--> statement-breakpoint
ALTER TABLE `refund_request` ADD `bank_name` text;--> statement-breakpoint
ALTER TABLE `refund_request` ADD `bank_account_encrypted` text;--> statement-breakpoint
ALTER TABLE `refund_request` ADD `bank_account_last4` text;--> statement-breakpoint
ALTER TABLE `refund_request` ADD `settlement_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `refund_request` ADD `settlement_reference` text;--> statement-breakpoint
ALTER TABLE `refund_request` ADD `settled_at` integer;--> statement-breakpoint
INSERT OR IGNORE INTO `creator_ledger_entry` (`id`, `organization_id`, `order_id`, `type`, `amount_in_sen`, `currency`, `description`)
SELECT 'legacy-sale-' || `id`, `organization_id`, `id`, 'sale', `seller_net_in_sen`, `currency`, 'Historical sale for order ' || `id`
FROM `course_order`
WHERE `status` IN ('paid', 'refunded');
--> statement-breakpoint
INSERT OR IGNORE INTO `creator_ledger_entry` (`id`, `organization_id`, `order_id`, `type`, `amount_in_sen`, `currency`, `description`)
SELECT 'legacy-refund-' || `id`, `organization_id`, `id`, 'refund', -`seller_net_in_sen`, `currency`, 'Historical refund for order ' || `id`
FROM `course_order`
WHERE `status` = 'refunded';
--> statement-breakpoint
UPDATE `refund_request`
SET `settlement_status` = 'paid', `settled_at` = `resolved_at`
WHERE `status` = 'approved' AND `order_id` IN (SELECT `id` FROM `course_order` WHERE `status` = 'refunded');
