CREATE TABLE `course_order` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`course_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`currency` text DEFAULT 'MYR' NOT NULL,
	`gross_in_sen` integer NOT NULL,
	`platform_fee_in_sen` integer NOT NULL,
	`seller_net_in_sen` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`mock_payment_reference` text,
	`expires_at` integer NOT NULL,
	`paid_at` integer,
	`refunded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_order_mock_payment_reference_unique` ON `course_order` (`mock_payment_reference`);--> statement-breakpoint
CREATE INDEX `courseOrder_buyerId_idx` ON `course_order` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_courseId_idx` ON `course_order` (`course_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_organizationId_idx` ON `course_order` (`organization_id`);--> statement-breakpoint
CREATE INDEX `courseOrder_status_idx` ON `course_order` (`status`);--> statement-breakpoint
CREATE TABLE `refund_request` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolved_by` text,
	`resolution_note` text,
	`requested_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `course_order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refundRequest_orderId_unique` ON `refund_request` (`order_id`);--> statement-breakpoint
CREATE INDEX `refundRequest_status_idx` ON `refund_request` (`status`);