import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";
import { getPlatformSettings, writeAudit } from "@/lib/platform.server";

const db = drizzle(env.DB, { schema });

function object(input: unknown) {
	if (!input || typeof input !== "object" || Array.isArray(input))
		throw new Error("Invalid request.");
	return input as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 1000) {
	const result = typeof value === "string" ? value.trim() : "";
	if (!result) throw new Error(`${label} is required.`);
	if (result.length > max) throw new Error(`${label} is too long.`);
	return result;
}
async function sessionContext() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Authentication required.");
	return { headers, session };
}
async function ownerContext() {
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
	if (!role?.split(",").includes("owner"))
		throw new Error("Organization owner access is required.");
	return { ...context, organizationId };
}
async function adminContext() {
	const context = await sessionContext();
	if (
		!context.session.user.role?.split(",").includes("admin") ||
		context.session.session.impersonatedBy
	)
		throw new Error("Platform administrator access is required.");
	return context;
}

export const getCreatorApplication = createServerFn({ method: "GET" }).handler(
	async () => {
		const { organizationId } = await ownerContext();
		const [application] = await db
			.select()
			.from(schema.creatorApplication)
			.where(eq(schema.creatorApplication.organizationId, organizationId))
			.limit(1);
		return {
			application: application ?? null,
			applicationsOpen: (await getPlatformSettings()).creatorApplicationsOpen,
		};
	},
);

export const submitCreatorApplication = createServerFn({ method: "POST" })
	.validator((input: unknown) => ({ note: text(object(input).note, "Note") }))
	.handler(async ({ data }) => {
		const { organizationId, session } = await ownerContext();
		const settings = await getPlatformSettings();
		if (!settings.creatorApplicationsOpen)
			throw new Error("Creator applications are currently closed.");
		const [profile] = await db
			.select({
				headline: schema.creatorProfile.headline,
				bio: schema.creatorProfile.bio,
			})
			.from(schema.creatorProfile)
			.where(eq(schema.creatorProfile.organizationId, organizationId))
			.limit(1);
		if (!profile?.headline || !profile.bio)
			throw new Error("Add a storefront headline and bio before applying.");
		const [existing] = await db
			.select({
				id: schema.creatorApplication.id,
				status: schema.creatorApplication.status,
			})
			.from(schema.creatorApplication)
			.where(eq(schema.creatorApplication.organizationId, organizationId))
			.limit(1);
		if (existing && existing.status !== "rejected")
			throw new Error(
				"This organization already has an active creator status.",
			);
		const id = existing?.id ?? crypto.randomUUID();
		if (existing) {
			await db
				.update(schema.creatorApplication)
				.set({
					status: "pending",
					note: data.note,
					decisionReason: null,
					resolvedAt: null,
					resolvedBy: null,
					updatedAt: new Date(),
				})
				.where(eq(schema.creatorApplication.id, id));
		} else {
			await db.insert(schema.creatorApplication).values({
				id,
				organizationId,
				applicantId: session.user.id,
				note: data.note,
			});
		}
		await writeAudit({
			actorId: session.user.id,
			organizationId,
			action: "creator.application_submitted",
			resourceType: "creator_application",
			resourceId: id,
		});
		return { id, status: "pending" as const };
	});

export const listCreatorApplications = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		const values = input ? object(input) : {};
		return {
			query:
				typeof values.query === "string"
					? values.query.trim().slice(0, 120)
					: "",
			status: typeof values.status === "string" ? values.status : "",
		};
	})
	.handler(async ({ data }) => {
		await adminContext();
		const filters = [];
		if (
			data.status &&
			["pending", "approved", "rejected", "suspended"].includes(data.status)
		)
			filters.push(eq(schema.creatorApplication.status, data.status));
		if (data.query) {
			const pattern = `%${data.query}%`;
			const filter = or(
				like(schema.organization.name, pattern),
				like(schema.organization.slug, pattern),
				like(schema.user.email, pattern),
			);
			if (filter) filters.push(filter);
		}
		return db
			.select({
				id: schema.creatorApplication.id,
				organizationId: schema.organization.id,
				organizationName: schema.organization.name,
				organizationSlug: schema.organization.slug,
				applicantName: schema.user.name,
				applicantEmail: schema.user.email,
				status: schema.creatorApplication.status,
				note: schema.creatorApplication.note,
				decisionReason: schema.creatorApplication.decisionReason,
				updatedAt: schema.creatorApplication.updatedAt,
			})
			.from(schema.creatorApplication)
			.innerJoin(
				schema.organization,
				eq(schema.creatorApplication.organizationId, schema.organization.id),
			)
			.innerJoin(
				schema.user,
				eq(schema.creatorApplication.applicantId, schema.user.id),
			)
			.where(filters.length ? and(...filters) : undefined)
			.orderBy(desc(schema.creatorApplication.updatedAt));
	});

export const decideCreatorApplication = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = object(input);
		const action = String(values.action);
		if (!["approve", "reject", "suspend", "reactivate"].includes(action))
			throw new Error("Invalid creator action.");
		return {
			id: text(values.id, "Application", 120),
			action: action as "approve" | "reject" | "suspend" | "reactivate",
			reason: text(values.reason, "Reason", 1000),
		};
	})
	.handler(async ({ data }) => {
		const { session } = await adminContext();
		const [application] = await db
			.select()
			.from(schema.creatorApplication)
			.where(eq(schema.creatorApplication.id, data.id))
			.limit(1);
		if (!application) throw new Error("Creator application not found.");
		const nextStatus =
			data.action === "approve" || data.action === "reactivate"
				? "approved"
				: data.action === "reject"
					? "rejected"
					: "suspended";
		const valid =
			(application.status === "pending" &&
				["approve", "reject"].includes(data.action)) ||
			(application.status === "approved" && data.action === "suspend") ||
			(application.status === "suspended" && data.action === "reactivate");
		if (!valid) throw new Error("Invalid creator status transition.");
		const now = new Date();
		await db.batch([
			db
				.update(schema.creatorApplication)
				.set({
					status: nextStatus,
					decisionReason: data.reason,
					resolvedBy: session.user.id,
					resolvedAt: now,
					updatedAt: now,
				})
				.where(eq(schema.creatorApplication.id, application.id)),
			db.insert(schema.moderationAction).values({
				id: crypto.randomUUID(),
				organizationId: application.organizationId,
				targetType: "creator",
				targetId: application.organizationId,
				action: data.action,
				reason: data.reason,
				actorId: session.user.id,
			}),
		]);
		await writeAudit({
			actorId: session.user.id,
			organizationId: application.organizationId,
			action: `creator.${data.action}`,
			resourceType: "creator_application",
			resourceId: application.id,
			metadata: {
				from: application.status,
				to: nextStatus,
				reason: data.reason,
			},
		});
		return { status: nextStatus };
	});

export const listActiveCategories = createServerFn({ method: "GET" }).handler(
	async () =>
		db
			.select({
				slug: schema.platformCategory.slug,
				name: schema.platformCategory.name,
				description: schema.platformCategory.description,
				featured: schema.platformCategory.featured,
				courseCount: sql<number>`(select count(*) from course c inner join creator_application ca on ca.organization_id = c.organization_id where c.category = ${schema.platformCategory.slug} and c.status = 'published' and c.moderation_status = 'active' and ca.status = 'approved')`,
			})
			.from(schema.platformCategory)
			.where(eq(schema.platformCategory.active, true))
			.orderBy(
				asc(schema.platformCategory.position),
				asc(schema.platformCategory.name),
			),
);

export const listAdminContent = createServerFn({ method: "GET" }).handler(
	async () => {
		await adminContext();
		const [courses, products, storefronts] = await Promise.all([
			db
				.select({
					id: schema.course.id,
					name: schema.course.title,
					slug: schema.course.slug,
					status: schema.course.status,
					moderationStatus: schema.course.moderationStatus,
					organizationId: schema.organization.id,
					organizationName: schema.organization.name,
					updatedAt: schema.course.updatedAt,
				})
				.from(schema.course)
				.innerJoin(
					schema.organization,
					eq(schema.course.organizationId, schema.organization.id),
				)
				.orderBy(desc(schema.course.updatedAt)),
			db
				.select({
					id: schema.product.id,
					name: schema.product.name,
					slug: schema.product.slug,
					status: schema.product.status,
					moderationStatus: schema.product.moderationStatus,
					organizationId: schema.organization.id,
					organizationName: schema.organization.name,
					updatedAt: schema.product.updatedAt,
				})
				.from(schema.product)
				.innerJoin(
					schema.organization,
					eq(schema.product.organizationId, schema.organization.id),
				)
				.orderBy(desc(schema.product.updatedAt)),
			db
				.select({
					id: schema.creatorProfile.id,
					name: schema.creatorProfile.displayName,
					slug: schema.organization.slug,
					status: schema.creatorProfile.status,
					moderationStatus: schema.creatorProfile.moderationStatus,
					organizationId: schema.organization.id,
					organizationName: schema.organization.name,
					updatedAt: schema.creatorProfile.updatedAt,
				})
				.from(schema.creatorProfile)
				.innerJoin(
					schema.organization,
					eq(schema.creatorProfile.organizationId, schema.organization.id),
				)
				.orderBy(desc(schema.creatorProfile.updatedAt)),
		]);
		return {
			items: [
				...storefronts.map((item) => ({
					...item,
					type: "storefront" as const,
				})),
				...courses.map((item) => ({ ...item, type: "course" as const })),
				...products.map((item) => ({ ...item, type: "product" as const })),
			].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
		};
	},
);

export const moderateContent = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = object(input);
		const type = String(values.type);
		const action = String(values.action);
		if (!["course", "product", "storefront"].includes(type))
			throw new Error("Invalid content type.");
		if (!["unlist", "suspend", "restore"].includes(action))
			throw new Error("Invalid moderation action.");
		return {
			id: text(values.id, "Content", 120),
			type: type as "course" | "product" | "storefront",
			action: action as "unlist" | "suspend" | "restore",
			reason: text(values.reason, "Reason", 1000),
		};
	})
	.handler(async ({ data }) => {
		const { session } = await adminContext();
		const table =
			data.type === "course"
				? schema.course
				: data.type === "product"
					? schema.product
					: schema.creatorProfile;
		const [item] = await db
			.select({
				id: table.id,
				organizationId: table.organizationId,
				status: table.status,
				moderationStatus: table.moderationStatus,
				previousStatus: table.moderationPreviousStatus,
			})
			.from(table)
			.where(eq(table.id, data.id))
			.limit(1);
		if (!item) throw new Error("Content not found.");
		if (data.action === "restore" && item.moderationStatus === "active")
			throw new Error("Content is not moderated.");
		if (data.action !== "restore" && item.moderationStatus !== "active")
			throw new Error("Content is already moderated.");
		const now = new Date();
		await db
			.update(table)
			.set(
				data.action === "restore"
					? {
							status: item.previousStatus ?? "draft",
							moderationStatus: "active",
							moderationPreviousStatus: null,
							updatedAt: now,
						}
					: {
							status: "draft",
							moderationStatus: data.action,
							moderationPreviousStatus: item.status,
							updatedAt: now,
						},
			)
			.where(eq(table.id, item.id));
		await db.insert(schema.moderationAction).values({
			id: crypto.randomUUID(),
			organizationId: item.organizationId,
			targetType: data.type,
			targetId: item.id,
			action: data.action,
			reason: data.reason,
			actorId: session.user.id,
		});
		await writeAudit({
			actorId: session.user.id,
			organizationId: item.organizationId,
			action: `content.${data.action}`,
			resourceType: data.type,
			resourceId: item.id,
			metadata: { reason: data.reason, previousStatus: item.status },
		});
		return {
			status:
				data.action === "restore" ? (item.previousStatus ?? "draft") : "draft",
			moderationStatus: data.action === "restore" ? "active" : data.action,
		};
	});

export const listAdminCategories = createServerFn({ method: "GET" }).handler(
	async () => {
		await adminContext();
		return db
			.select()
			.from(schema.platformCategory)
			.orderBy(
				asc(schema.platformCategory.position),
				asc(schema.platformCategory.name),
			);
	},
);

export const savePlatformCategory = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = object(input);
		const name = text(values.name, "Name", 80);
		const slug = text(values.slug, "Slug", 80)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		return {
			id: typeof values.id === "string" ? values.id : "",
			name,
			slug,
			description:
				typeof values.description === "string"
					? values.description.trim().slice(0, 500)
					: "",
			featured: values.featured === true,
			active: values.active !== false,
		};
	})
	.handler(async ({ data }) => {
		const { session } = await adminContext();
		const id = data.id || crypto.randomUUID();
		const [count] = await db
			.select({ value: sql<number>`count(*)` })
			.from(schema.platformCategory);
		await db
			.insert(schema.platformCategory)
			.values({ ...data, id, position: Number(count.value) })
			.onConflictDoUpdate({
				target: schema.platformCategory.id,
				set: {
					name: data.name,
					slug: data.slug,
					description: data.description,
					featured: data.featured,
					active: data.active,
					updatedAt: new Date(),
				},
			});
		await writeAudit({
			actorId: session.user.id,
			action: data.id ? "category.updated" : "category.created",
			resourceType: "platform_category",
			resourceId: id,
			metadata: data,
		});
		return { id };
	});

export const movePlatformCategory = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = object(input);
		const direction = String(values.direction);
		if (!["up", "down"].includes(direction))
			throw new Error("Invalid direction.");
		return {
			id: text(values.id, "Category", 120),
			direction: direction as "up" | "down",
		};
	})
	.handler(async ({ data }) => {
		const { session } = await adminContext();
		const categories = await db
			.select({
				id: schema.platformCategory.id,
				position: schema.platformCategory.position,
			})
			.from(schema.platformCategory)
			.orderBy(asc(schema.platformCategory.position));
		const index = categories.findIndex((item) => item.id === data.id);
		const swapIndex = data.direction === "up" ? index - 1 : index + 1;
		if (index < 0 || swapIndex < 0 || swapIndex >= categories.length)
			return { moved: false };
		await db.batch([
			db
				.update(schema.platformCategory)
				.set({ position: categories[swapIndex].position })
				.where(eq(schema.platformCategory.id, categories[index].id)),
			db
				.update(schema.platformCategory)
				.set({ position: categories[index].position })
				.where(eq(schema.platformCategory.id, categories[swapIndex].id)),
		]);
		await writeAudit({
			actorId: session.user.id,
			action: "category.moved",
			resourceType: "platform_category",
			resourceId: data.id,
			metadata: { direction: data.direction },
		});
		return { moved: true };
	});
