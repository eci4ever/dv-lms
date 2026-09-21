import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
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

async function requireSession() {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session) throw new Error("Authentication required.");
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
