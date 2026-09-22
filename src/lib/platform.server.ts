import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });

export async function getPlatformSettings() {
	const [settings] = await db
		.select()
		.from(schema.platformSetting)
		.where(eq(schema.platformSetting.id, "global"))
		.limit(1);
	return (
		settings ?? {
			id: "global",
			platformFeePercent: 10,
			refundWindowDays: 14,
			creatorApplicationsOpen: true,
			maintenanceMode: false,
			updatedBy: null,
			updatedAt: new Date(0),
		}
	);
}

export async function creatorStatus(organizationId: string) {
	const [application] = await db
		.select({ status: schema.creatorApplication.status })
		.from(schema.creatorApplication)
		.where(eq(schema.creatorApplication.organizationId, organizationId))
		.limit(1);
	return application?.status ?? "not_applied";
}

export async function requireApprovedCreator(organizationId: string) {
	if ((await creatorStatus(organizationId)) !== "approved") {
		throw new Error(
			"Creator approval is required before publishing or selling.",
		);
	}
}

export async function isPublicCreator(organizationId: string) {
	return (await creatorStatus(organizationId)) === "approved";
}

export async function writeAudit(input: {
	actorId?: string | null;
	organizationId?: string | null;
	action: string;
	resourceType: string;
	resourceId?: string | null;
	metadata?: Record<string, unknown>;
	impersonated?: boolean;
}) {
	await db.insert(schema.auditLog).values({
		id: crypto.randomUUID(),
		actorId: input.actorId ?? null,
		organizationId: input.organizationId ?? null,
		action: input.action,
		resourceType: input.resourceType,
		resourceId: input.resourceId ?? null,
		metadata: JSON.stringify(input.metadata ?? {}),
		impersonated: input.impersonated ?? false,
	});
}

export async function publicCreatorFilter(organizationId: string) {
	const [application] = await db
		.select({ id: schema.creatorApplication.id })
		.from(schema.creatorApplication)
		.where(
			and(
				eq(schema.creatorApplication.organizationId, organizationId),
				eq(schema.creatorApplication.status, "approved"),
			),
		)
		.limit(1);
	return Boolean(application);
}
