import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.default(false)
		.notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" })
		.default(false)
		.notNull(),
	role: text("role"),
	banned: integer("banned", { mode: "boolean" }).default(false),
	banReason: text("ban_reason"),
	banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
});

export const session = sqliteTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonated_by"),
		activeOrganizationId: text("active_organization_id"),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp_ms",
		}),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp_ms",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const twoFactor = sqliteTable(
	"two_factor",
	{
		id: text("id").primaryKey(),
		secret: text("secret").notNull(),
		backupCodes: text("backup_codes").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		verified: integer("verified", { mode: "boolean" }).default(true).notNull(),
		failedVerificationCount: integer("failed_verification_count")
			.default(0)
			.notNull(),
		lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
	},
	(table) => [
		index("twoFactor_secret_idx").on(table.secret),
		index("twoFactor_userId_idx").on(table.userId),
	],
);

export const organization = sqliteTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	logo: text("logo"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	metadata: text("metadata"),
});

export const creatorProfile = sqliteTable("creator_profile", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.unique()
		.references(() => organization.id, { onDelete: "cascade" }),
	displayName: text("display_name").notNull(),
	headline: text("headline").default("").notNull(),
	bio: text("bio").default("").notNull(),
	heroUrl: text("hero_url"),
	websiteUrl: text("website_url"),
	youtubeUrl: text("youtube_url"),
	githubUrl: text("github_url"),
	twitterUrl: text("twitter_url"),
	status: text("status").default("draft").notNull(),
	moderationStatus: text("moderation_status").default("active").notNull(),
	moderationPreviousStatus: text("moderation_previous_status"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const analyticsEvent = sqliteTable(
	"analytics_event",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		productId: text("product_id").references(() => product.id, {
			onDelete: "cascade",
		}),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		eventType: text("event_type").notNull(),
		visitorId: text("visitor_id").notNull(),
		source: text("source").notNull(),
		deduplicationKey: text("deduplication_key").notNull().unique(),
		occurredAt: integer("occurred_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("analyticsEvent_organization_date_idx").on(
			table.organizationId,
			table.occurredAt,
		),
		index("analyticsEvent_product_date_idx").on(
			table.productId,
			table.occurredAt,
		),
		index("analyticsEvent_type_date_idx").on(table.eventType, table.occurredAt),
	],
);

export const member = sqliteTable(
	"member",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").default("member").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("member_organizationId_idx").on(table.organizationId),
		index("member_userId_idx").on(table.userId),
	],
);

export const invitation = sqliteTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role"),
		status: text("status").default("pending").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("invitation_organizationId_idx").on(table.organizationId),
		index("invitation_email_idx").on(table.email),
	],
);

export const course = sqliteTable(
	"course",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		creatorId: text("creator_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		summary: text("summary").default("").notNull(),
		description: text("description").default("").notNull(),
		category: text("category").notNull(),
		level: text("level").default("all-levels").notNull(),
		language: text("language").default("English").notNull(),
		thumbnailUrl: text("thumbnail_url"),
		priceInSen: integer("price_in_sen").default(0).notNull(),
		originalPriceInSen: integer("original_price_in_sen"),
		status: text("status").default("draft").notNull(),
		moderationStatus: text("moderation_status").default("active").notNull(),
		moderationPreviousStatus: text("moderation_previous_status"),
		publishedAt: integer("published_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("course_organizationId_idx").on(table.organizationId),
		index("course_status_idx").on(table.status),
		index("course_category_idx").on(table.category),
	],
);

export const courseSection = sqliteTable(
	"course_section",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		position: integer("position").notNull(),
	},
	(table) => [index("courseSection_courseId_idx").on(table.courseId)],
);

export const lesson = sqliteTable(
	"lesson",
	{
		id: text("id").primaryKey(),
		sectionId: text("section_id")
			.notNull()
			.references(() => courseSection.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		content: text("content").default("").notNull(),
		videoUrl: text("video_url"),
		durationMinutes: integer("duration_minutes").default(0).notNull(),
		position: integer("position").notNull(),
	},
	(table) => [index("lesson_sectionId_idx").on(table.sectionId)],
);

export const enrollment = sqliteTable(
	"enrollment",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status").default("active").notNull(),
		enrolledAt: integer("enrolled_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("enrollment_course_user_unique").on(
			table.courseId,
			table.userId,
		),
		index("enrollment_userId_idx").on(table.userId),
		index("enrollment_courseId_idx").on(table.courseId),
	],
);

export const lessonProgress = sqliteTable(
	"lesson_progress",
	{
		id: text("id").primaryKey(),
		enrollmentId: text("enrollment_id")
			.notNull()
			.references(() => enrollment.id, { onDelete: "cascade" }),
		lessonId: text("lesson_id")
			.notNull()
			.references(() => lesson.id, { onDelete: "cascade" }),
		positionSeconds: integer("position_seconds").default(0).notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("lessonProgress_enrollment_lesson_unique").on(
			table.enrollmentId,
			table.lessonId,
		),
		index("lessonProgress_enrollmentId_idx").on(table.enrollmentId),
		index("lessonProgress_lessonId_idx").on(table.lessonId),
	],
);

export const courseReview = sqliteTable(
	"course_review",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		rating: integer("rating").notNull(),
		content: text("content").notNull(),
		accessSource: text("access_source").notNull(),
		status: text("status").default("published").notNull(),
		featuredAt: integer("featured_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("courseReview_course_user_unique").on(
			table.courseId,
			table.userId,
		),
		index("courseReview_course_status_idx").on(table.courseId, table.status),
		index("courseReview_organization_idx").on(table.organizationId),
		index("courseReview_featured_idx").on(table.featuredAt),
	],
);

export const reviewReport = sqliteTable(
	"review_report",
	{
		id: text("id").primaryKey(),
		reviewId: text("review_id")
			.notNull()
			.references(() => courseReview.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		reason: text("reason").notNull(),
		status: text("status").default("pending").notNull(),
		resolvedBy: text("resolved_by").references(() => user.id, {
			onDelete: "set null",
		}),
		resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("reviewReport_review_organization_unique").on(
			table.reviewId,
			table.organizationId,
		),
		index("reviewReport_status_idx").on(table.status),
	],
);

export const product = sqliteTable(
	"product",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		summary: text("summary").default("").notNull(),
		description: text("description").default("").notNull(),
		imageUrl: text("image_url"),
		status: text("status").default("draft").notNull(),
		moderationStatus: text("moderation_status").default("active").notNull(),
		moderationPreviousStatus: text("moderation_previous_status"),
		featured: integer("featured", { mode: "boolean" }).default(false).notNull(),
		position: integer("position").default(0).notNull(),
		publishedAt: integer("published_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("product_organization_slug_unique").on(
			table.organizationId,
			table.slug,
		),
		index("product_organizationId_idx").on(table.organizationId),
		index("product_status_idx").on(table.status),
	],
);

export const productCourse = sqliteTable(
	"product_course",
	{
		id: text("id").primaryKey(),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		courseId: text("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "restrict" }),
		position: integer("position").default(0).notNull(),
	},
	(table) => [
		uniqueIndex("productCourse_product_course_unique").on(
			table.productId,
			table.courseId,
		),
		index("productCourse_productId_idx").on(table.productId),
		index("productCourse_courseId_idx").on(table.courseId),
	],
);

export const offer = sqliteTable(
	"offer",
	{
		id: text("id").primaryKey(),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		priceInSen: integer("price_in_sen").notNull(),
		currency: text("currency").default("MYR").notNull(),
		billingType: text("billing_type").notNull(),
		billingInterval: text("billing_interval"),
		status: text("status").default("active").notNull(),
		position: integer("position").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("offer_productId_idx").on(table.productId),
		index("offer_status_idx").on(table.status),
	],
);

export const subscription = sqliteTable(
	"subscription",
	{
		id: text("id").primaryKey(),
		buyerId: text("buyer_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		offerId: text("offer_id")
			.notNull()
			.references(() => offer.id, { onDelete: "restrict" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "restrict" }),
		status: text("status").default("active").notNull(),
		currentPeriodStart: integer("current_period_start", {
			mode: "timestamp_ms",
		}).notNull(),
		currentPeriodEnd: integer("current_period_end", {
			mode: "timestamp_ms",
		}).notNull(),
		cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
			.default(false)
			.notNull(),
		cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("subscription_buyerId_idx").on(table.buyerId),
		index("subscription_offerId_idx").on(table.offerId),
		index("subscription_organizationId_idx").on(table.organizationId),
		index("subscription_status_idx").on(table.status),
	],
);

export const courseOrder = sqliteTable(
	"course_order",
	{
		id: text("id").primaryKey(),
		buyerId: text("buyer_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		courseId: text("course_id").references(() => course.id, {
			onDelete: "restrict",
		}),
		productId: text("product_id").references(() => product.id, {
			onDelete: "restrict",
		}),
		offerId: text("offer_id").references(() => offer.id, {
			onDelete: "restrict",
		}),
		subscriptionId: text("subscription_id").references(() => subscription.id, {
			onDelete: "set null",
		}),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "restrict" }),
		currency: text("currency").default("MYR").notNull(),
		grossInSen: integer("gross_in_sen").notNull(),
		platformFeeInSen: integer("platform_fee_in_sen").notNull(),
		sellerNetInSen: integer("seller_net_in_sen").notNull(),
		status: text("status").default("pending").notNull(),
		mockPaymentReference: text("mock_payment_reference").unique(),
		productNameSnapshot: text("product_name_snapshot"),
		offerNameSnapshot: text("offer_name_snapshot"),
		billingTypeSnapshot: text("billing_type_snapshot"),
		billingIntervalSnapshot: text("billing_interval_snapshot"),
		platformFeePercentSnapshot: integer("platform_fee_percent_snapshot")
			.default(10)
			.notNull(),
		refundWindowDaysSnapshot: integer("refund_window_days_snapshot")
			.default(14)
			.notNull(),
		paymentProvider: text("payment_provider").default("mock").notNull(),
		paymentFailureReason: text("payment_failure_reason"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		paidAt: integer("paid_at", { mode: "timestamp_ms" }),
		refundedAt: integer("refunded_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("courseOrder_buyerId_idx").on(table.buyerId),
		index("courseOrder_courseId_idx").on(table.courseId),
		index("courseOrder_productId_idx").on(table.productId),
		index("courseOrder_offerId_idx").on(table.offerId),
		index("courseOrder_subscriptionId_idx").on(table.subscriptionId),
		index("courseOrder_organizationId_idx").on(table.organizationId),
		index("courseOrder_status_idx").on(table.status),
	],
);

export const orderEntitlement = sqliteTable(
	"order_entitlement",
	{
		id: text("id").primaryKey(),
		orderId: text("order_id")
			.notNull()
			.references(() => courseOrder.id, { onDelete: "cascade" }),
		courseId: text("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "restrict" }),
		status: text("status").default("active").notNull(),
		grantedAt: integer("granted_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		uniqueIndex("orderEntitlement_order_course_unique").on(
			table.orderId,
			table.courseId,
		),
		index("orderEntitlement_courseId_idx").on(table.courseId),
	],
);

export const subscriptionEntitlement = sqliteTable(
	"subscription_entitlement",
	{
		id: text("id").primaryKey(),
		subscriptionId: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		courseId: text("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "restrict" }),
		status: text("status").default("active").notNull(),
		grantedAt: integer("granted_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		uniqueIndex("subscriptionEntitlement_subscription_course_unique").on(
			table.subscriptionId,
			table.courseId,
		),
		index("subscriptionEntitlement_courseId_idx").on(table.courseId),
	],
);

export const refundRequest = sqliteTable(
	"refund_request",
	{
		id: text("id").primaryKey(),
		orderId: text("order_id")
			.notNull()
			.references(() => courseOrder.id, { onDelete: "cascade" }),
		requesterId: text("requester_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		reason: text("reason").notNull(),
		status: text("status").default("pending").notNull(),
		resolvedBy: text("resolved_by").references(() => user.id, {
			onDelete: "set null",
		}),
		resolutionNote: text("resolution_note"),
		accountHolderName: text("account_holder_name"),
		bankName: text("bank_name"),
		bankAccountEncrypted: text("bank_account_encrypted"),
		bankAccountLast4: text("bank_account_last4"),
		settlementStatus: text("settlement_status").default("pending").notNull(),
		settlementReference: text("settlement_reference"),
		settledAt: integer("settled_at", { mode: "timestamp_ms" }),
		requestedAt: integer("requested_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		uniqueIndex("refundRequest_orderId_unique").on(table.orderId),
		index("refundRequest_status_idx").on(table.status),
	],
);

export const paymentAttempt = sqliteTable(
	"payment_attempt",
	{
		id: text("id").primaryKey(),
		orderId: text("order_id")
			.notNull()
			.references(() => courseOrder.id, { onDelete: "cascade" }),
		provider: text("provider").default("billplz").notNull(),
		providerPaymentId: text("provider_payment_id").notNull(),
		paymentUrl: text("payment_url").notNull(),
		transactionReference: text("transaction_reference"),
		paymentChannel: text("payment_channel"),
		status: text("status").default("pending").notNull(),
		callbackPayload: text("callback_payload").default("{}").notNull(),
		failureReason: text("failure_reason"),
		paidAt: integer("paid_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("paymentAttempt_providerPayment_unique").on(
			table.provider,
			table.providerPaymentId,
		),
		index("paymentAttempt_order_idx").on(table.orderId),
		index("paymentAttempt_status_idx").on(table.status),
	],
);

export const creatorPayoutProfile = sqliteTable("creator_payout_profile", {
	organizationId: text("organization_id")
		.primaryKey()
		.references(() => organization.id, { onDelete: "cascade" }),
	accountHolderName: text("account_holder_name").notNull(),
	bankName: text("bank_name").notNull(),
	bankAccountEncrypted: text("bank_account_encrypted").notNull(),
	bankAccountLast4: text("bank_account_last4").notNull(),
	updatedBy: text("updated_by").references(() => user.id, {
		onDelete: "set null",
	}),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const creatorPayout = sqliteTable(
	"creator_payout",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "restrict" }),
		amountInSen: integer("amount_in_sen").notNull(),
		currency: text("currency").default("MYR").notNull(),
		status: text("status").default("draft").notNull(),
		transferReference: text("transfer_reference"),
		failureReason: text("failure_reason"),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		processedBy: text("processed_by").references(() => user.id, {
			onDelete: "set null",
		}),
		processedAt: integer("processed_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("creatorPayout_organization_idx").on(table.organizationId),
		index("creatorPayout_status_idx").on(table.status),
	],
);

export const creatorLedgerEntry = sqliteTable(
	"creator_ledger_entry",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "restrict" }),
		orderId: text("order_id").references(() => courseOrder.id, {
			onDelete: "restrict",
		}),
		payoutId: text("payout_id").references(() => creatorPayout.id, {
			onDelete: "set null",
		}),
		type: text("type").notNull(),
		amountInSen: integer("amount_in_sen").notNull(),
		currency: text("currency").default("MYR").notNull(),
		description: text("description").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		uniqueIndex("creatorLedger_order_type_unique").on(
			table.orderId,
			table.type,
		),
		index("creatorLedger_organization_idx").on(table.organizationId),
		index("creatorLedger_payout_idx").on(table.payoutId),
	],
);

export const platformSetting = sqliteTable("platform_setting", {
	id: text("id").primaryKey(),
	platformFeePercent: integer("platform_fee_percent").default(10).notNull(),
	refundWindowDays: integer("refund_window_days").default(14).notNull(),
	creatorApplicationsOpen: integer("creator_applications_open", {
		mode: "boolean",
	})
		.default(true)
		.notNull(),
	maintenanceMode: integer("maintenance_mode", { mode: "boolean" })
		.default(false)
		.notNull(),
	updatedBy: text("updated_by").references(() => user.id, {
		onDelete: "set null",
	}),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const creatorApplication = sqliteTable(
	"creator_application",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.unique()
			.references(() => organization.id, { onDelete: "cascade" }),
		applicantId: text("applicant_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		status: text("status").default("pending").notNull(),
		note: text("note").default("").notNull(),
		decisionReason: text("decision_reason"),
		resolvedBy: text("resolved_by").references(() => user.id, {
			onDelete: "set null",
		}),
		resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("creatorApplication_status_idx").on(table.status),
		index("creatorApplication_organization_idx").on(table.organizationId),
	],
);

export const platformCategory = sqliteTable(
	"platform_category",
	{
		id: text("id").primaryKey(),
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		description: text("description").default("").notNull(),
		position: integer("position").default(0).notNull(),
		featured: integer("featured", { mode: "boolean" }).default(false).notNull(),
		active: integer("active", { mode: "boolean" }).default(true).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("platformCategory_active_position_idx").on(
			table.active,
			table.position,
		),
	],
);

export const moderationAction = sqliteTable(
	"moderation_action",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id").references(() => organization.id, {
			onDelete: "set null",
		}),
		targetType: text("target_type").notNull(),
		targetId: text("target_id").notNull(),
		action: text("action").notNull(),
		reason: text("reason").notNull(),
		actorId: text("actor_id").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("moderationAction_target_idx").on(table.targetType, table.targetId),
		index("moderationAction_created_idx").on(table.createdAt),
	],
);

export const auditLog = sqliteTable(
	"audit_log",
	{
		id: text("id").primaryKey(),
		actorId: text("actor_id").references(() => user.id, {
			onDelete: "set null",
		}),
		organizationId: text("organization_id").references(() => organization.id, {
			onDelete: "set null",
		}),
		action: text("action").notNull(),
		resourceType: text("resource_type").notNull(),
		resourceId: text("resource_id"),
		metadata: text("metadata").default("{}").notNull(),
		impersonated: integer("impersonated", { mode: "boolean" })
			.default(false)
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("auditLog_actor_idx").on(table.actorId),
		index("auditLog_action_idx").on(table.action),
		index("auditLog_created_idx").on(table.createdAt),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	twoFactors: many(twoFactor),
	members: many(member),
	invitations: many(invitation),
	coursesCreated: many(course),
	enrollments: many(enrollment),
	courseOrders: many(courseOrder),
	subscriptions: many(subscription),
	refundRequests: many(refundRequest, { relationName: "refundRequester" }),
	refundsResolved: many(refundRequest, { relationName: "refundResolver" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id],
	}),
}));

export const organizationRelations = relations(
	organization,
	({ many, one }) => ({
		creatorProfile: one(creatorProfile),
		members: many(member),
		invitations: many(invitation),
		courses: many(course),
		products: many(product),
		subscriptions: many(subscription),
		courseOrders: many(courseOrder),
	}),
);

export const creatorProfileRelations = relations(creatorProfile, ({ one }) => ({
	organization: one(organization, {
		fields: [creatorProfile.organizationId],
		references: [organization.id],
	}),
}));

export const courseRelations = relations(course, ({ many, one }) => ({
	organization: one(organization, {
		fields: [course.organizationId],
		references: [organization.id],
	}),
	creator: one(user, {
		fields: [course.creatorId],
		references: [user.id],
	}),
	sections: many(courseSection),
	enrollments: many(enrollment),
	orders: many(courseOrder),
	productCourses: many(productCourse),
	orderEntitlements: many(orderEntitlement),
	subscriptionEntitlements: many(subscriptionEntitlement),
}));

export const productRelations = relations(product, ({ many, one }) => ({
	organization: one(organization, {
		fields: [product.organizationId],
		references: [organization.id],
	}),
	courses: many(productCourse),
	offers: many(offer),
	orders: many(courseOrder),
}));

export const productCourseRelations = relations(productCourse, ({ one }) => ({
	product: one(product, {
		fields: [productCourse.productId],
		references: [product.id],
	}),
	course: one(course, {
		fields: [productCourse.courseId],
		references: [course.id],
	}),
}));

export const offerRelations = relations(offer, ({ many, one }) => ({
	product: one(product, {
		fields: [offer.productId],
		references: [product.id],
	}),
	orders: many(courseOrder),
	subscriptions: many(subscription),
}));

export const subscriptionRelations = relations(
	subscription,
	({ many, one }) => ({
		buyer: one(user, {
			fields: [subscription.buyerId],
			references: [user.id],
		}),
		offer: one(offer, {
			fields: [subscription.offerId],
			references: [offer.id],
		}),
		organization: one(organization, {
			fields: [subscription.organizationId],
			references: [organization.id],
		}),
		orders: many(courseOrder),
		entitlements: many(subscriptionEntitlement),
	}),
);

export const courseSectionRelations = relations(
	courseSection,
	({ many, one }) => ({
		course: one(course, {
			fields: [courseSection.courseId],
			references: [course.id],
		}),
		lessons: many(lesson),
	}),
);

export const lessonRelations = relations(lesson, ({ many, one }) => ({
	section: one(courseSection, {
		fields: [lesson.sectionId],
		references: [courseSection.id],
	}),
	progress: many(lessonProgress),
}));

export const enrollmentRelations = relations(enrollment, ({ many, one }) => ({
	course: one(course, {
		fields: [enrollment.courseId],
		references: [course.id],
	}),
	user: one(user, {
		fields: [enrollment.userId],
		references: [user.id],
	}),
	lessonProgress: many(lessonProgress),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
	enrollment: one(enrollment, {
		fields: [lessonProgress.enrollmentId],
		references: [enrollment.id],
	}),
	lesson: one(lesson, {
		fields: [lessonProgress.lessonId],
		references: [lesson.id],
	}),
}));

export const courseOrderRelations = relations(courseOrder, ({ many, one }) => ({
	buyer: one(user, {
		fields: [courseOrder.buyerId],
		references: [user.id],
	}),
	course: one(course, {
		fields: [courseOrder.courseId],
		references: [course.id],
	}),
	organization: one(organization, {
		fields: [courseOrder.organizationId],
		references: [organization.id],
	}),
	product: one(product, {
		fields: [courseOrder.productId],
		references: [product.id],
	}),
	offer: one(offer, {
		fields: [courseOrder.offerId],
		references: [offer.id],
	}),
	subscription: one(subscription, {
		fields: [courseOrder.subscriptionId],
		references: [subscription.id],
	}),
	entitlements: many(orderEntitlement),
	refundRequests: many(refundRequest),
}));

export const orderEntitlementRelations = relations(
	orderEntitlement,
	({ one }) => ({
		order: one(courseOrder, {
			fields: [orderEntitlement.orderId],
			references: [courseOrder.id],
		}),
		course: one(course, {
			fields: [orderEntitlement.courseId],
			references: [course.id],
		}),
	}),
);

export const subscriptionEntitlementRelations = relations(
	subscriptionEntitlement,
	({ one }) => ({
		subscription: one(subscription, {
			fields: [subscriptionEntitlement.subscriptionId],
			references: [subscription.id],
		}),
		course: one(course, {
			fields: [subscriptionEntitlement.courseId],
			references: [course.id],
		}),
	}),
);

export const refundRequestRelations = relations(refundRequest, ({ one }) => ({
	order: one(courseOrder, {
		fields: [refundRequest.orderId],
		references: [courseOrder.id],
	}),
	requester: one(user, {
		fields: [refundRequest.requesterId],
		references: [user.id],
		relationName: "refundRequester",
	}),
	resolver: one(user, {
		fields: [refundRequest.resolvedBy],
		references: [user.id],
		relationName: "refundResolver",
	}),
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));
