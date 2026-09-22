import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });
export const analyticsCookieName = "dv_visitor";
export const analyticsCookieMaxAge = 90 * 24 * 60 * 60;
export type AnalyticsEventType =
	| "storefront_view"
	| "product_view"
	| "checkout_started";

export function cookieValue(cookie: string | null, name: string) {
	return (
		cookie
			?.split(";")
			.map((part) => part.trim())
			.find((part) => part.startsWith(`${name}=`))
			?.slice(name.length + 1) || null
	);
}

export async function recordAnalyticsEvent(input: {
	organizationId: string;
	productId?: string | null;
	userId?: string | null;
	eventType: AnalyticsEventType;
	visitorId: string;
	source: "storefront" | "product" | "checkout";
	occurredAt?: Date;
}) {
	const occurredAt = input.occurredAt ?? new Date();
	const day = occurredAt.toISOString().slice(0, 10);
	const resource = input.productId ?? input.organizationId;
	const deduplicationKey = `${input.eventType}:${resource}:${input.visitorId}:${day}`;
	await db
		.insert(schema.analyticsEvent)
		.values({ id: crypto.randomUUID(), ...input, occurredAt, deduplicationKey })
		.onConflictDoNothing({ target: schema.analyticsEvent.deduplicationKey });
}

export async function publishedTrackingTarget(
	eventType: "storefront_view" | "product_view",
	slug: string,
	creatorSlug?: string,
) {
	if (eventType === "storefront_view") {
		const [target] = await db
			.select({ organizationId: schema.creatorProfile.organizationId })
			.from(schema.creatorProfile)
			.innerJoin(
				schema.organization,
				eq(schema.creatorProfile.organizationId, schema.organization.id),
			)
			.innerJoin(
				schema.creatorApplication,
				eq(
					schema.creatorProfile.organizationId,
					schema.creatorApplication.organizationId,
				),
			)
			.where(
				and(
					eq(schema.organization.slug, slug),
					eq(schema.creatorProfile.status, "published"),
					eq(schema.creatorApplication.status, "approved"),
				),
			)
			.limit(1);
		return target ? { ...target, productId: null } : null;
	}
	const [target] = await db
		.select({
			organizationId: schema.product.organizationId,
			productId: schema.product.id,
		})
		.from(schema.product)
		.innerJoin(
			schema.organization,
			eq(schema.product.organizationId, schema.organization.id),
		)
		.innerJoin(
			schema.creatorApplication,
			eq(
				schema.product.organizationId,
				schema.creatorApplication.organizationId,
			),
		)
		.where(
			and(
				eq(schema.product.slug, slug),
				eq(schema.organization.slug, creatorSlug ?? ""),
				eq(schema.product.status, "published"),
				eq(schema.product.moderationStatus, "active"),
				eq(schema.creatorApplication.status, "approved"),
			),
		)
		.limit(1);
	return target ?? null;
}
