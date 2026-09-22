import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { alias } from "drizzle-orm/sqlite-core";

import {
	activateEnrollment,
	expireMemberships,
	hasPermanentAccess,
	reconcileCourseAccess,
} from "@/lib/access.server";
import {
	analyticsCookieName,
	cookieValue,
	recordAnalyticsEvent,
} from "@/lib/analytics.server";
import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";
import {
	creatorStatus,
	getPlatformSettings,
	writeAudit,
} from "@/lib/platform.server";

const db = drizzle(env.DB, { schema });
const customer = alias(schema.user, "customer");
const checkoutLifetimeMs = 30 * 60 * 1_000;

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
		const { headers, session } = await requireSession();
		const settings = await getPlatformSettings();
		if (settings.maintenanceMode)
			throw new Error("Checkout is temporarily unavailable.");
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
		if ((await creatorStatus(offer.organizationId)) !== "approved")
			throw new Error("This creator is not available for new purchases.");
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
		const visitorId =
			cookieValue(headers.get("cookie"), analyticsCookieName) ??
			`user-${session.user.id}`;
		if (pending) {
			await recordAnalyticsEvent({
				organizationId: offer.organizationId,
				productId: offer.productId,
				userId: session.user.id,
				eventType: "checkout_started",
				visitorId,
				source: "checkout",
			});
			return { orderId: pending.id, reused: true };
		}
		const id = crypto.randomUUID();
		const fee = Math.round(
			(offer.priceInSen * settings.platformFeePercent) / 100,
		);
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
			platformFeePercentSnapshot: settings.platformFeePercent,
			refundWindowDaysSnapshot: settings.refundWindowDays,
			expiresAt: new Date(Date.now() + checkoutLifetimeMs),
		});
		await recordAnalyticsEvent({
			organizationId: offer.organizationId,
			productId: offer.productId,
			userId: session.user.id,
			eventType: "checkout_started",
			visitorId,
			source: "checkout",
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
		if (!order.offerId) throw new Error("This order has no offer.");
		const courses = await offerCourses(order.offerId);
		if (
			!courses.length ||
			courses.some((course) => course.status !== "published")
		)
			throw new Error("A course in this product is unavailable.");
		const now = new Date();
		if (order.billingTypeSnapshot === "recurring") {
			const subscriptionId = `subscription-${order.id}`;
			const periodEnd = new Date(now);
			periodEnd.setUTCDate(
				periodEnd.getUTCDate() +
					(order.billingIntervalSnapshot === "year" ? 365 : 30),
			);
			await db.batch([
				db
					.insert(schema.subscription)
					.values({
						id: subscriptionId,
						buyerId: session.user.id,
						offerId: order.offerId,
						organizationId: order.organizationId,
						currentPeriodStart: now,
						currentPeriodEnd: periodEnd,
					})
					.onConflictDoNothing(),
				db
					.update(schema.courseOrder)
					.set({
						status: "paid",
						subscriptionId,
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
						.insert(schema.subscriptionEntitlement)
						.values({
							id: crypto.randomUUID(),
							subscriptionId,
							courseId: course.id,
						})
						.onConflictDoUpdate({
							target: [
								schema.subscriptionEntitlement.subscriptionId,
								schema.subscriptionEntitlement.courseId,
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
				subscriptionId,
			};
		}
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

function validateRenewal(input: unknown) {
	const values = record(input);
	return {
		subscriptionId: required(values.subscriptionId, "Membership"),
		renewalKey: required(values.renewalKey, "Renewal key"),
	};
}

export const listMemberships = createServerFn({ method: "GET" }).handler(
	async () => {
		const { session } = await requireSession();
		await expireMemberships(session.user.id);
		return db
			.select({
				id: schema.subscription.id,
				status: schema.subscription.status,
				currentPeriodStart: schema.subscription.currentPeriodStart,
				currentPeriodEnd: schema.subscription.currentPeriodEnd,
				cancelAtPeriodEnd: schema.subscription.cancelAtPeriodEnd,
				cancelledAt: schema.subscription.cancelledAt,
				productName: schema.product.name,
				productSlug: schema.product.slug,
				creatorName: schema.organization.name,
				creatorSlug: schema.organization.slug,
				offerName: schema.offer.name,
				priceInSen: schema.offer.priceInSen,
				billingInterval: schema.offer.billingInterval,
			})
			.from(schema.subscription)
			.innerJoin(schema.offer, eq(schema.subscription.offerId, schema.offer.id))
			.innerJoin(schema.product, eq(schema.offer.productId, schema.product.id))
			.innerJoin(
				schema.organization,
				eq(schema.subscription.organizationId, schema.organization.id),
			)
			.where(eq(schema.subscription.buyerId, session.user.id))
			.orderBy(desc(schema.subscription.createdAt));
	},
);

export const cancelMembership = createServerFn({ method: "POST" })
	.validator((input: unknown) => ({
		id: required(record(input).id, "Membership"),
	}))
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		await expireMemberships(session.user.id);
		const [item] = await db
			.select({ id: schema.subscription.id })
			.from(schema.subscription)
			.where(
				and(
					eq(schema.subscription.id, data.id),
					eq(schema.subscription.buyerId, session.user.id),
					eq(schema.subscription.status, "active"),
				),
			)
			.limit(1);
		if (!item) throw new Error("Active membership not found.");
		await db
			.update(schema.subscription)
			.set({
				status: "cancelled",
				cancelAtPeriodEnd: true,
				cancelledAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(schema.subscription.id, item.id));
		return { cancelled: true };
	});

export const renewMockMembership = createServerFn({ method: "POST" })
	.validator(validateRenewal)
	.handler(async ({ data }) => {
		const { session } = await requireSession();
		const settings = await getPlatformSettings();
		if (settings.maintenanceMode)
			throw new Error("Membership renewal is temporarily unavailable.");
		await expireMemberships(session.user.id);
		const reference = `MOCK-RENEW-${data.renewalKey}`;
		const [existing] = await db
			.select({ id: schema.courseOrder.id })
			.from(schema.courseOrder)
			.where(
				and(
					eq(schema.courseOrder.buyerId, session.user.id),
					eq(schema.courseOrder.mockPaymentReference, reference),
				),
			)
			.limit(1);
		if (existing) return { orderId: existing.id, reused: true };
		const [item] = await db
			.select({
				id: schema.subscription.id,
				offerId: schema.subscription.offerId,
				organizationId: schema.subscription.organizationId,
				currentPeriodEnd: schema.subscription.currentPeriodEnd,
				productId: schema.product.id,
				productName: schema.product.name,
				productStatus: schema.product.status,
				offerName: schema.offer.name,
				offerStatus: schema.offer.status,
				priceInSen: schema.offer.priceInSen,
				currency: schema.offer.currency,
				billingInterval: schema.offer.billingInterval,
			})
			.from(schema.subscription)
			.innerJoin(schema.offer, eq(schema.subscription.offerId, schema.offer.id))
			.innerJoin(schema.product, eq(schema.offer.productId, schema.product.id))
			.where(
				and(
					eq(schema.subscription.id, data.subscriptionId),
					eq(schema.subscription.buyerId, session.user.id),
				),
			)
			.limit(1);
		if (!item) throw new Error("Membership not found.");
		if (item.offerStatus !== "active" || item.productStatus !== "published")
			throw new Error("This membership offer is unavailable.");
		if ((await creatorStatus(item.organizationId)) !== "approved")
			throw new Error("This creator is not available for renewal.");
		const now = new Date();
		const start = item.currentPeriodEnd > now ? item.currentPeriodEnd : now;
		const end = new Date(start);
		end.setUTCDate(
			end.getUTCDate() + (item.billingInterval === "year" ? 365 : 30),
		);
		const courses = await offerCourses(item.offerId);
		const id = crypto.randomUUID();
		const fee = Math.round(
			(item.priceInSen * settings.platformFeePercent) / 100,
		);
		await db.batch([
			db.insert(schema.courseOrder).values({
				id,
				buyerId: session.user.id,
				courseId: courses[0]?.id ?? null,
				productId: item.productId,
				offerId: item.offerId,
				subscriptionId: item.id,
				organizationId: item.organizationId,
				currency: item.currency,
				grossInSen: item.priceInSen,
				platformFeeInSen: fee,
				sellerNetInSen: item.priceInSen - fee,
				status: "paid",
				mockPaymentReference: reference,
				productNameSnapshot: item.productName,
				offerNameSnapshot: item.offerName,
				billingTypeSnapshot: "recurring",
				billingIntervalSnapshot: item.billingInterval,
				platformFeePercentSnapshot: settings.platformFeePercent,
				refundWindowDaysSnapshot: settings.refundWindowDays,
				expiresAt: now,
				paidAt: now,
			}),
			db
				.update(schema.subscription)
				.set({
					status: "active",
					currentPeriodStart: start,
					currentPeriodEnd: end,
					cancelAtPeriodEnd: false,
					cancelledAt: null,
					updatedAt: now,
				})
				.where(eq(schema.subscription.id, item.id)),
			db
				.update(schema.subscriptionEntitlement)
				.set({ status: "active", revokedAt: null })
				.where(eq(schema.subscriptionEntitlement.subscriptionId, item.id)),
		]);
		for (const course of courses)
			await activateEnrollment(session.user.id, course.id, now);
		return { orderId: id, reused: false };
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
				refundWindowDays: schema.courseOrder.refundWindowDaysSnapshot,
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
		if (
			Date.now() - order.paidAt.getTime() >
			order.refundWindowDays * 24 * 60 * 60 * 1_000
		)
			throw new Error(
				`The ${order.refundWindowDays}-day refund window has ended.`,
			);
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
		await expireMemberships();
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
				if (order.status === "refunded") sum.refundsInSen += order.grossInSen;
				return sum;
			},
			{
				grossInSen: 0,
				refundsInSen: 0,
				platformFeeInSen: 0,
				sellerNetInSen: 0,
			},
		);
		const activeMemberships = await db
			.select({
				count: sql<number>`count(*)`,
				mrrInSen: sql<number>`coalesce(sum(case when ${schema.offer.billingInterval} = 'year' then round(${schema.offer.priceInSen} / 12.0) else ${schema.offer.priceInSen} end), 0)`,
			})
			.from(schema.subscription)
			.innerJoin(schema.offer, eq(schema.subscription.offerId, schema.offer.id))
			.where(
				and(
					eq(schema.subscription.organizationId, activeOrganizationId),
					inArray(schema.subscription.status, ["active", "cancelled"]),
					gt(schema.subscription.currentPeriodEnd, new Date()),
				),
			);
		return {
			orders,
			totals: {
				...totals,
				activeMemberships: Number(activeMemberships[0]?.count ?? 0),
				mrrInSen: Number(activeMemberships[0]?.mrrInSen ?? 0),
			},
		};
	},
);

export const listOrganizationCustomers = createServerFn({
	method: "GET",
}).handler(async () => {
	const { activeOrganizationId } = await requireOwner();
	await expireMemberships();
	const now = Date.now();
	const customerId = sql.raw('"customer"."id"');
	return db
		.select({
			id: customer.id,
			name: customer.name,
			email: customer.email,
			image: customer.image,
			totalSpentInSen: sql<number>`coalesce((select sum(co.gross_in_sen) from course_order co where co.buyer_id = ${customerId} and co.organization_id = ${activeOrganizationId} and co.status = 'paid'), 0)`,
			productsPurchased: sql<number>`(select count(distinct co.product_id) from course_order co where co.buyer_id = ${customerId} and co.organization_id = ${activeOrganizationId} and co.status = 'paid')`,
			courseAccess: sql<number>`(select count(distinct course_id) from (select oe.course_id from order_entitlement oe inner join course_order co on co.id = oe.order_id where co.buyer_id = ${customerId} and co.organization_id = ${activeOrganizationId} and co.status = 'paid' and oe.status = 'active' union select se.course_id from subscription_entitlement se inner join subscription s on s.id = se.subscription_id where s.buyer_id = ${customerId} and s.organization_id = ${activeOrganizationId} and se.status = 'active' and s.status in ('active','cancelled') and s.current_period_end > ${now}))`,
			activeMemberships: sql<number>`(select count(*) from subscription s where s.buyer_id = ${customerId} and s.organization_id = ${activeOrganizationId} and s.status in ('active','cancelled') and s.current_period_end > ${now})`,
		})
		.from(customer)
		.where(
			sql`exists (select 1 from course_order co where co.buyer_id = ${customerId} and co.organization_id = ${activeOrganizationId} and co.status in ('paid','refunded')) or exists (select 1 from subscription s where s.buyer_id = ${customerId} and s.organization_id = ${activeOrganizationId})`,
		)
		.orderBy(asc(customer.name));
});
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
				organizationId: schema.courseOrder.organizationId,
				subscriptionId: schema.courseOrder.subscriptionId,
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
			await writeAudit({
				actorId: session.user.id,
				organizationId: request.organizationId,
				action: "refund.rejected",
				resourceType: "refund_request",
				resourceId: request.id,
				metadata: { orderId: request.orderId, note: data.note },
			});
			return { status: data.decision };
		}
		const orderEntitlements = await db
			.select({ courseId: schema.orderEntitlement.courseId })
			.from(schema.orderEntitlement)
			.where(eq(schema.orderEntitlement.orderId, request.orderId));
		const subscriptionEntitlements = request.subscriptionId
			? await db
					.select({ courseId: schema.subscriptionEntitlement.courseId })
					.from(schema.subscriptionEntitlement)
					.where(
						eq(
							schema.subscriptionEntitlement.subscriptionId,
							request.subscriptionId,
						),
					)
			: [];
		if (request.subscriptionId) {
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
				db
					.update(schema.subscription)
					.set({
						status: "refunded",
						currentPeriodEnd: now,
						cancelAtPeriodEnd: false,
						updatedAt: now,
					})
					.where(eq(schema.subscription.id, request.subscriptionId)),
				db
					.update(schema.subscriptionEntitlement)
					.set({ status: "revoked", revokedAt: now })
					.where(
						eq(
							schema.subscriptionEntitlement.subscriptionId,
							request.subscriptionId,
						),
					),
			]);
		} else {
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
		}
		await reconcileCourseAccess(
			request.buyerId,
			[...orderEntitlements, ...subscriptionEntitlements].map(
				(item) => item.courseId,
			),
			now,
		);
		await writeAudit({
			actorId: session.user.id,
			organizationId: request.organizationId,
			action: "refund.approved",
			resourceType: "refund_request",
			resourceId: request.id,
			metadata: { orderId: request.orderId, note: data.note },
		});
		return { status: data.decision };
	});
