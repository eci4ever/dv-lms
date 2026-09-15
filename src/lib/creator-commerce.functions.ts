import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";
import {
	type BillingInterval,
	type BillingType,
	type ProductEditorInput,
	type ProductType,
	productTypes,
} from "@/lib/creator-commerce-types";

const db = drizzle(env.DB, { schema });

function record(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Invalid request.");
	}
	return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number, required = true) {
	const result = typeof value === "string" ? value.trim() : "";
	if (required && !result) throw new Error(`${label} is required.`);
	if (result.length > max) throw new Error(`${label} is too long.`);
	return result;
}

function httpsUrl(value: unknown, label: string) {
	const result = text(value, label, 2_000, false);
	if (!result) return "";
	try {
		if (new URL(result).protocol !== "https:") throw new Error();
	} catch {
		throw new Error(`${label} must be a valid HTTPS URL.`);
	}
	return result;
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

async function ownerContext() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Authentication required.");
	const organizations = await auth.api.listOrganizations({ headers });
	const activeOrganizationId =
		session.session.activeOrganizationId &&
		organizations.some(
			(item) => item.id === session.session.activeOrganizationId,
		)
			? session.session.activeOrganizationId
			: organizations[0]?.id;
	if (!activeOrganizationId) throw new Error("Select an organization first.");
	const organization = await auth.api.getFullOrganization({
		headers,
		query: { organizationId: activeOrganizationId },
	});
	const role = organization?.members.find(
		(item) => item.userId === session.user.id,
	)?.role;
	if (!role?.split(",").includes("owner")) {
		throw new Error("Organization owner access is required.");
	}
	return { session, activeOrganizationId, organization };
}

async function ownedProduct(id: string) {
	const context = await ownerContext();
	const [product] = await db
		.select()
		.from(schema.product)
		.where(
			and(
				eq(schema.product.id, id),
				eq(schema.product.organizationId, context.activeOrganizationId),
			),
		)
		.limit(1);
	if (!product) throw new Error("Product not found in this organization.");
	return { ...context, product };
}

async function uniqueProductSlug(
	organizationId: string,
	requested: string,
	excludeId?: string,
) {
	const base = slugify(requested) || "product";
	for (let suffix = 1; suffix < 10_000; suffix += 1) {
		const candidate = suffix === 1 ? base : `${base.slice(0, 72)}-${suffix}`;
		const filters = [
			eq(schema.product.organizationId, organizationId),
			eq(schema.product.slug, candidate),
		];
		if (excludeId) filters.push(ne(schema.product.id, excludeId));
		const [found] = await db
			.select({ id: schema.product.id })
			.from(schema.product)
			.where(and(...filters))
			.limit(1);
		if (!found) return candidate;
	}
	throw new Error("Unable to create a unique product URL.");
}

function validateId(input: unknown) {
	return { id: text(record(input).id, "Product", 100) };
}

function validateCreate(input: unknown) {
	const values = record(input);
	const type = values.type;
	if (typeof type !== "string" || !productTypes.includes(type as ProductType)) {
		throw new Error("Select a valid product type.");
	}
	return {
		name: text(values.name, "Product name", 120),
		type: type as ProductType,
	};
}

function validateProfile(input: unknown) {
	const values = record(input);
	return {
		displayName: text(values.displayName, "Display name", 120),
		headline: text(values.headline, "Headline", 180, false),
		bio: text(values.bio, "Bio", 5_000, false),
		heroUrl: httpsUrl(values.heroUrl, "Hero image URL"),
		websiteUrl: httpsUrl(values.websiteUrl, "Website URL"),
		youtubeUrl: httpsUrl(values.youtubeUrl, "YouTube URL"),
		githubUrl: httpsUrl(values.githubUrl, "GitHub URL"),
		twitterUrl: httpsUrl(values.twitterUrl, "X URL"),
	};
}

function validateProduct(input: unknown): ProductEditorInput {
	const values = record(input);
	const type = values.type;
	if (typeof type !== "string" || !productTypes.includes(type as ProductType)) {
		throw new Error("Select a valid product type.");
	}
	if (!Array.isArray(values.courseIds) || !Array.isArray(values.offers)) {
		throw new Error("Product contents are invalid.");
	}
	const courseIds = [...new Set(values.courseIds)].map((id) =>
		text(id, "Course", 100),
	);
	if (type === "course" && courseIds.length !== 1) {
		throw new Error("A course product must include exactly one course.");
	}
	if (type !== "course" && courseIds.length < 1) {
		throw new Error("Select at least one course.");
	}
	const offers = values.offers.map((value, index) => {
		const offer = record(value);
		const billingType = offer.billingType;
		if (billingType !== "one_time" && billingType !== "recurring") {
			throw new Error(`Offer ${index + 1} has an invalid billing type.`);
		}
		const billingInterval =
			billingType === "recurring" ? offer.billingInterval : null;
		if (
			billingType === "recurring" &&
			billingInterval !== "month" &&
			billingInterval !== "year"
		) {
			throw new Error(`Offer ${index + 1} needs a billing interval.`);
		}
		if (type === "membership" && billingType !== "recurring") {
			throw new Error("Membership offers must be recurring.");
		}
		if (type !== "membership" && billingType !== "one_time") {
			throw new Error("Course and bundle offers must be one-time.");
		}
		const priceInSen = Number(offer.priceInSen);
		if (!Number.isSafeInteger(priceInSen) || priceInSen <= 0) {
			throw new Error(`Offer ${index + 1} price must be greater than zero.`);
		}
		return {
			id: text(offer.id, "Offer", 100, false) || crypto.randomUUID(),
			name: text(offer.name, `Offer ${index + 1} name`, 120),
			priceInSen,
			billingType: billingType as BillingType,
			billingInterval: billingInterval as BillingInterval,
			status:
				offer.status === "inactive"
					? ("inactive" as const)
					: ("active" as const),
		};
	});
	return {
		id: text(values.id, "Product", 100),
		type: type as ProductType,
		slug: slugify(text(values.slug, "Product URL", 100)),
		name: text(values.name, "Product name", 120),
		summary: text(values.summary, "Summary", 240, false),
		description: text(values.description, "Description", 10_000, false),
		imageUrl: httpsUrl(values.imageUrl, "Product image URL"),
		featured: values.featured === true,
		courseIds,
		offers,
	};
}

export const getStorefrontSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const { activeOrganizationId, organization } = await ownerContext();
		const [profile] = await db
			.select()
			.from(schema.creatorProfile)
			.where(eq(schema.creatorProfile.organizationId, activeOrganizationId))
			.limit(1);
		return {
			organizationSlug: organization?.slug ?? "",
			profile: profile ?? {
				id: "",
				organizationId: activeOrganizationId,
				displayName: organization?.name ?? "Creator",
				headline: "",
				bio: "",
				heroUrl: null,
				websiteUrl: null,
				youtubeUrl: null,
				githubUrl: null,
				twitterUrl: null,
				status: "draft",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		};
	},
);

export const saveStorefront = createServerFn({ method: "POST" })
	.validator(validateProfile)
	.handler(async ({ data }) => {
		const { activeOrganizationId } = await ownerContext();
		const now = new Date();
		await db
			.insert(schema.creatorProfile)
			.values({
				id: crypto.randomUUID(),
				organizationId: activeOrganizationId,
				...data,
			})
			.onConflictDoUpdate({
				target: schema.creatorProfile.organizationId,
				set: { ...data, updatedAt: now },
			});
		return { saved: true };
	});

export const setStorefrontStatus = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const value = record(input).status;
		if (value !== "draft" && value !== "published")
			throw new Error("Invalid status.");
		return { status: value };
	})
	.handler(async ({ data }) => {
		const { activeOrganizationId } = await ownerContext();
		const [profile] = await db
			.select()
			.from(schema.creatorProfile)
			.where(eq(schema.creatorProfile.organizationId, activeOrganizationId))
			.limit(1);
		if (!profile) throw new Error("Save the storefront first.");
		if (data.status === "published" && (!profile.headline || !profile.bio)) {
			throw new Error("Add a headline and bio before publishing.");
		}
		await db
			.update(schema.creatorProfile)
			.set({ status: data.status, updatedAt: new Date() })
			.where(eq(schema.creatorProfile.id, profile.id));
		return data;
	});

export const listWorkspaceProducts = createServerFn({ method: "GET" }).handler(
	async () => {
		const { activeOrganizationId } = await ownerContext();
		return db
			.select({
				id: schema.product.id,
				type: schema.product.type,
				slug: schema.product.slug,
				name: schema.product.name,
				summary: schema.product.summary,
				imageUrl: schema.product.imageUrl,
				status: schema.product.status,
				featured: schema.product.featured,
				courseCount: sql<number>`count(distinct ${schema.productCourse.courseId})`,
				offerCount: sql<number>`count(distinct ${schema.offer.id})`,
				minimumPriceInSen: sql<
					number | null
				>`min(case when ${schema.offer.status} = 'active' then ${schema.offer.priceInSen} end)`,
			})
			.from(schema.product)
			.leftJoin(
				schema.productCourse,
				eq(schema.product.id, schema.productCourse.productId),
			)
			.leftJoin(schema.offer, eq(schema.product.id, schema.offer.productId))
			.where(eq(schema.product.organizationId, activeOrganizationId))
			.groupBy(schema.product.id)
			.orderBy(desc(schema.product.updatedAt));
	},
);

export const createProduct = createServerFn({ method: "POST" })
	.validator(validateCreate)
	.handler(async ({ data }) => {
		const { activeOrganizationId } = await ownerContext();
		const id = crypto.randomUUID();
		const slug = await uniqueProductSlug(activeOrganizationId, data.name);
		await db
			.insert(schema.product)
			.values({ id, organizationId: activeOrganizationId, ...data, slug });
		return { id };
	});

export const getWorkspaceProduct = createServerFn({ method: "GET" })
	.validator(validateId)
	.handler(async ({ data }) => {
		const { activeOrganizationId, product } = await ownedProduct(data.id);
		const [courses, selectedCourses, offers] = await Promise.all([
			db
				.select({
					id: schema.course.id,
					title: schema.course.title,
					status: schema.course.status,
				})
				.from(schema.course)
				.where(eq(schema.course.organizationId, activeOrganizationId))
				.orderBy(asc(schema.course.title)),
			db
				.select({ courseId: schema.productCourse.courseId })
				.from(schema.productCourse)
				.where(eq(schema.productCourse.productId, product.id))
				.orderBy(asc(schema.productCourse.position)),
			db
				.select()
				.from(schema.offer)
				.where(eq(schema.offer.productId, product.id))
				.orderBy(asc(schema.offer.position)),
		]);
		return {
			...product,
			courses,
			courseIds: selectedCourses.map((item) => item.courseId),
			offers,
		};
	});

export const saveProduct = createServerFn({ method: "POST" })
	.validator(validateProduct)
	.handler(async ({ data }) => {
		const { activeOrganizationId } = await ownedProduct(data.id);
		const ownedCourses = await db
			.select({ id: schema.course.id })
			.from(schema.course)
			.where(
				and(
					eq(schema.course.organizationId, activeOrganizationId),
					inArray(schema.course.id, data.courseIds),
				),
			);
		if (ownedCourses.length !== data.courseIds.length)
			throw new Error(
				"A selected course does not belong to this organization.",
			);
		const slug = await uniqueProductSlug(
			activeOrganizationId,
			data.slug,
			data.id,
		);
		await db.batch([
			db
				.update(schema.product)
				.set({
					type: data.type,
					slug,
					name: data.name,
					summary: data.summary,
					description: data.description,
					imageUrl: data.imageUrl || null,
					featured: data.featured,
					updatedAt: new Date(),
				})
				.where(eq(schema.product.id, data.id)),
			db
				.delete(schema.productCourse)
				.where(eq(schema.productCourse.productId, data.id)),
			db
				.update(schema.offer)
				.set({ status: "inactive", updatedAt: new Date() })
				.where(eq(schema.offer.productId, data.id)),
		]);
		if (data.courseIds.length) {
			await db.insert(schema.productCourse).values(
				data.courseIds.map((courseId, position) => ({
					id: crypto.randomUUID(),
					productId: data.id,
					courseId,
					position,
				})),
			);
		}
		if (data.offers.length) {
			await db
				.insert(schema.offer)
				.values(
					data.offers.map((offer, position) => ({
						...offer,
						productId: data.id,
						position,
					})),
				)
				.onConflictDoUpdate({
					target: schema.offer.id,
					set: {
						name: sql`excluded.name`,
						priceInSen: sql`excluded.price_in_sen`,
						currency: sql`excluded.currency`,
						billingType: sql`excluded.billing_type`,
						billingInterval: sql`excluded.billing_interval`,
						status: sql`excluded.status`,
						position: sql`excluded.position`,
						updatedAt: new Date(),
					},
				});
		}
		return { id: data.id, slug };
	});

export const setProductStatus = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const values = record(input);
		const status = values.status;
		if (!["draft", "published", "archived"].includes(String(status)))
			throw new Error("Invalid status.");
		return {
			id: text(values.id, "Product", 100),
			status: status as "draft" | "published" | "archived",
		};
	})
	.handler(async ({ data }) => {
		const { product } = await ownedProduct(data.id);
		const allowed =
			(product.status === "draft" && data.status === "published") ||
			(product.status === "published" && data.status === "archived") ||
			(product.status === "archived" && data.status === "draft");
		if (!allowed) throw new Error("Invalid product status transition.");
		if (data.status === "published") {
			if (!product.summary || !product.description || !product.imageUrl)
				throw new Error(
					"Add summary, description and image before publishing.",
				);
			const [{ courses, offers }] = await db
				.select({
					courses: sql<number>`count(distinct ${schema.productCourse.courseId})`,
					offers: sql<number>`count(distinct case when ${schema.offer.status} = 'active' then ${schema.offer.id} end)`,
				})
				.from(schema.product)
				.leftJoin(
					schema.productCourse,
					eq(schema.product.id, schema.productCourse.productId),
				)
				.leftJoin(schema.offer, eq(schema.product.id, schema.offer.productId))
				.where(eq(schema.product.id, product.id));
			if (Number(courses) < 1 || Number(offers) < 1)
				throw new Error("Add courses and an active offer before publishing.");
		}
		await db
			.update(schema.product)
			.set({
				status: data.status,
				publishedAt: data.status === "published" ? new Date() : null,
				updatedAt: new Date(),
			})
			.where(eq(schema.product.id, product.id));
		return data;
	});

const publicProductSelection = {
	id: schema.product.id,
	type: schema.product.type,
	slug: schema.product.slug,
	name: schema.product.name,
	summary: schema.product.summary,
	description: schema.product.description,
	imageUrl: schema.product.imageUrl,
	featured: schema.product.featured,
	organizationName: schema.organization.name,
	organizationSlug: schema.organization.slug,
	minimumPriceInSen: sql<
		number | null
	>`min(case when ${schema.offer.status} = 'active' then ${schema.offer.priceInSen} end)`,
	courseCount: sql<number>`count(distinct ${schema.productCourse.courseId})`,
};

export const getPublicStorefront = createServerFn({ method: "GET" })
	.validator((input: unknown) => ({
		slug: text(record(input).slug, "Creator", 120),
	}))
	.handler(async ({ data }) => {
		const [profile] = await db
			.select({
				id: schema.creatorProfile.id,
				organizationId: schema.creatorProfile.organizationId,
				displayName: schema.creatorProfile.displayName,
				headline: schema.creatorProfile.headline,
				bio: schema.creatorProfile.bio,
				heroUrl: schema.creatorProfile.heroUrl,
				websiteUrl: schema.creatorProfile.websiteUrl,
				youtubeUrl: schema.creatorProfile.youtubeUrl,
				githubUrl: schema.creatorProfile.githubUrl,
				twitterUrl: schema.creatorProfile.twitterUrl,
				organizationName: schema.organization.name,
				organizationSlug: schema.organization.slug,
				logo: schema.organization.logo,
			})
			.from(schema.creatorProfile)
			.innerJoin(
				schema.organization,
				eq(schema.creatorProfile.organizationId, schema.organization.id),
			)
			.where(
				and(
					eq(schema.organization.slug, data.slug),
					eq(schema.creatorProfile.status, "published"),
				),
			)
			.limit(1);
		if (!profile) throw new Error("Creator storefront not found.");
		const products = await db
			.select(publicProductSelection)
			.from(schema.product)
			.innerJoin(
				schema.organization,
				eq(schema.product.organizationId, schema.organization.id),
			)
			.leftJoin(
				schema.productCourse,
				eq(schema.product.id, schema.productCourse.productId),
			)
			.leftJoin(schema.offer, eq(schema.product.id, schema.offer.productId))
			.where(
				and(
					eq(schema.product.organizationId, profile.organizationId),
					eq(schema.product.status, "published"),
				),
			)
			.groupBy(schema.product.id)
			.orderBy(
				desc(schema.product.featured),
				asc(schema.product.position),
				desc(schema.product.publishedAt),
			);
		return { profile, products };
	});

export const getPublicProduct = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		const values = record(input);
		return {
			creatorSlug: text(values.creatorSlug, "Creator", 120),
			productSlug: text(values.productSlug, "Product", 120),
		};
	})
	.handler(async ({ data }) => {
		const [product] = await db
			.select(publicProductSelection)
			.from(schema.product)
			.innerJoin(
				schema.organization,
				eq(schema.product.organizationId, schema.organization.id),
			)
			.innerJoin(
				schema.creatorProfile,
				eq(schema.organization.id, schema.creatorProfile.organizationId),
			)
			.leftJoin(
				schema.productCourse,
				eq(schema.product.id, schema.productCourse.productId),
			)
			.leftJoin(schema.offer, eq(schema.product.id, schema.offer.productId))
			.where(
				and(
					eq(schema.organization.slug, data.creatorSlug),
					eq(schema.product.slug, data.productSlug),
					eq(schema.product.status, "published"),
					eq(schema.creatorProfile.status, "published"),
				),
			)
			.groupBy(schema.product.id)
			.limit(1);
		if (!product) throw new Error("Product not found.");
		const [courses, offers] = await Promise.all([
			db
				.select({
					id: schema.course.id,
					slug: schema.course.slug,
					title: schema.course.title,
					summary: schema.course.summary,
					thumbnailUrl: schema.course.thumbnailUrl,
				})
				.from(schema.productCourse)
				.innerJoin(
					schema.course,
					eq(schema.productCourse.courseId, schema.course.id),
				)
				.where(eq(schema.productCourse.productId, product.id))
				.orderBy(asc(schema.productCourse.position)),
			db
				.select()
				.from(schema.offer)
				.where(
					and(
						eq(schema.offer.productId, product.id),
						eq(schema.offer.status, "active"),
					),
				)
				.orderBy(asc(schema.offer.position)),
		]);
		return { ...product, courses, offers };
	});
