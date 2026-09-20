import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });
const ranges = [7, 30, 90, 365] as const;
function validateRange(input: unknown) {
	const value = Number(
		input && typeof input === "object" && !Array.isArray(input)
			? (input as Record<string, unknown>).days
			: 30,
	);
	return {
		days: ranges.includes(value as (typeof ranges)[number]) ? value : 30,
	};
}
async function requireOwner() {
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
	if (!organization) throw new Error("Organization not found.");
	const role = organization?.members.find(
		(item) => item.userId === session.user.id,
	)?.role;
	if (!role?.split(",").includes("owner"))
		throw new Error("Organization owner access is required.");
	return { organizationId, organizationName: organization.name };
}
function startOfUtcDay(date: Date) {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}
function percentChange(current: number, previous: number) {
	return previous === 0
		? current === 0
			? 0
			: 100
		: Math.round(((current - previous) / previous) * 1000) / 10;
}
function summarize(
	events: { eventType: string; visitorId: string }[],
	orders: {
		buyerId: string;
		grossInSen: number;
		platformFeeInSen: number;
		sellerNetInSen: number;
		status: string;
	}[],
) {
	const unique = (type: string) =>
		new Set(
			events
				.filter((item) => item.eventType === type)
				.map((item) => item.visitorId),
		).size;
	const storefrontVisitors = unique("storefront_view");
	const productViewers = unique("product_view");
	const checkoutStarts = unique("checkout_started");
	const paid = orders.filter((item) => item.status === "paid");
	const refunded = orders.filter((item) => item.status === "refunded");
	const paidCustomers = new Set(paid.map((item) => item.buyerId)).size;
	return {
		storefrontVisitors,
		productViewers,
		checkoutStarts,
		paidCustomers,
		conversionRate: productViewers
			? Math.round((paidCustomers / productViewers) * 1000) / 10
			: 0,
		grossInSen: paid.reduce((sum, item) => sum + item.grossInSen, 0),
		refundsInSen: refunded.reduce((sum, item) => sum + item.grossInSen, 0),
		platformFeeInSen: paid.reduce(
			(sum, item) => sum + item.platformFeeInSen,
			0,
		),
		netInSen: paid.reduce((sum, item) => sum + item.sellerNetInSen, 0),
	};
}

export const getCreatorDashboard = createServerFn({ method: "GET" })
	.validator(validateRange)
	.handler(async ({ data }) => {
		const { organizationId, organizationName } = await requireOwner();
		const now = new Date();
		const end = now;
		const start = startOfUtcDay(
			new Date(now.getTime() - (data.days - 1) * 86400000),
		);
		const previousStart = new Date(start.getTime() - data.days * 86400000);
		const [
			events,
			orders,
			products,
			memberships,
			learning,
			recentOrders,
			recentSubscriptions,
		] = await Promise.all([
			db
				.select({
					eventType: schema.analyticsEvent.eventType,
					visitorId: schema.analyticsEvent.visitorId,
					productId: schema.analyticsEvent.productId,
					occurredAt: schema.analyticsEvent.occurredAt,
				})
				.from(schema.analyticsEvent)
				.where(
					and(
						eq(schema.analyticsEvent.organizationId, organizationId),
						gte(schema.analyticsEvent.occurredAt, previousStart),
						lt(schema.analyticsEvent.occurredAt, end),
					),
				),
			db
				.select({
					id: schema.courseOrder.id,
					buyerId: schema.courseOrder.buyerId,
					productId: schema.courseOrder.productId,
					grossInSen: schema.courseOrder.grossInSen,
					platformFeeInSen: schema.courseOrder.platformFeeInSen,
					sellerNetInSen: schema.courseOrder.sellerNetInSen,
					status: schema.courseOrder.status,
					createdAt: schema.courseOrder.createdAt,
				})
				.from(schema.courseOrder)
				.where(
					and(
						eq(schema.courseOrder.organizationId, organizationId),
						gte(schema.courseOrder.createdAt, previousStart),
						lt(schema.courseOrder.createdAt, end),
					),
				),
			db
				.select({ id: schema.product.id, name: schema.product.name })
				.from(schema.product)
				.where(eq(schema.product.organizationId, organizationId))
				.orderBy(asc(schema.product.name)),
			db
				.select({
					count: sql<number>`count(*)`,
					mrr: sql<number>`coalesce(sum(case when ${schema.offer.billingInterval} = 'year' then round(${schema.offer.priceInSen} / 12.0) else ${schema.offer.priceInSen} end), 0)`,
				})
				.from(schema.subscription)
				.innerJoin(
					schema.offer,
					eq(schema.subscription.offerId, schema.offer.id),
				)
				.where(
					and(
						eq(schema.subscription.organizationId, organizationId),
						inArray(schema.subscription.status, ["active", "cancelled"]),
						gte(schema.subscription.currentPeriodEnd, now),
					),
				),
			db
				.select({
					activeLearners: sql<number>`count(distinct case when ${schema.lessonProgress.updatedAt} >= ${start.getTime()} then ${schema.enrollment.userId} end)`,
					lessonCompletions: sql<number>`count(distinct case when ${schema.lessonProgress.completedAt} >= ${start.getTime()} then ${schema.lessonProgress.id} end)`,
					enrollments: sql<number>`count(distinct case when ${schema.enrollment.status} in ('active','completed') then ${schema.enrollment.id} end)`,
					completedEnrollments: sql<number>`count(distinct case when ${schema.enrollment.status} = 'completed' then ${schema.enrollment.id} end)`,
				})
				.from(schema.enrollment)
				.innerJoin(
					schema.course,
					eq(schema.enrollment.courseId, schema.course.id),
				)
				.leftJoin(
					schema.lessonProgress,
					eq(schema.enrollment.id, schema.lessonProgress.enrollmentId),
				)
				.where(eq(schema.course.organizationId, organizationId)),
			db
				.select({
					id: schema.courseOrder.id,
					status: schema.courseOrder.status,
					amount: schema.courseOrder.grossInSen,
					name: schema.courseOrder.productNameSnapshot,
					occurredAt: schema.courseOrder.updatedAt,
				})
				.from(schema.courseOrder)
				.where(eq(schema.courseOrder.organizationId, organizationId))
				.orderBy(desc(schema.courseOrder.updatedAt))
				.limit(8),
			db
				.select({
					id: schema.subscription.id,
					status: schema.subscription.status,
					name: schema.product.name,
					occurredAt: schema.subscription.updatedAt,
				})
				.from(schema.subscription)
				.innerJoin(
					schema.offer,
					eq(schema.subscription.offerId, schema.offer.id),
				)
				.innerJoin(
					schema.product,
					eq(schema.offer.productId, schema.product.id),
				)
				.where(eq(schema.subscription.organizationId, organizationId))
				.orderBy(desc(schema.subscription.updatedAt))
				.limit(8),
		]);
		const currentEvents = events.filter((item) => item.occurredAt >= start);
		const previousEvents = events.filter((item) => item.occurredAt < start);
		const currentOrders = orders.filter((item) => item.createdAt >= start);
		const previousOrders = orders.filter((item) => item.createdAt < start);
		const current = summarize(currentEvents, currentOrders);
		const previous = summarize(previousEvents, previousOrders);
		const comparisons = Object.fromEntries(
			Object.keys(current).map((key) => [
				key,
				percentChange(
					Number(current[key as keyof typeof current]),
					Number(previous[key as keyof typeof previous]),
				),
			]),
		);
		const daily = Array.from({ length: data.days }, (_, index) => {
			const date = new Date(start.getTime() + index * 86400000);
			const next = new Date(date.getTime() + 86400000);
			const dayEvents = currentEvents.filter(
				(item) => item.occurredAt >= date && item.occurredAt < next,
			);
			const dayOrders = currentOrders.filter(
				(item) => item.createdAt >= date && item.createdAt < next,
			);
			const summary = summarize(dayEvents, dayOrders);
			return {
				date: date.toISOString().slice(0, 10),
				revenue: summary.grossInSen / 100,
				storefront: summary.storefrontVisitors,
				products: summary.productViewers,
				checkouts: summary.checkoutStarts,
				customers: summary.paidCustomers,
			};
		});
		const productBreakdown = products
			.map((product) => {
				const productEvents = currentEvents.filter(
					(item) => item.productId === product.id,
				);
				const productOrders = currentOrders.filter(
					(item) => item.productId === product.id,
				);
				const summary = summarize(productEvents, productOrders);
				return {
					id: product.id,
					name: product.name,
					views: summary.productViewers,
					checkouts: summary.checkoutStarts,
					paidOrders: productOrders.filter((item) => item.status === "paid")
						.length,
					conversionRate: summary.conversionRate,
					revenueInSen: summary.grossInSen,
				};
			})
			.sort((a, b) => b.revenueInSen - a.revenueInSen || b.views - a.views);
		const activity = [
			...recentOrders.map((item) => ({
				id: `order-${item.id}`,
				type: item.status === "refunded" ? "refund" : "purchase",
				label: item.name ?? "Product order",
				status: item.status,
				amountInSen: item.amount,
				occurredAt: item.occurredAt,
			})),
			...recentSubscriptions.map((item) => ({
				id: `subscription-${item.id}`,
				type: "membership",
				label: item.name,
				status: item.status,
				amountInSen: null,
				occurredAt: item.occurredAt,
			})),
		]
			.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
			.slice(0, 10);
		const enrollmentCount = Number(learning[0]?.enrollments ?? 0);
		const completedCount = Number(learning[0]?.completedEnrollments ?? 0);
		return {
			organizationName,
			days: data.days,
			current,
			comparisons,
			daily,
			productBreakdown,
			activity,
			activeMemberships: Number(memberships[0]?.count ?? 0),
			mrrInSen: Number(memberships[0]?.mrr ?? 0),
			activeLearners: Number(learning[0]?.activeLearners ?? 0),
			lessonCompletions: Number(learning[0]?.lessonCompletions ?? 0),
			completionRate: enrollmentCount
				? Math.round((completedCount / enrollmentCount) * 1000) / 10
				: 0,
		};
	});
