import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import {
	activateEnrollment,
	hasPermanentAccess,
	reconcileCourseAccess,
} from "@/lib/access.server";
import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });
const checkoutLifetimeMs = 30 * 60 * 1_000;
const refundWindowMs = 14 * 24 * 60 * 60 * 1_000;
const platformFeePercent = 10;

function record(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("Invalid request.");
	return value as Record<string, unknown>;
}
function required(value: unknown, label: string, max = 120) {
	const result = typeof value === "string" ? value.trim() : "";
	if (!result) throw new Error(`${label} is required.`);
	if (result.length > max) throw new Error(`${label} is too long.`);
	return result;
}
function optional(value: unknown, max = 1000) {
	const result = typeof value === "string" ? value.trim() : "";
	if (result.length > max) throw new Error("Text is too long.");
	return result;
}
function validateId(input: unknown) {
	return { id: required(record(input).id, "Order") };
}
function validateOffer(input: unknown) {
	return { offerId: required(record(input).offerId, "Offer") };
}
function validateRefund(input: unknown) {
	const values = record(input);
	return {
		orderId: required(values.orderId, "Order"),
		reason: required(values.reason, "Refund reason", 1000),
	};
}
function validateResolution(input: unknown) {
	const values = record(input);
	if (values.decision !== "approved" && values.decision !== "rejected")
		throw new Error("Select a valid refund decision.");
	return {
		refundId: required(values.refundId, "Refund request"),
		decision: values.decision,
		note: optional(values.note),
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
			(item) => item.id === context.session.session.activeOrganizationId,
		)
			? context.session.session.activeOrganizationId
			: organizations[0]?.id;
	if (!activeOrganizationId) throw new Error("Select an organization first.");
	const organization = await auth.api.getFullOrganization({
		headers: context.headers,
		query: { organizationId: activeOrganizationId },
	});
	const role = organization?.members.find(
		(item) => item.userId === context.session.user.id,
	)?.role;
	if (!role?.split(",").includes("owner"))
		throw new Error("Organization owner access is required.");
	return { ...context, activeOrganizationId };
}
async function requirePlatformAdmin() {
	const context = await requireSession();
	if (
		!context.session.user.role?.split(",").includes("admin") ||
		context.session.session.impersonatedBy
	)
		throw new Error("Platform administrator access is required.");
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

async function offerCourses(offerId: string) {
	return db
		.select({
			id: schema.course.id,
			slug: schema.course.slug,
			title: schema.course.title,
			status: schema.course.status,
		})
		.from(schema.offer)
		.innerJoin(schema.product, eq(schema.offer.productId, schema.product.id))
		.innerJoin(
			schema.productCourse,
			eq(schema.product.id, schema.productCourse.productId),
		)
		.innerJoin(
			schema.course,
			eq(schema.productCourse.courseId, schema.course.id),
		)
		.where(eq(schema.offer.id, offerId))
		.orderBy(asc(schema.productCourse.position));
}

async function firstLessonId(courseId: string) {
	const [lesson] = await db
		.select({ id: schema.lesson.id })
		.from(schema.lesson)
		.innerJoin(
			schema.courseSection,
			eq(schema.lesson.sectionId, schema.courseSection.id),
		)
		.where(eq(schema.courseSection.courseId, courseId))
		.orderBy(asc(schema.courseSection.position), asc(schema.lesson.position))
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
	courseId: schema.courseOrder.courseId,
	courseSlug: schema.course.slug,
	courseTitle: sql<string>`coalesce(${schema.courseOrder.productNameSnapshot}, ${schema.course.title})`,
	thumbnailUrl: sql<
		string | null
	>`coalesce(${schema.product.imageUrl}, ${schema.course.thumbnailUrl})`,
	productId: schema.courseOrder.productId,
	productSlug: schema.product.slug,
	productName: schema.courseOrder.productNameSnapshot,
	offerId: schema.courseOrder.offerId,
	offerName: schema.courseOrder.offerNameSnapshot,
	billingType: schema.courseOrder.billingTypeSnapshot,
	billingInterval: schema.courseOrder.billingIntervalSnapshot,
	subscriptionId: schema.courseOrder.subscriptionId,
	organizationId: schema.organization.id,
	organizationName: schema.organization.name,
	organizationSlug: schema.organization.slug,
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
		.leftJoin(schema.course, eq(schema.courseOrder.courseId, schema.course.id))
		.leftJoin(
			schema.product,
			eq(schema.courseOrder.productId, schema.product.id),
		)
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
	.validator(validateOffer)
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		await expirePendingOrders(session.user.id);
		const [offer] = await db
			.select({
				id: schema.offer.id,
				productId: schema.product.id,
				productName: schema.product.name,
				productStatus: schema.product.status,
				organizationId: schema.product.organizationId,
				offerName: schema.offer.name,
				priceInSen: schema.offer.priceInSen,
				currency: schema.offer.currency,
				billingType: schema.offer.billingType,
				billingInterval: schema.offer.billingInterval,
				offerStatus: schema.offer.status,
			})
			.from(schema.offer)
			.innerJoin(schema.product, eq(schema.offer.productId, schema.product.id))
			.where(eq(schema.offer.id, data.offerId))
			.limit(1);
		if (
			!offer ||
			offer.offerStatus !== "active" ||
			offer.productStatus !== "published"
		)
			throw new Error("This offer is unavailable.");
		const courses = await offerCourses(offer.id);
		if (
			!courses.length ||
			courses.some((course) => course.status !== "published")
		)
			throw new Error("A course in this product is unavailable.");
		if (offer.billingType === "one_time") {
			const owned = await Promise.all(
				courses.map((course) => hasPermanentAccess(session.user.id, course.id)),
			);
			if (owned.every(Boolean))
				throw new Error("You already own every course in this product.");
		}
		const [pending] = await db
			.select({ id: schema.courseOrder.id })
			.from(schema.courseOrder)
			.where(
				and(
					eq(schema.courseOrder.buyerId, session.user.id),
					eq(schema.courseOrder.offerId, offer.id),
					eq(schema.courseOrder.status, "pending"),
					gt(schema.courseOrder.expiresAt, new Date()),
				),
			)
			.orderBy(desc(schema.courseOrder.createdAt))
			.limit(1);
		if (pending) return { orderId: pending.id, reused: true };
		const id = crypto.randomUUID();
		const fee = Math.round((offer.priceInSen * platformFeePercent) / 100);
		await db.insert(schema.courseOrder).values({
			id,
			buyerId: session.user.id,
			courseId: courses[0]?.id ?? null,
			productId: offer.productId,
			offerId: offer.id,
			organizationId: offer.organizationId,
			currency: offer.currency,
			grossInSen: offer.priceInSen,
			platformFeeInSen: fee,
			sellerNetInSen: offer.priceInSen - fee,
			productNameSnapshot: offer.productName,
			offerNameSnapshot: offer.offerName,
			billingTypeSnapshot: offer.billingType,
			billingIntervalSnapshot: offer.billingInterval,
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
		const courses = order.offerId ? await offerCourses(order.offerId) : [];
		const ownership = await Promise.all(
			courses.map((course) => hasPermanentAccess(session.user.id, course.id)),
		);
		return {
			...order,
			courses: courses.map((course, index) => ({
				...course,
				alreadyOwned: ownership[index],
			})),
		};
	});

export const confirmMockPayment = createServerFn({ method: "POST" })
	.validator(validateId)
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		await expirePendingOrders(session.user.id);
		const [order] = await db
			.select()
			.from(schema.courseOrder)
			.where(
				and(
					eq(schema.courseOrder.id, data.id),
					eq(schema.courseOrder.buyerId, session.user.id),
				),
			)
			.limit(1);
		if (!order) throw new Error("Checkout order not found.");
		if (order.status === "paid") {
			const courses = order.offerId ? await offerCourses(order.offerId) : [];
			return {
				paid: true,
				courseSlug: courses[0]?.slug ?? "",
				firstLessonId: courses[0] ? await firstLessonId(courses[0].id) : null,
				subscriptionId: order.subscriptionId,
			};
		}
		if (order.status !== "pending" || order.expiresAt <= new Date())
			throw new Error("This checkout has expired.");
		if (!order.offerId || order.billingTypeSnapshot !== "one_time")
			throw new Error(
				"Membership activation is available in the next milestone.",
			);
		const courses = await offerCourses(order.offerId);
		if (
			!courses.length ||
			courses.some((course) => course.status !== "published")
		)
			throw new Error("A course in this product is unavailable.");
		const now = new Date();
		await db.batch([
			db
				.update(schema.courseOrder)
				.set({
					status: "paid",
					mockPaymentReference: `MOCK-${order.id}`,
					paidAt: now,
					updatedAt: now,
				})
				.where(
					and(
						eq(schema.courseOrder.id, order.id),
						eq(schema.courseOrder.status, "pending"),
					),
				),
			...courses.map((course) =>
				db
					.insert(schema.orderEntitlement)
					.values({
						id: crypto.randomUUID(),
						orderId: order.id,
						courseId: course.id,
					})
					.onConflictDoUpdate({
						target: [
							schema.orderEntitlement.orderId,
							schema.orderEntitlement.courseId,
						],
						set: { status: "active", revokedAt: null },
					}),
			),
		]);
		for (const course of courses)
			await activateEnrollment(session.user.id, course.id, now);
		return {
			paid: true,
			courseSlug: courses[0].slug,
			firstLessonId: await firstLessonId(courses[0].id),
			subscriptionId: null,
		};
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
	.validator(validateRefund)
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
		if (!order || order.status !== "paid" || !order.paidAt)
			throw new Error("Only your paid purchases can be refunded.");
		if (Date.now() - order.paidAt.getTime() > refundWindowMs)
			throw new Error("The 14-day refund window has ended.");
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
			(sum, order) => {
				if (order.status === "paid") {
					sum.grossInSen += order.grossInSen;
					sum.platformFeeInSen += order.platformFeeInSen;
					sum.sellerNetInSen += order.sellerNetInSen;
				}
				return sum;
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
	.validator(validateResolution)
	.handler(async ({ data }) => {
		const { session } = await requirePlatformAdmin();
		const [request] = await db
			.select({
				id: schema.refundRequest.id,
				status: schema.refundRequest.status,
				orderId: schema.courseOrder.id,
				orderStatus: schema.courseOrder.status,
				buyerId: schema.courseOrder.buyerId,
			})
			.from(schema.refundRequest)
			.innerJoin(
				schema.courseOrder,
				eq(schema.refundRequest.orderId, schema.courseOrder.id),
			)
			.where(eq(schema.refundRequest.id, data.refundId))
			.limit(1);
		if (
			!request ||
			request.status !== "pending" ||
			request.orderStatus !== "paid"
		)
			throw new Error("This refund cannot be resolved.");
		const now = new Date();
		const resolution = db
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
		if (data.decision === "rejected") {
			await resolution;
			return { status: data.decision };
		}
		const entitlements = await db
			.select({ courseId: schema.orderEntitlement.courseId })
			.from(schema.orderEntitlement)
			.where(eq(schema.orderEntitlement.orderId, request.orderId));
		await db.batch([
			resolution,
			db
				.update(schema.courseOrder)
				.set({ status: "refunded", refundedAt: now, updatedAt: now })
				.where(eq(schema.courseOrder.id, request.orderId)),
			db
				.update(schema.orderEntitlement)
				.set({ status: "revoked", revokedAt: now })
				.where(eq(schema.orderEntitlement.orderId, request.orderId)),
		]);
		await reconcileCourseAccess(
			request.buyerId,
			entitlements.map((item) => item.courseId),
			now,
		);
		return { status: data.decision };
	});
