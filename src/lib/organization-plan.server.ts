import { env } from "cloudflare:workers";
import { and, count, eq, gt, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });

type LimitedResource = "publishedCourses" | "products";

const resourceDetails = {
	publishedCourses: {
		label: "published course",
		limitKey: "maxPublishedCourses",
	},
	products: { label: "published product", limitKey: "maxProducts" },
} as const;

export async function ensureOrganizationSubscription(organizationId: string) {
	const [existing] = await db
		.select({ id: schema.organizationSubscription.id })
		.from(schema.organizationSubscription)
		.where(eq(schema.organizationSubscription.organizationId, organizationId))
		.limit(1);
	if (existing) return existing.id;

	const [[plan], [owner]] = await Promise.all([
		db
			.select()
			.from(schema.platformPlan)
			.where(eq(schema.platformPlan.slug, "free"))
			.limit(1),
		db
			.select({ userId: schema.member.userId })
			.from(schema.member)
			.where(
				and(
					eq(schema.member.organizationId, organizationId),
					eq(schema.member.role, "owner"),
				),
			)
			.limit(1),
	]);
	if (!plan || !owner)
		throw new Error("Unable to initialize organization plan.");

	const id = crypto.randomUUID();
	const now = new Date();
	const periodEnd = new Date(now);
	periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 100);
	await db
		.insert(schema.organizationSubscription)
		.values({
			id,
			organizationId,
			planId: plan.id,
			billingOwnerId: owner.userId,
			status: "active",
			billingInterval: "month",
			priceInSenSnapshot: 0,
			planSnapshot: JSON.stringify({
				slug: plan.slug,
				name: plan.name,
				maxPublishedCourses: plan.maxPublishedCourses,
				maxProducts: plan.maxProducts,
				maxTeamMembers: plan.maxTeamMembers,
				maxCustomers: plan.maxCustomers,
				analyticsRetentionDays: plan.analyticsRetentionDays,
			}),
			currentPeriodStart: now,
			currentPeriodEnd: periodEnd,
		})
		.onConflictDoNothing({
			target: schema.organizationSubscription.organizationId,
		});
	return id;
}

export async function requireOrganizationPlanCapacity(
	organizationId: string,
	resource: LimitedResource,
) {
	await ensureOrganizationSubscription(organizationId);
	const [subscription] = await db
		.select({
			planName: schema.platformPlan.name,
			maxPublishedCourses: schema.platformPlan.maxPublishedCourses,
			maxProducts: schema.platformPlan.maxProducts,
		})
		.from(schema.organizationSubscription)
		.innerJoin(
			schema.platformPlan,
			eq(schema.organizationSubscription.planId, schema.platformPlan.id),
		)
		.where(
			and(
				eq(schema.organizationSubscription.organizationId, organizationId),
				inArray(schema.organizationSubscription.status, ["active", "trialing"]),
				gt(schema.organizationSubscription.currentPeriodEnd, new Date()),
			),
		)
		.limit(1);

	if (!subscription) {
		throw new Error(
			"This organization needs an active plan before publishing content.",
		);
	}

	const details = resourceDetails[resource];
	const limit = subscription[details.limitKey];
	const [{ value }] =
		resource === "publishedCourses"
			? await db
					.select({ value: count() })
					.from(schema.course)
					.where(
						and(
							eq(schema.course.organizationId, organizationId),
							eq(schema.course.status, "published"),
						),
					)
			: await db
					.select({ value: count() })
					.from(schema.product)
					.where(
						and(
							eq(schema.product.organizationId, organizationId),
							eq(schema.product.status, "published"),
						),
					);

	if (value >= limit) {
		throw new Error(
			`${subscription.planName} allows ${limit} ${details.label}${limit === 1 ? "" : "s"}. Upgrade the organization plan to publish more.`,
		);
	}
}
