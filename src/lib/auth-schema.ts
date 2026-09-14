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

export const courseOrder = sqliteTable(
	"course_order",
	{
		id: text("id").primaryKey(),
		buyerId: text("buyer_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		courseId: text("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "restrict" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "restrict" }),
		currency: text("currency").default("MYR").notNull(),
		grossInSen: integer("gross_in_sen").notNull(),
		platformFeeInSen: integer("platform_fee_in_sen").notNull(),
		sellerNetInSen: integer("seller_net_in_sen").notNull(),
		status: text("status").default("pending").notNull(),
		mockPaymentReference: text("mock_payment_reference").unique(),
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
		index("courseOrder_organizationId_idx").on(table.organizationId),
		index("courseOrder_status_idx").on(table.status),
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

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	twoFactors: many(twoFactor),
	members: many(member),
	invitations: many(invitation),
	coursesCreated: many(course),
	enrollments: many(enrollment),
	courseOrders: many(courseOrder),
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

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
	courses: many(course),
	courseOrders: many(courseOrder),
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
}));

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
	refundRequests: many(refundRequest),
}));

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
