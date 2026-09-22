import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, gt, inArray, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { expireMemberships } from "@/lib/access.server";
import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });

function record(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Invalid request.");
	}
	return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, maximum: number) {
	const text = typeof value === "string" ? value.trim() : "";
	if (!text) throw new Error(`${label} is required.`);
	if (text.length > maximum) throw new Error(`${label} is too long.`);
	return text;
}

function validateReview(input: unknown) {
	const values = record(input);
	const courseId = requiredText(values.courseId, "Course", 100);
	const content = requiredText(values.content, "Review", 2_000);
	const rating = Number(values.rating);
	if (content.length < 20) {
		throw new Error("Review must be at least 20 characters.");
	}
	if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
		throw new Error("Rating must be between 1 and 5.");
	}
	return { courseId, content, rating };
}

function validateId(input: unknown) {
	return { id: requiredText(record(input).id, "Review", 100) };
}

function validateWorkspaceList(input: unknown) {
	const values = input ? record(input) : {};
	const query =
		typeof values.query === "string" ? values.query.trim().slice(0, 120) : "";
	const rating = Number(values.rating ?? 0);
	const status = typeof values.status === "string" ? values.status : "";
	if (rating && (!Number.isInteger(rating) || rating < 1 || rating > 5))
		throw new Error("Invalid rating filter.");
	if (status && !["published", "hidden"].includes(status))
		throw new Error("Invalid status filter.");
	return { query, rating, status };
}

async function requireSession() {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session) throw new Error("Authentication required.");
	return session;
}

async function ownerContext() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Authentication required.");
	const organizations = await auth.api.listOrganizations({ headers });
	const organizationId =
		session.session.activeOrganizationId &&
		organizations.some(
			(item) => item.id === session.session.activeOrganizationId,
		)
			? session.session.activeOrganizationId
			: organizations[0]?.id;
	if (!organizationId) throw new Error("Select an organization first.");
	const organization = await auth.api.getFullOrganization({
		headers,
		query: { organizationId },
	});
	const role = organization?.members.find(
		(item) => item.userId === session.user.id,
	)?.role;
	if (!role?.split(",").includes("owner"))
		throw new Error("Organization owner access is required.");
	return { session, organizationId };
}

async function adminContext() {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (
		!session?.user.role?.split(",").includes("admin") ||
		session.session.impersonatedBy
	) {
		throw new Error("Administrator access is required.");
	}
	return session;
}

async function reviewAccess(userId: string, courseId: string) {
	await expireMemberships(userId);
	const [access] = await db
		.select({
			courseId: schema.course.id,
			organizationId: schema.course.organizationId,
		})
		.from(schema.course)
		.innerJoin(
			schema.enrollment,
			and(
				eq(schema.enrollment.courseId, schema.course.id),
				eq(schema.enrollment.userId, userId),
				inArray(schema.enrollment.status, ["active", "completed"]),
			),
		)
		.where(
			and(
				eq(schema.course.id, courseId),
				eq(schema.course.status, "published"),
			),
		)
		.limit(1);
	if (!access) throw new Error("Active course access is required.");

	const now = new Date();
	const [membership] = await db
		.select({ id: schema.subscriptionEntitlement.id })
		.from(schema.subscriptionEntitlement)
		.innerJoin(
			schema.subscription,
			eq(schema.subscriptionEntitlement.subscriptionId, schema.subscription.id),
		)
		.where(
			and(
				eq(schema.subscription.buyerId, userId),
				eq(schema.subscriptionEntitlement.courseId, courseId),
				eq(schema.subscriptionEntitlement.status, "active"),
				inArray(schema.subscription.status, ["active", "cancelled"]),
				gt(schema.subscription.currentPeriodEnd, now),
			),
		)
		.limit(1);
	if (membership) return { ...access, accessSource: "membership" };

	const [order] = await db
		.select({ productType: schema.product.type })
		.from(schema.orderEntitlement)
		.innerJoin(
			schema.courseOrder,
			eq(schema.orderEntitlement.orderId, schema.courseOrder.id),
		)
		.leftJoin(
			schema.product,
			eq(schema.courseOrder.productId, schema.product.id),
		)
		.where(
			and(
				eq(schema.courseOrder.buyerId, userId),
				eq(schema.orderEntitlement.courseId, courseId),
				eq(schema.orderEntitlement.status, "active"),
				eq(schema.courseOrder.status, "paid"),
			),
		)
		.limit(1);
	if (order) {
		return {
			...access,
			accessSource: order.productType === "bundle" ? "bundle" : "purchased",
		};
	}
	return { ...access, accessSource: "free" };
}

export const getMyCourseReview = createServerFn({ method: "GET" })
	.validator((input: unknown) => ({
		courseId: requiredText(record(input).courseId, "Course", 100),
	}))
	.handler(async ({ data }) => {
		const session = await auth.api.getSession({ headers: getRequestHeaders() });
		if (!session) return { eligible: false, review: null };
		let eligible = true;
		try {
			await reviewAccess(session.user.id, data.courseId);
		} catch {
			eligible = false;
		}
		const [review] = await db
			.select()
			.from(schema.courseReview)
			.where(
				and(
					eq(schema.courseReview.courseId, data.courseId),
					eq(schema.courseReview.userId, session.user.id),
				),
			)
			.limit(1);
		return { eligible, review: review ?? null };
	});

export const getPublicCourseReviews = createServerFn({ method: "GET" })
	.validator((input: unknown) => ({
		courseId: requiredText(record(input).courseId, "Course", 100),
	}))
	.handler(async ({ data }) => {
		const [course] = await db
			.select({ id: schema.course.id })
			.from(schema.course)
			.where(
				and(
					eq(schema.course.id, data.courseId),
					eq(schema.course.status, "published"),
				),
			)
			.limit(1);
		if (!course) return null;
		const [reviews, rows] = await Promise.all([
			db
				.select({
					id: schema.courseReview.id,
					rating: schema.courseReview.rating,
					content: schema.courseReview.content,
					accessSource: schema.courseReview.accessSource,
					createdAt: schema.courseReview.createdAt,
					updatedAt: schema.courseReview.updatedAt,
					userName: schema.user.name,
					userImage: schema.user.image,
				})
				.from(schema.courseReview)
				.innerJoin(schema.user, eq(schema.courseReview.userId, schema.user.id))
				.where(
					and(
						eq(schema.courseReview.courseId, data.courseId),
						eq(schema.courseReview.status, "published"),
					),
				)
				.orderBy(desc(schema.courseReview.updatedAt)),
			db
				.select({
					rating: schema.courseReview.rating,
					count: sql<number>`count(*)`,
				})
				.from(schema.courseReview)
				.where(
					and(
						eq(schema.courseReview.courseId, data.courseId),
						eq(schema.courseReview.status, "published"),
					),
				)
				.groupBy(schema.courseReview.rating),
		]);
		const distribution = Object.fromEntries(
			[1, 2, 3, 4, 5].map((rating) => [
				rating,
				Number(rows.find((row) => row.rating === rating)?.count ?? 0),
			]),
		);
		const count = reviews.length;
		const average = count
			? Math.round(
					(reviews.reduce((sum, review) => sum + review.rating, 0) / count) *
						10,
				) / 10
			: 0;
		return { average, count, distribution, reviews };
	});

export const saveCourseReview = createServerFn({ method: "POST" })
	.validator(validateReview)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const access = await reviewAccess(session.user.id, data.courseId);
		const now = new Date();
		const [existing] = await db
			.select({ id: schema.courseReview.id })
			.from(schema.courseReview)
			.where(
				and(
					eq(schema.courseReview.courseId, data.courseId),
					eq(schema.courseReview.userId, session.user.id),
				),
			)
			.limit(1);
		const id = existing?.id ?? crypto.randomUUID();
		await db
			.insert(schema.courseReview)
			.values({
				id,
				courseId: data.courseId,
				organizationId: access.organizationId,
				userId: session.user.id,
				rating: data.rating,
				content: data.content,
				accessSource: access.accessSource,
				status: "published",
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [schema.courseReview.courseId, schema.courseReview.userId],
				set: {
					rating: data.rating,
					content: data.content,
					accessSource: access.accessSource,
					updatedAt: now,
				},
			});
		return { id };
	});

export const deleteCourseReview = createServerFn({ method: "POST" })
	.validator(validateId)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const [review] = await db
			.select({ id: schema.courseReview.id })
			.from(schema.courseReview)
			.where(
				and(
					eq(schema.courseReview.id, data.id),
					eq(schema.courseReview.userId, session.user.id),
				),
			)
			.limit(1);
		if (!review) throw new Error("Review not found.");
		await db
			.delete(schema.courseReview)
			.where(eq(schema.courseReview.id, review.id));
		return { deleted: true };
	});

export const listWorkspaceReviews = createServerFn({ method: "GET" })
	.validator(validateWorkspaceList)
	.handler(async ({ data }) => {
		const { organizationId } = await ownerContext();
		const filters = [eq(schema.courseReview.organizationId, organizationId)];
		if (data.rating) filters.push(eq(schema.courseReview.rating, data.rating));
		if (data.status) filters.push(eq(schema.courseReview.status, data.status));
		if (data.query) {
			const search = `%${data.query}%`;
			const searchFilter = or(
				like(schema.course.title, search),
				like(schema.user.name, search),
				like(schema.courseReview.content, search),
			);
			if (searchFilter) filters.push(searchFilter);
		}
		return db
			.select({
				id: schema.courseReview.id,
				courseTitle: schema.course.title,
				userName: schema.user.name,
				userImage: schema.user.image,
				rating: schema.courseReview.rating,
				content: schema.courseReview.content,
				accessSource: schema.courseReview.accessSource,
				status: schema.courseReview.status,
				featuredAt: schema.courseReview.featuredAt,
				updatedAt: schema.courseReview.updatedAt,
				reportId: schema.reviewReport.id,
				reportStatus: schema.reviewReport.status,
				reportReason: schema.reviewReport.reason,
			})
			.from(schema.courseReview)
			.innerJoin(
				schema.course,
				eq(schema.courseReview.courseId, schema.course.id),
			)
			.innerJoin(schema.user, eq(schema.courseReview.userId, schema.user.id))
			.leftJoin(
				schema.reviewReport,
				and(
					eq(schema.reviewReport.reviewId, schema.courseReview.id),
					eq(schema.reviewReport.organizationId, organizationId),
				),
			)
			.where(and(...filters))
			.orderBy(desc(schema.courseReview.updatedAt));
	});

export const reportCourseReview = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = record(input);
		const reason = requiredText(values.reason, "Report reason", 1_000);
		if (reason.length < 10)
			throw new Error("Report reason must be at least 10 characters.");
		return { reviewId: requiredText(values.reviewId, "Review", 100), reason };
	})
	.handler(async ({ data }) => {
		const { organizationId } = await ownerContext();
		const [review] = await db
			.select({ id: schema.courseReview.id })
			.from(schema.courseReview)
			.where(
				and(
					eq(schema.courseReview.id, data.reviewId),
					eq(schema.courseReview.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!review) throw new Error("Review not found in this organization.");
		const id = crypto.randomUUID();
		await db
			.insert(schema.reviewReport)
			.values({
				id,
				reviewId: review.id,
				organizationId,
				reason: data.reason,
				status: "pending",
				resolvedAt: null,
				resolvedBy: null,
			})
			.onConflictDoUpdate({
				target: [
					schema.reviewReport.reviewId,
					schema.reviewReport.organizationId,
				],
				set: {
					reason: data.reason,
					status: "pending",
					resolvedAt: null,
					resolvedBy: null,
					updatedAt: new Date(),
				},
			});
		return { id };
	});

export const setReviewFeatured = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = record(input);
		return {
			id: requiredText(values.id, "Review", 100),
			featured: values.featured === true,
		};
	})
	.handler(async ({ data }) => {
		const { organizationId } = await ownerContext();
		const [review] = await db
			.select({
				id: schema.courseReview.id,
				status: schema.courseReview.status,
				featuredAt: schema.courseReview.featuredAt,
			})
			.from(schema.courseReview)
			.where(
				and(
					eq(schema.courseReview.id, data.id),
					eq(schema.courseReview.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!review) throw new Error("Review not found in this organization.");
		if (data.featured && review.status !== "published")
			throw new Error("Only published reviews can be featured.");
		if (data.featured && !review.featuredAt) {
			const [{ count }] = await db
				.select({ count: sql<number>`count(*)` })
				.from(schema.courseReview)
				.where(
					and(
						eq(schema.courseReview.organizationId, organizationId),
						eq(schema.courseReview.status, "published"),
						sql`${schema.courseReview.featuredAt} is not null`,
						ne(schema.courseReview.id, review.id),
					),
				);
			if (Number(count) >= 6)
				throw new Error("A storefront can feature up to six testimonials.");
		}
		await db
			.update(schema.courseReview)
			.set({
				featuredAt: data.featured ? new Date() : null,
				updatedAt: new Date(),
			})
			.where(eq(schema.courseReview.id, review.id));
		return { featured: data.featured };
	});

export const listAdminReviews = createServerFn({ method: "GET" }).handler(
	async () => {
		await adminContext();
		return db
			.select({
				id: schema.courseReview.id,
				organizationName: schema.organization.name,
				courseTitle: schema.course.title,
				userName: schema.user.name,
				rating: schema.courseReview.rating,
				content: schema.courseReview.content,
				status: schema.courseReview.status,
				featuredAt: schema.courseReview.featuredAt,
				updatedAt: schema.courseReview.updatedAt,
				reportId: schema.reviewReport.id,
				reportReason: schema.reviewReport.reason,
				reportStatus: schema.reviewReport.status,
			})
			.from(schema.courseReview)
			.innerJoin(
				schema.organization,
				eq(schema.courseReview.organizationId, schema.organization.id),
			)
			.innerJoin(
				schema.course,
				eq(schema.courseReview.courseId, schema.course.id),
			)
			.innerJoin(schema.user, eq(schema.courseReview.userId, schema.user.id))
			.leftJoin(
				schema.reviewReport,
				eq(schema.reviewReport.reviewId, schema.courseReview.id),
			)
			.orderBy(
				desc(schema.reviewReport.createdAt),
				desc(schema.courseReview.updatedAt),
			);
	},
);

export const moderateReview = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = record(input);
		const action = values.action;
		if (action !== "hide" && action !== "restore" && action !== "dismiss")
			throw new Error("Invalid moderation action.");
		return {
			id: requiredText(
				values.id,
				action === "dismiss" ? "Report" : "Review",
				100,
			),
			action,
		};
	})
	.handler(async ({ data }) => {
		const session = await adminContext();
		const now = new Date();
		if (data.action === "dismiss") {
			const result = await db
				.update(schema.reviewReport)
				.set({
					status: "dismissed",
					resolvedBy: session.user.id,
					resolvedAt: now,
					updatedAt: now,
				})
				.where(
					and(
						eq(schema.reviewReport.id, data.id),
						eq(schema.reviewReport.status, "pending"),
					),
				);
			if (!result.meta.changes) throw new Error("Pending report not found.");
			return { action: data.action };
		}
		const [review] = await db
			.select({ id: schema.courseReview.id })
			.from(schema.courseReview)
			.where(eq(schema.courseReview.id, data.id))
			.limit(1);
		if (!review) throw new Error("Review not found.");
		if (data.action === "hide") {
			await db.batch([
				db
					.update(schema.courseReview)
					.set({ status: "hidden", featuredAt: null, updatedAt: now })
					.where(eq(schema.courseReview.id, review.id)),
				db
					.update(schema.reviewReport)
					.set({
						status: "actioned",
						resolvedBy: session.user.id,
						resolvedAt: now,
						updatedAt: now,
					})
					.where(
						and(
							eq(schema.reviewReport.reviewId, review.id),
							eq(schema.reviewReport.status, "pending"),
						),
					),
			]);
		} else {
			await db
				.update(schema.courseReview)
				.set({ status: "published", updatedAt: now })
				.where(eq(schema.courseReview.id, review.id));
		}
		return { action: data.action };
	});
