import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";
import { ensureOrganizationSubscription } from "@/lib/organization-plan.server";
import { writeAudit } from "@/lib/platform.server";

const db = drizzle(env.DB, { schema });

function record(input: unknown) {
	if (!input || typeof input !== "object" || Array.isArray(input))
		throw new Error("Invalid request.");
	return input as Record<string, unknown>;
}
function string(input: unknown, label: string, max = 100) {
	const value = typeof input === "string" ? input.trim() : "";
	if (!value || value.length > max) throw new Error(`${label} is invalid.`);
	return value;
}
function integer(input: unknown, label: string, min = 0, max = 1_000_000) {
	const value = Number(input);
	if (!Number.isSafeInteger(value) || value < min || value > max)
		throw new Error(`${label} is invalid.`);
	return value;
}
async function sessionContext() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Authentication required.");
	return { headers, session };
}
async function organizationContext(ownerOnly = false) {
	const context = await sessionContext();
	const organizations = await auth.api.listOrganizations({
		headers: context.headers,
	});
	const organizationId =
		context.session.session.activeOrganizationId &&
		organizations.some(
			(item) => item.id === context.session.session.activeOrganizationId,
		)
			? context.session.session.activeOrganizationId
			: organizations[0]?.id;
	if (!organizationId) throw new Error("Select an organization first.");
	const organization = await auth.api.getFullOrganization({
		headers: context.headers,
		query: { organizationId },
	});
	const role = organization?.members.find(
		(item) => item.userId === context.session.user.id,
	)?.role;
	const roles = role?.split(",") ?? [];
	if (
		ownerOnly
			? !roles.includes("owner")
			: !roles.some((item) => item === "owner" || item === "admin")
	) {
		throw new Error(
			ownerOnly
				? "Organization owner access is required."
				: "Organization administrator access is required.",
		);
	}
	return { ...context, organizationId, organization, role };
}
async function adminContext() {
	const context = await sessionContext();
	if (
		!context.session.user.role?.split(",").includes("admin") ||
		context.session.session.impersonatedBy
	) {
		throw new Error("Platform administrator access is required.");
	}
	return context;
}
function planSnapshot(plan: typeof schema.platformPlan.$inferSelect) {
	return JSON.stringify({
		slug: plan.slug,
		name: plan.name,
		maxPublishedCourses: plan.maxPublishedCourses,
		maxProducts: plan.maxProducts,
		maxTeamMembers: plan.maxTeamMembers,
		maxCustomers: plan.maxCustomers,
		analyticsRetentionDays: plan.analyticsRetentionDays,
	});
}
async function usage(organizationId: string) {
	const [[courses], [products], [members], [customers]] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.course)
			.where(
				and(
					eq(schema.course.organizationId, organizationId),
					eq(schema.course.status, "published"),
				),
			),
		db
			.select({ value: count() })
			.from(schema.product)
			.where(
				and(
					eq(schema.product.organizationId, organizationId),
					eq(schema.product.status, "published"),
				),
			),
		db
			.select({ value: count() })
			.from(schema.member)
			.where(eq(schema.member.organizationId, organizationId)),
		db
			.select({
				value: sql<number>`count(distinct ${schema.enrollment.userId})`,
			})
			.from(schema.enrollment)
			.innerJoin(
				schema.course,
				eq(schema.enrollment.courseId, schema.course.id),
			)
			.where(eq(schema.course.organizationId, organizationId)),
	]);
	return {
		publishedCourses: courses.value,
		products: products.value,
		teamMembers: members.value,
		customers: customers.value,
	};
}

export const listPlans = createServerFn({ method: "GET" }).handler(async () =>
	db
		.select()
		.from(schema.platformPlan)
		.where(eq(schema.platformPlan.status, "active"))
		.orderBy(asc(schema.platformPlan.position)),
);

export const getOrganizationBilling = createServerFn({ method: "GET" }).handler(
	async () => {
		const { organizationId, role } = await organizationContext(false);
		await ensureOrganizationSubscription(organizationId);
		const [subscription] = await db
			.select({
				subscription: schema.organizationSubscription,
				plan: schema.platformPlan,
			})
			.from(schema.organizationSubscription)
			.innerJoin(
				schema.platformPlan,
				eq(schema.organizationSubscription.planId, schema.platformPlan.id),
			)
			.where(eq(schema.organizationSubscription.organizationId, organizationId))
			.limit(1);
		return {
			subscription: subscription ?? null,
			usage: await usage(organizationId),
			role,
			canManageBilling: role?.split(",").includes("owner") ?? false,
		};
	},
);

export const selectOrganizationPlan = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const value = record(input);
		const interval = string(value.interval, "Billing interval");
		if (interval !== "month" && interval !== "year")
			throw new Error("Billing interval is invalid.");
		return { planId: string(value.planId, "Plan"), interval };
	})
	.handler(async ({ data }) => {
		const { organizationId, session } = await organizationContext(true);
		const [plan] = await db
			.select()
			.from(schema.platformPlan)
			.where(
				and(
					eq(schema.platformPlan.id, data.planId),
					eq(schema.platformPlan.status, "active"),
				),
			)
			.limit(1);
		if (!plan) throw new Error("Plan is unavailable.");
		const now = new Date();
		const periodEnd = new Date(now);
		if (plan.monthlyPriceInSen === 0 && plan.yearlyPriceInSen === 0)
			periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 100);
		else if (plan.trialDays > 0)
			periodEnd.setUTCDate(periodEnd.getUTCDate() + plan.trialDays);
		else if (data.interval === "year")
			periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
		else periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
		const price =
			data.interval === "year" ? plan.yearlyPriceInSen : plan.monthlyPriceInSen;
		if (price > 0 && plan.trialDays === 0)
			throw new Error(
				"Paid organization billing is not configured for this plan yet.",
			);
		const [existing] = await db
			.select({ id: schema.organizationSubscription.id })
			.from(schema.organizationSubscription)
			.where(eq(schema.organizationSubscription.organizationId, organizationId))
			.limit(1);
		const id = existing?.id ?? crypto.randomUUID();
		const values = {
			planId: plan.id,
			billingOwnerId: session.user.id,
			status: plan.trialDays > 0 && price > 0 ? "trialing" : "active",
			billingInterval: data.interval,
			priceInSenSnapshot: price,
			planSnapshot: planSnapshot(plan),
			currentPeriodStart: now,
			currentPeriodEnd: periodEnd,
			cancelAtPeriodEnd: false,
			updatedAt: now,
		};
		if (existing)
			await db
				.update(schema.organizationSubscription)
				.set(values)
				.where(eq(schema.organizationSubscription.id, id));
		else
			await db
				.insert(schema.organizationSubscription)
				.values({ id, organizationId, ...values });
		await db.insert(schema.organizationSubscriptionEvent).values({
			id: crypto.randomUUID(),
			subscriptionId: id,
			type: existing ? "plan_changed" : "subscription_created",
			actorId: session.user.id,
			metadata: JSON.stringify({ planId: plan.id, interval: data.interval }),
		});
		await writeAudit({
			actorId: session.user.id,
			organizationId,
			action: "organization_subscription.updated",
			resourceType: "organization_subscription",
			resourceId: id,
			metadata: { planId: plan.id, interval: data.interval },
		});
		return { id };
	});

export const cancelOrganizationSubscription = createServerFn({
	method: "POST",
}).handler(async () => {
	const { organizationId, session } = await organizationContext(true);
	const [subscription] = await db
		.select({
			id: schema.organizationSubscription.id,
			monthlyPriceInSen: schema.platformPlan.monthlyPriceInSen,
			yearlyPriceInSen: schema.platformPlan.yearlyPriceInSen,
		})
		.from(schema.organizationSubscription)
		.innerJoin(
			schema.platformPlan,
			eq(schema.organizationSubscription.planId, schema.platformPlan.id),
		)
		.where(eq(schema.organizationSubscription.organizationId, organizationId))
		.limit(1);
	if (!subscription) throw new Error("Subscription was not found.");
	if (
		subscription.monthlyPriceInSen === 0 &&
		subscription.yearlyPriceInSen === 0
	)
		throw new Error("Free plans do not need to be cancelled.");
	await db
		.update(schema.organizationSubscription)
		.set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
		.where(eq(schema.organizationSubscription.id, subscription.id));
	await db.insert(schema.organizationSubscriptionEvent).values({
		id: crypto.randomUUID(),
		subscriptionId: subscription.id,
		type: "cancellation_requested",
		actorId: session.user.id,
	});
	await writeAudit({
		actorId: session.user.id,
		organizationId,
		action: "organization_subscription.cancellation_requested",
		resourceType: "organization_subscription",
		resourceId: subscription.id,
	});
	return { success: true };
});

export const listAdminPlans = createServerFn({ method: "GET" }).handler(
	async () => {
		await adminContext();
		return db
			.select()
			.from(schema.platformPlan)
			.orderBy(asc(schema.platformPlan.position));
	},
);
export const createAdminPlan = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const value = record(input);
		const slug = string(value.slug, "Slug")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
		if (!slug) throw new Error("Slug is invalid.");
		return { name: string(value.name, "Name"), slug };
	})
	.handler(async ({ data }) => {
		const { session } = await adminContext();
		const [lastPlan] = await db
			.select({ position: schema.platformPlan.position })
			.from(schema.platformPlan)
			.orderBy(desc(schema.platformPlan.position))
			.limit(1);
		const id = crypto.randomUUID();
		await db.insert(schema.platformPlan).values({
			id,
			...data,
			status: "draft",
			description: "",
			position: (lastPlan?.position ?? 0) + 1,
		});
		await writeAudit({
			actorId: session.user.id,
			action: "platform_plan.created",
			resourceType: "platform_plan",
			resourceId: id,
			metadata: { slug: data.slug },
		});
		return { id };
	});
export const saveAdminPlan = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const value = record(input);
		return {
			id: string(value.id, "Plan"),
			name: string(value.name, "Name"),
			description:
				typeof value.description === "string"
					? value.description.trim().slice(0, 500)
					: "",
			status: string(value.status, "Status"),
			monthlyPriceInSen: integer(value.monthlyPriceInSen, "Monthly price"),
			yearlyPriceInSen: integer(value.yearlyPriceInSen, "Yearly price"),
			trialDays: integer(value.trialDays, "Trial days", 0, 90),
			maxPublishedCourses: integer(
				value.maxPublishedCourses,
				"Course limit",
				1,
			),
			maxProducts: integer(value.maxProducts, "Product limit", 1),
			maxTeamMembers: integer(value.maxTeamMembers, "Team limit", 1),
			maxCustomers: integer(value.maxCustomers, "Customer limit", 1),
			analyticsRetentionDays: integer(
				value.analyticsRetentionDays,
				"Analytics retention",
				1,
				3650,
			),
		};
	})
	.handler(async ({ data }) => {
		const { session } = await adminContext();
		if (!["draft", "active", "archived"].includes(data.status))
			throw new Error("Status is invalid.");
		await db
			.update(schema.platformPlan)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.platformPlan.id, data.id));
		await writeAudit({
			actorId: session.user.id,
			action: "platform_plan.updated",
			resourceType: "platform_plan",
			resourceId: data.id,
			metadata: { status: data.status },
		});
		return { success: true };
	});

export const listAdminOrganizationSubscriptions = createServerFn({
	method: "GET",
}).handler(async () => {
	await adminContext();
	return db
		.select({
			id: schema.organizationSubscription.id,
			status: schema.organizationSubscription.status,
			billingInterval: schema.organizationSubscription.billingInterval,
			currentPeriodEnd: schema.organizationSubscription.currentPeriodEnd,
			organizationId: schema.organization.id,
			organizationName: schema.organization.name,
			ownerName: schema.user.name,
			ownerEmail: schema.user.email,
			planName: schema.platformPlan.name,
		})
		.from(schema.organizationSubscription)
		.innerJoin(
			schema.organization,
			eq(
				schema.organizationSubscription.organizationId,
				schema.organization.id,
			),
		)
		.innerJoin(
			schema.platformPlan,
			eq(schema.organizationSubscription.planId, schema.platformPlan.id),
		)
		.innerJoin(
			schema.user,
			eq(schema.organizationSubscription.billingOwnerId, schema.user.id),
		)
		.orderBy(desc(schema.organizationSubscription.updatedAt));
});
