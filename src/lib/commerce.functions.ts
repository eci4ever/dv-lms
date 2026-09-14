import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });
const checkoutLifetimeMs = 30 * 60 * 1_000;
const refundWindowMs = 14 * 24 * 60 * 60 * 1_000;
const platformFeePercent = 10;

function asRecord(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Invalid request.");
	}
	return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, maximumLength = 120) {
	const text = typeof value === "string" ? value.trim() : "";
	if (!text) throw new Error(`${label} is required.`);
	if (text.length > maximumLength) {
		throw new Error(`${label} must be ${maximumLength} characters or fewer.`);
	}
	return text;
}

function optionalString(value: unknown, maximumLength = 500) {
	const text = typeof value === "string" ? value.trim() : "";
	if (text.length > maximumLength) {
		throw new Error(`Text must be ${maximumLength} characters or fewer.`);
	}
	return text;
}

function validateId(input: unknown) {
	const values = asRecord(input);
	return { id: requiredString(values.id, "Order") };
}

function validateSlug(input: unknown) {
	const values = asRecord(input);
	return { slug: requiredString(values.slug, "Course URL") };
}

function validateRefundRequest(input: unknown) {
	const values = asRecord(input);
	return {
		orderId: requiredString(values.orderId, "Order"),
		reason: requiredString(values.reason, "Refund reason", 1_000),
	};
}

function validateRefundResolution(input: unknown) {
	const values = asRecord(input);
	const decision = values.decision;
	if (decision !== "approved" && decision !== "rejected") {
		throw new Error("Select a valid refund decision.");
	}
	return {
		refundId: requiredString(values.refundId, "Refund request"),
		decision,
		note: optionalString(values.note, 1_000),
	};
}

async function requireSession() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Authentication required.");
	return { headers, session };
}

async function requireOwner() {
	const context = await requireSession();
	const organizations = await auth.api.listOrganizations({
		headers: context.headers,
	});
	const activeOrganizationId =
		context.session.session.activeOrganizationId &&
		organizations.some(
			(organization) =>
				organization.id === context.session.session.activeOrganizationId,
		)
			? context.session.session.activeOrganizationId
			: organizations[0]?.id;
	if (!activeOrganizationId) throw new Error("Select an organization first.");
	const organization = await auth.api.getFullOrganization({
		headers: context.headers,
		query: { organizationId: activeOrganizationId },
	});
	const role = organization?.members.find(
		(member) => member.userId === context.session.user.id,
	)?.role;
	if (!role?.split(",").includes("owner")) {
		throw new Error("Organization owner access is required.");
	}
	return { ...context, activeOrganizationId };
}

async function requirePlatformAdmin() {
	const context = await requireSession();
	if (
		!context.session.user.role?.split(",").includes("admin") ||
		context.session.session.impersonatedBy
	) {
		throw new Error("Platform administrator access is required.");
	}
	return context;
}

async function expirePendingOrders(buyerId?: string) {
	const filters = [
		eq(schema.courseOrder.status, "pending"),
		lte(schema.courseOrder.expiresAt, new Date()),
	];
	if (buyerId) filters.push(eq(schema.courseOrder.buyerId, buyerId));
	await db
		.update(schema.courseOrder)
		.set({ status: "expired", updatedAt: new Date() })
		.where(and(...filters));
}

async function getFirstLessonId(courseId: string) {
	const [lesson] = await db
		.select({ id: schema.lesson.id })
		.from(schema.lesson)
		.innerJoin(
			schema.courseSection,
			eq(schema.lesson.sectionId, schema.courseSection.id),
		)
		.where(eq(schema.courseSection.courseId, courseId))
		.orderBy(schema.courseSection.position, schema.lesson.position)
		.limit(1);
	return lesson?.id ?? null;
}

const orderSelection = {
	id: schema.courseOrder.id,
	status: schema.courseOrder.status,
	currency: schema.courseOrder.currency,
	grossInSen: schema.courseOrder.grossInSen,
	platformFeeInSen: schema.courseOrder.platformFeeInSen,
	sellerNetInSen: schema.courseOrder.sellerNetInSen,
	mockPaymentReference: schema.courseOrder.mockPaymentReference,
	expiresAt: schema.courseOrder.expiresAt,
	paidAt: schema.courseOrder.paidAt,
	refundedAt: schema.courseOrder.refundedAt,
	createdAt: schema.courseOrder.createdAt,
	courseId: schema.course.id,
	courseSlug: schema.course.slug,
	courseTitle: schema.course.title,
	thumbnailUrl: schema.course.thumbnailUrl,
	organizationId: schema.organization.id,
	organizationName: schema.organization.name,
	buyerId: schema.user.id,
	buyerName: schema.user.name,
	buyerEmail: schema.user.email,
	refundId: schema.refundRequest.id,
	refundStatus: schema.refundRequest.status,
	refundReason: schema.refundRequest.reason,
	refundRequestedAt: schema.refundRequest.requestedAt,
	refundResolutionNote: schema.refundRequest.resolutionNote,
};

function orderQuery() {
	return db
		.select(orderSelection)
		.from(schema.courseOrder)
		.innerJoin(schema.course, eq(schema.courseOrder.courseId, schema.course.id))
		.innerJoin(
			schema.organization,
			eq(schema.courseOrder.organizationId, schema.organization.id),
		)
		.innerJoin(schema.user, eq(schema.courseOrder.buyerId, schema.user.id))
		.leftJoin(
			schema.refundRequest,
			eq(schema.refundRequest.orderId, schema.courseOrder.id),
		);
}

export const createCheckout = createServerFn({ method: "POST" })
	.validator(validateSlug)
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		await expirePendingOrders(session.user.id);
		const [course] = await db
			.select({
				id: schema.course.id,
				organizationId: schema.course.organizationId,
				priceInSen: schema.course.priceInSen,
			})
			.from(schema.course)
			.where(
				and(
					eq(schema.course.slug, data.slug),
					eq(schema.course.status, "published"),
				),
			)
			.limit(1);
		if (!course) throw new Error("Published course not found.");
		if (course.priceInSen <= 0) throw new Error("This course is free.");
		const [activeEnrollment] = await db
			.select({ id: schema.enrollment.id })
			.from(schema.enrollment)
			.where(
				and(
					eq(schema.enrollment.courseId, course.id),
					eq(schema.enrollment.userId, session.user.id),
					inArray(schema.enrollment.status, ["active", "completed"]),
				),
			)
			.limit(1);
		if (activeEnrollment) throw new Error("You are already enrolled.");
		const [pending] = await db
			.select({ id: schema.courseOrder.id })
			.from(schema.courseOrder)
			.where(
				and(
					eq(schema.courseOrder.buyerId, session.user.id),
					eq(schema.courseOrder.courseId, course.id),
					eq(schema.courseOrder.status, "pending"),
					gt(schema.courseOrder.expiresAt, new Date()),
				),
			)
			.orderBy(desc(schema.courseOrder.createdAt))
			.limit(1);
		if (pending) return { orderId: pending.id, reused: true };

		const id = crypto.randomUUID();
		const platformFeeInSen = Math.round(
			(course.priceInSen * platformFeePercent) / 100,
		);
		await db.insert(schema.courseOrder).values({
			id,
			buyerId: session.user.id,
			courseId: course.id,
			organizationId: course.organizationId,
			grossInSen: course.priceInSen,
			platformFeeInSen,
			sellerNetInSen: course.priceInSen - platformFeeInSen,
			expiresAt: new Date(Date.now() + checkoutLifetimeMs),
		});
		return { orderId: id, reused: false };
	});

export const getCheckoutOrder = createServerFn({ method: "GET" })
	.validator(validateId)
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		await expirePendingOrders(session.user.id);
		const [order] = await orderQuery()
			.where(
				and(
					eq(schema.courseOrder.id, data.id),
					eq(schema.courseOrder.buyerId, session.user.id),
				),
			)
			.limit(1);
		if (!order) throw new Error("Checkout order not found.");
		return order;
	});

export const confirmMockPayment = createServerFn({ method: "POST" })
	.validator(validateId)
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		await expirePendingOrders(session.user.id);
		const [order] = await db
			.select({
				id: schema.courseOrder.id,
				status: schema.courseOrder.status,
				expiresAt: schema.courseOrder.expiresAt,
				courseId: schema.courseOrder.courseId,
				courseSlug: schema.course.slug,
				courseStatus: schema.course.status,
			})
			.from(schema.courseOrder)
			.innerJoin(
				schema.course,
				eq(schema.courseOrder.courseId, schema.course.id),
			)
			.where(
				and(
					eq(schema.courseOrder.id, data.id),
					eq(schema.courseOrder.buyerId, session.user.id),
				),
			)
			.limit(1);
		if (!order) throw new Error("Checkout order not found.");
		if (!order.courseId) throw new Error("This legacy checkout has no course.");
		const courseId = order.courseId;
		const firstLessonId = await getFirstLessonId(courseId);
		if (order.status === "paid") {
			return { paid: true, courseSlug: order.courseSlug, firstLessonId };
		}
		if (order.status !== "pending" || order.expiresAt <= new Date()) {
			throw new Error("This checkout has expired.");
		}
		if (order.courseStatus !== "published") {
			throw new Error("This course is no longer available for purchase.");
		}

		const [existingEnrollment] = await db
			.select({ id: schema.enrollment.id })
			.from(schema.enrollment)
			.where(
				and(
					eq(schema.enrollment.courseId, courseId),
					eq(schema.enrollment.userId, session.user.id),
				),
			)
			.limit(1);
		const enrollmentId = existingEnrollment?.id ?? crypto.randomUUID();
		const [progress] = existingEnrollment
			? await db
					.select({
						total: sql<number>`count(distinct ${schema.lesson.id})`,
						completed: sql<number>`count(distinct case when ${schema.lessonProgress.completedAt} is not null then ${schema.lessonProgress.lessonId} end)`,
					})
					.from(schema.lesson)
					.innerJoin(
						schema.courseSection,
						eq(schema.lesson.sectionId, schema.courseSection.id),
					)
					.leftJoin(
						schema.lessonProgress,
						and(
							eq(schema.lessonProgress.enrollmentId, enrollmentId),
							eq(schema.lessonProgress.lessonId, schema.lesson.id),
						),
					)
					.where(eq(schema.courseSection.courseId, courseId))
			: [{ total: 0, completed: 0 }];
		const restoresCompletedCourse =
			Number(progress.total) > 0 &&
			Number(progress.completed) === Number(progress.total);
		const enrollmentStatus = restoresCompletedCourse ? "completed" : "active";
		const paymentReference = `MOCK-${order.id}`;
		const now = new Date();
		await db.batch([
			db
				.update(schema.courseOrder)
				.set({
					status: "paid",
					mockPaymentReference: paymentReference,
					paidAt: now,
					updatedAt: now,
				})
				.where(
					and(
						eq(schema.courseOrder.id, order.id),
						eq(schema.courseOrder.status, "pending"),
					),
				),
			db
				.insert(schema.enrollment)
				.values({
					id: enrollmentId,
					courseId,
					userId: session.user.id,
					status: enrollmentStatus,
					completedAt: restoresCompletedCourse ? now : null,
				})
				.onConflictDoUpdate({
					target: [schema.enrollment.courseId, schema.enrollment.userId],
					set: {
						status: enrollmentStatus,
						completedAt: restoresCompletedCourse ? now : null,
						updatedAt: now,
					},
				}),
		]);
		return { paid: true, courseSlug: order.courseSlug, firstLessonId };
	});

export const listPurchases = createServerFn({ method: "GET" }).handler(
	async () => {
		const { session } = await requireSession();
		await expirePendingOrders(session.user.id);
		return orderQuery()
			.where(eq(schema.courseOrder.buyerId, session.user.id))
			.orderBy(desc(schema.courseOrder.createdAt));
	},
);

export const requestRefund = createServerFn({ method: "POST" })
	.validator(validateRefundRequest)
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		const [order] = await db
			.select({
				id: schema.courseOrder.id,
				status: schema.courseOrder.status,
				paidAt: schema.courseOrder.paidAt,
			})
			.from(schema.courseOrder)
			.where(
				and(
					eq(schema.courseOrder.id, data.orderId),
					eq(schema.courseOrder.buyerId, session.user.id),
				),
			)
			.limit(1);
		if (!order) throw new Error("Purchase not found.");
		if (order.status !== "paid" || !order.paidAt) {
			throw new Error("Only paid purchases can be refunded.");
		}
		if (Date.now() - order.paidAt.getTime() > refundWindowMs) {
			throw new Error("The 14-day refund window has ended.");
		}
		const [existing] = await db
			.select({ id: schema.refundRequest.id })
			.from(schema.refundRequest)
			.where(eq(schema.refundRequest.orderId, order.id))
			.limit(1);
		if (existing)
			throw new Error("A refund decision already exists for this order.");
		const id = crypto.randomUUID();
		await db.insert(schema.refundRequest).values({
			id,
			orderId: order.id,
			requesterId: session.user.id,
			reason: data.reason,
		});
		return { id, status: "pending" as const };
	});

export const listOrganizationSales = createServerFn({ method: "GET" }).handler(
	async () => {
		const { activeOrganizationId } = await requireOwner();
		await expirePendingOrders();
		const orders = await orderQuery()
			.where(eq(schema.courseOrder.organizationId, activeOrganizationId))
			.orderBy(desc(schema.courseOrder.createdAt));
		const totals = orders.reduce(
			(accumulator, order) => {
				if (order.status === "paid") {
					accumulator.grossInSen += order.grossInSen;
					accumulator.platformFeeInSen += order.platformFeeInSen;
					accumulator.sellerNetInSen += order.sellerNetInSen;
				}
				return accumulator;
			},
			{ grossInSen: 0, platformFeeInSen: 0, sellerNetInSen: 0 },
		);
		return { orders, totals };
	},
);

export const listAdminOrders = createServerFn({ method: "GET" }).handler(
	async () => {
		await requirePlatformAdmin();
		await expirePendingOrders();
		return orderQuery().orderBy(desc(schema.courseOrder.createdAt));
	},
);

export const resolveRefund = createServerFn({ method: "POST" })
	.validator(validateRefundResolution)
	.handler(async ({ data }) => {
		const { session } = await requirePlatformAdmin();
		const [request] = await db
			.select({
				id: schema.refundRequest.id,
				status: schema.refundRequest.status,
				orderId: schema.courseOrder.id,
				orderStatus: schema.courseOrder.status,
				courseId: schema.courseOrder.courseId,
				buyerId: schema.courseOrder.buyerId,
			})
			.from(schema.refundRequest)
			.innerJoin(
				schema.courseOrder,
				eq(schema.refundRequest.orderId, schema.courseOrder.id),
			)
			.where(eq(schema.refundRequest.id, data.refundId))
			.limit(1);
		if (!request) throw new Error("Refund request not found.");
		if (!request.courseId) throw new Error("This legacy order has no course.");
		if (request.status !== "pending") {
			throw new Error("This refund request has already been resolved.");
		}
		if (request.orderStatus !== "paid") {
			throw new Error("Only paid orders can be resolved.");
		}
		const now = new Date();
		const resolveStatement = db
			.update(schema.refundRequest)
			.set({
				status: data.decision,
				resolvedBy: session.user.id,
				resolutionNote: data.note || null,
				resolvedAt: now,
			})
			.where(
				and(
					eq(schema.refundRequest.id, request.id),
					eq(schema.refundRequest.status, "pending"),
				),
			);
		if (data.decision === "approved") {
			await db.batch([
				resolveStatement,
				db
					.update(schema.courseOrder)
					.set({ status: "refunded", refundedAt: now, updatedAt: now })
					.where(eq(schema.courseOrder.id, request.orderId)),
				db
					.update(schema.enrollment)
					.set({ status: "cancelled", completedAt: null, updatedAt: now })
					.where(
						and(
							eq(schema.enrollment.courseId, request.courseId),
							eq(schema.enrollment.userId, request.buyerId),
						),
					),
			]);
		} else {
			await resolveStatement;
		}
		return { status: data.decision };
	});
