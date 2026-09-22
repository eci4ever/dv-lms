import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";
import {
	type CourseCategory,
	type CourseEditorInput,
	type CourseLevel,
	type CourseSectionInput,
	courseLevels,
} from "@/lib/course-types";
import { requireApprovedCreator } from "@/lib/platform.server";

const db = drizzle(env.DB, { schema });

function asRecord(value: unknown, message = "Invalid request.") {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(message);
	}
	return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, maximumLength: number) {
	const text = typeof value === "string" ? value.trim() : "";
	if (!text) throw new Error(`${label} is required.`);
	if (text.length > maximumLength) {
		throw new Error(`${label} must be ${maximumLength} characters or fewer.`);
	}
	return text;
}

function optionalString(value: unknown, maximumLength: number) {
	const text = typeof value === "string" ? value.trim() : "";
	if (text.length > maximumLength) {
		throw new Error(`Text must be ${maximumLength} characters or fewer.`);
	}
	return text;
}

function optionalHttpsUrl(value: unknown, label: string) {
	const text = optionalString(value, 2_000);
	if (!text) return "";
	try {
		const url = new URL(text);
		if (url.protocol !== "https:") throw new Error();
	} catch {
		throw new Error(`${label} must be a valid HTTPS URL.`);
	}
	return text;
}

function isCategory(value: string): value is CourseCategory {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isLevel(value: string): value is CourseLevel {
	return courseLevels.some((level) => level.value === value);
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

function validateIdInput(input: unknown) {
	const values = asRecord(input);
	return { id: requiredString(values.id, "Course", 100) };
}

function validateCreateInput(input: unknown) {
	const values = asRecord(input);
	return { title: requiredString(values.title, "Course title", 120) };
}

function validateEditorInput(input: unknown): CourseEditorInput {
	const values = asRecord(input);
	const id = requiredString(values.id, "Course", 100);
	const title = requiredString(values.title, "Course title", 120);
	const requestedSlug = requiredString(values.slug, "Course URL", 100);
	const slug = slugify(requestedSlug);
	if (!slug) throw new Error("Course URL must contain letters or numbers.");
	const summary = optionalString(values.summary, 240);
	const description = optionalString(values.description, 10_000);
	const category = typeof values.category === "string" ? values.category : "";
	const level = typeof values.level === "string" ? values.level : "";
	if (!isCategory(category)) throw new Error("Select a valid category.");
	if (!isLevel(level)) throw new Error("Select a valid level.");
	const language = requiredString(values.language, "Language", 60);
	const thumbnailUrl = optionalHttpsUrl(values.thumbnailUrl, "Thumbnail URL");
	const priceInSen = Number(values.priceInSen);
	const originalPriceInSen =
		values.originalPriceInSen === null ||
		values.originalPriceInSen === undefined ||
		values.originalPriceInSen === ""
			? null
			: Number(values.originalPriceInSen);
	if (!Number.isSafeInteger(priceInSen) || priceInSen < 0) {
		throw new Error("Price must be a valid non-negative amount.");
	}
	if (
		originalPriceInSen !== null &&
		(!Number.isSafeInteger(originalPriceInSen) ||
			originalPriceInSen <= 0 ||
			originalPriceInSen < priceInSen)
	) {
		throw new Error(
			"Original price must be equal to or higher than the price.",
		);
	}
	if (!Array.isArray(values.sections))
		throw new Error("Curriculum is invalid.");
	const sections: CourseSectionInput[] = values.sections.map(
		(sectionValue, sectionIndex) => {
			const section = asRecord(
				sectionValue,
				"A curriculum section is invalid.",
			);
			const sectionId = optionalString(section.id, 100) || crypto.randomUUID();
			const sectionTitle = requiredString(
				section.title,
				`Section ${sectionIndex + 1} title`,
				120,
			);
			if (!Array.isArray(section.lessons)) {
				throw new Error(`Section ${sectionIndex + 1} lessons are invalid.`);
			}
			return {
				id: sectionId,
				title: sectionTitle,
				lessons: section.lessons.map((lessonValue, lessonIndex) => {
					const lesson = asRecord(lessonValue, "A lesson is invalid.");
					const durationMinutes = Number(lesson.durationMinutes);
					if (
						!Number.isSafeInteger(durationMinutes) ||
						durationMinutes < 0 ||
						durationMinutes > 10_000
					) {
						throw new Error(
							`Lesson ${lessonIndex + 1} duration must be a valid number.`,
						);
					}
					return {
						id: optionalString(lesson.id, 100) || crypto.randomUUID(),
						title: requiredString(
							lesson.title,
							`Lesson ${lessonIndex + 1} title`,
							160,
						),
						content: optionalString(lesson.content, 50_000),
						videoUrl: optionalHttpsUrl(lesson.videoUrl, "Video URL"),
						durationMinutes,
					};
				}),
			};
		},
	);
	return {
		id,
		title,
		slug,
		summary,
		description,
		category,
		level,
		language,
		thumbnailUrl,
		priceInSen,
		originalPriceInSen,
		sections,
	};
}

function validateCatalogInput(input: unknown) {
	const values = input ? asRecord(input) : {};
	const query = optionalString(values.query, 120);
	const category = optionalString(values.category, 50);
	const level = optionalString(values.level, 50);
	const price = optionalString(values.price, 20);
	if (category && !isCategory(category))
		throw new Error("Invalid category filter.");
	if (level && !isLevel(level)) throw new Error("Invalid level filter.");
	if (price && !["free", "paid"].includes(price)) {
		throw new Error("Invalid price filter.");
	}
	return { query, category, level, price };
}

async function getSessionContext() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Authentication required.");
	const organizations = await auth.api.listOrganizations({ headers });
	const activeOrganizationId =
		session.session.activeOrganizationId &&
		organizations.some(
			(organization) =>
				organization.id === session.session.activeOrganizationId,
		)
			? session.session.activeOrganizationId
			: organizations[0]?.id;
	if (!activeOrganizationId) throw new Error("Select an organization first.");
	return { headers, session, activeOrganizationId };
}

async function requireOwner() {
	const context = await getSessionContext();
	const organization = await auth.api.getFullOrganization({
		headers: context.headers,
		query: { organizationId: context.activeOrganizationId },
	});
	const role = organization?.members.find(
		(member) => member.userId === context.session.user.id,
	)?.role;
	if (!role?.split(",").includes("owner")) {
		throw new Error("Organization owner access is required.");
	}
	return context;
}

async function requireOwnedCourse(id: string) {
	const context = await requireOwner();
	const [ownedCourse] = await db
		.select()
		.from(schema.course)
		.where(
			and(
				eq(schema.course.id, id),
				eq(schema.course.organizationId, context.activeOrganizationId),
			),
		)
		.limit(1);
	if (!ownedCourse) throw new Error("Course not found in this organization.");
	return { ...context, course: ownedCourse };
}

async function uniqueSlug(requested: string, excludeId?: string) {
	const base = slugify(requested) || "course";
	for (let suffix = 1; suffix < 10_000; suffix += 1) {
		const candidate = suffix === 1 ? base : `${base.slice(0, 72)}-${suffix}`;
		const conditions = [eq(schema.course.slug, candidate)];
		if (excludeId) conditions.push(ne(schema.course.id, excludeId));
		const [existing] = await db
			.select({ id: schema.course.id })
			.from(schema.course)
			.where(and(...conditions))
			.limit(1);
		if (!existing) return candidate;
	}
	throw new Error("Unable to create a unique course URL.");
}

const courseCardSelection = {
	id: schema.course.id,
	slug: schema.course.slug,
	title: schema.course.title,
	summary: schema.course.summary,
	category: schema.course.category,
	level: schema.course.level,
	language: schema.course.language,
	thumbnailUrl: schema.course.thumbnailUrl,
	priceInSen: schema.course.priceInSen,
	originalPriceInSen: schema.course.originalPriceInSen,
	status: schema.course.status,
	publishedAt: schema.course.publishedAt,
	createdAt: schema.course.createdAt,
	updatedAt: schema.course.updatedAt,
	organizationName: schema.organization.name,
	organizationSlug: schema.organization.slug,
	defaultOfferId: sql<string | null>`(
		select o.id from offer o
		inner join product p on o.product_id = p.id
		inner join product_course pc on p.id = pc.product_id
		where pc.course_id = ${schema.course.id}
			and p.type = 'course' and p.status = 'published' and o.status = 'active'
		order by o.position asc limit 1
	)`,
	defaultOfferPriceInSen: sql<number | null>`(
		select o.price_in_sen from offer o
		inner join product p on o.product_id = p.id
		inner join product_course pc on p.id = pc.product_id
		where pc.course_id = ${schema.course.id}
			and p.type = 'course' and p.status = 'published' and o.status = 'active'
		order by o.position asc limit 1
	)`,
	creatorName: schema.user.name,
	lessonCount: sql<number>`count(distinct ${schema.lesson.id})`,
	durationMinutes: sql<number>`coalesce(sum(${schema.lesson.durationMinutes}), 0)`,
	reviewCount: sql<number>`(
		select count(*) from course_review cr
		where cr.course_id = ${schema.course.id} and cr.status = 'published'
	)`,
	averageRating: sql<number>`coalesce((
		select round(avg(cr.rating), 1) from course_review cr
		where cr.course_id = ${schema.course.id} and cr.status = 'published'
	), 0)`,
};

export const listWorkspaceCourses = createServerFn({ method: "GET" }).handler(
	async () => {
		const { activeOrganizationId } = await requireOwner();
		return db
			.select(courseCardSelection)
			.from(schema.course)
			.innerJoin(
				schema.organization,
				eq(schema.course.organizationId, schema.organization.id),
			)
			.innerJoin(schema.user, eq(schema.course.creatorId, schema.user.id))
			.leftJoin(
				schema.courseSection,
				eq(schema.course.id, schema.courseSection.courseId),
			)
			.leftJoin(
				schema.lesson,
				eq(schema.courseSection.id, schema.lesson.sectionId),
			)
			.where(eq(schema.course.organizationId, activeOrganizationId))
			.groupBy(schema.course.id)
			.orderBy(desc(schema.course.updatedAt));
	},
);

export const createCourse = createServerFn({ method: "POST" })
	.validator(validateCreateInput)
	.handler(async ({ data }) => {
		const { activeOrganizationId, session } = await requireOwner();
		const id = crypto.randomUUID();
		const slug = await uniqueSlug(data.title);
		await db.insert(schema.course).values({
			id,
			organizationId: activeOrganizationId,
			creatorId: session.user.id,
			slug,
			title: data.title,
			category: "development",
		});
		return { id, slug };
	});

export const getWorkspaceCourse = createServerFn({ method: "GET" })
	.validator(validateIdInput)
	.handler(async ({ data }) => {
		const { course } = await requireOwnedCourse(data.id);
		const sections = await db
			.select()
			.from(schema.courseSection)
			.where(eq(schema.courseSection.courseId, course.id))
			.orderBy(asc(schema.courseSection.position));
		const sectionIds = sections.map((section) => section.id);
		const lessons = sectionIds.length
			? await db
					.select()
					.from(schema.lesson)
					.where(
						or(
							...sectionIds.map((sectionId) =>
								eq(schema.lesson.sectionId, sectionId),
							),
						),
					)
					.orderBy(asc(schema.lesson.position))
			: [];
		return {
			...course,
			sections: sections.map((section) => ({
				...section,
				lessons: lessons.filter((lesson) => lesson.sectionId === section.id),
			})),
		};
	});

export const saveCourse = createServerFn({ method: "POST" })
	.validator(validateEditorInput)
	.handler(async ({ data }) => {
		const { course } = await requireOwnedCourse(data.id);
		if (data.category !== course.category) {
			const [category] = await db
				.select({ id: schema.platformCategory.id })
				.from(schema.platformCategory)
				.where(
					and(
						eq(schema.platformCategory.slug, data.category),
						eq(schema.platformCategory.active, true),
					),
				)
				.limit(1);
			if (!category) throw new Error("Select an active category.");
		}
		const slug = await uniqueSlug(data.slug, data.id);
		await db
			.update(schema.course)
			.set({
				title: data.title,
				slug,
				summary: data.summary,
				description: data.description,
				category: data.category,
				level: data.level,
				language: data.language,
				thumbnailUrl: data.thumbnailUrl || null,
				priceInSen: data.priceInSen,
				originalPriceInSen: data.originalPriceInSen,
				updatedAt: new Date(),
			})
			.where(eq(schema.course.id, data.id));
		await db
			.delete(schema.courseSection)
			.where(eq(schema.courseSection.courseId, data.id));
		if (data.sections.length) {
			await db.insert(schema.courseSection).values(
				data.sections.map((section, position) => ({
					id: section.id,
					courseId: data.id,
					title: section.title,
					position,
				})),
			);
		}
		const lessons = data.sections.flatMap((section) =>
			section.lessons.map((lesson, position) => ({
				id: lesson.id,
				sectionId: section.id,
				title: lesson.title,
				content: lesson.content,
				videoUrl: lesson.videoUrl || null,
				durationMinutes: lesson.durationMinutes,
				position,
			})),
		);
		if (lessons.length) await db.insert(schema.lesson).values(lessons);
		return { id: data.id, slug };
	});

export const publishCourse = createServerFn({ method: "POST" })
	.validator(validateIdInput)
	.handler(async ({ data }) => {
		const { course } = await requireOwnedCourse(data.id);
		await requireApprovedCreator(course.organizationId);
		if (course.moderationStatus !== "active")
			throw new Error(
				"Platform moderation must restore this course before publishing.",
			);
		if (course.status !== "draft")
			throw new Error("Only draft courses can be published.");
		if (!course.summary || !course.description || !course.thumbnailUrl) {
			throw new Error(
				"Add a summary, description, and thumbnail before publishing.",
			);
		}
		const [{ count }] = await db
			.select({ count: sql<number>`count(${schema.lesson.id})` })
			.from(schema.lesson)
			.innerJoin(
				schema.courseSection,
				eq(schema.lesson.sectionId, schema.courseSection.id),
			)
			.where(eq(schema.courseSection.courseId, course.id));
		if (Number(count) < 1)
			throw new Error("Add at least one lesson before publishing.");
		await db
			.update(schema.course)
			.set({
				status: "published",
				publishedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(schema.course.id, course.id));
		return { status: "published" as const };
	});

export const archiveCourse = createServerFn({ method: "POST" })
	.validator(validateIdInput)
	.handler(async ({ data }) => {
		const { course } = await requireOwnedCourse(data.id);
		if (course.status !== "published")
			throw new Error("Only published courses can be archived.");
		await db
			.update(schema.course)
			.set({ status: "archived", updatedAt: new Date() })
			.where(eq(schema.course.id, course.id));
		return { status: "archived" as const };
	});

export const restoreCourse = createServerFn({ method: "POST" })
	.validator(validateIdInput)
	.handler(async ({ data }) => {
		const { course } = await requireOwnedCourse(data.id);
		if (course.status !== "archived")
			throw new Error("Only archived courses can be restored.");
		await db
			.update(schema.course)
			.set({ status: "draft", publishedAt: null, updatedAt: new Date() })
			.where(eq(schema.course.id, course.id));
		return { status: "draft" as const };
	});

export const deleteDraftCourse = createServerFn({ method: "POST" })
	.validator(validateIdInput)
	.handler(async ({ data }) => {
		const { course } = await requireOwnedCourse(data.id);
		if (course.status !== "draft")
			throw new Error("Only draft courses can be deleted.");
		await db.delete(schema.course).where(eq(schema.course.id, course.id));
		return { deleted: true };
	});

async function fetchPublicCourses(
	data: ReturnType<typeof validateCatalogInput>,
) {
	const filters = [
		eq(schema.course.status, "published"),
		eq(schema.course.moderationStatus, "active"),
		eq(schema.creatorApplication.status, "approved"),
	];
	if (data.query) {
		const query = `%${data.query}%`;
		const searchFilter = or(
			like(schema.course.title, query),
			like(schema.course.summary, query),
			like(schema.organization.name, query),
		);
		if (searchFilter) filters.push(searchFilter);
	}
	if (data.category) filters.push(eq(schema.course.category, data.category));
	if (data.level) filters.push(eq(schema.course.level, data.level));
	if (data.price === "free") filters.push(eq(schema.course.priceInSen, 0));
	if (data.price === "paid") filters.push(sql`${schema.course.priceInSen} > 0`);
	return db
		.select(courseCardSelection)
		.from(schema.course)
		.innerJoin(
			schema.organization,
			eq(schema.course.organizationId, schema.organization.id),
		)
		.innerJoin(schema.user, eq(schema.course.creatorId, schema.user.id))
		.innerJoin(
			schema.creatorApplication,
			eq(
				schema.course.organizationId,
				schema.creatorApplication.organizationId,
			),
		)
		.leftJoin(
			schema.courseSection,
			eq(schema.course.id, schema.courseSection.courseId),
		)
		.leftJoin(
			schema.lesson,
			eq(schema.courseSection.id, schema.lesson.sectionId),
		)
		.where(and(...filters))
		.groupBy(schema.course.id)
		.orderBy(desc(schema.course.publishedAt));
}

export const listPublicCourses = createServerFn({ method: "GET" })
	.validator(validateCatalogInput)
	.handler(async ({ data }) => fetchPublicCourses(data));

export const getPublicCourse = createServerFn({ method: "GET" })
	.validator((input: unknown) => {
		const values = asRecord(input);
		return { slug: requiredString(values.slug, "Course URL", 100) };
	})
	.handler(async ({ data }) => {
		const [course] = await db
			.select({
				...courseCardSelection,
				description: schema.course.description,
			})
			.from(schema.course)
			.innerJoin(
				schema.organization,
				eq(schema.course.organizationId, schema.organization.id),
			)
			.innerJoin(schema.user, eq(schema.course.creatorId, schema.user.id))
			.innerJoin(
				schema.creatorApplication,
				eq(
					schema.course.organizationId,
					schema.creatorApplication.organizationId,
				),
			)
			.leftJoin(
				schema.courseSection,
				eq(schema.course.id, schema.courseSection.courseId),
			)
			.leftJoin(
				schema.lesson,
				eq(schema.courseSection.id, schema.lesson.sectionId),
			)
			.where(
				and(
					eq(schema.course.slug, data.slug),
					eq(schema.course.status, "published"),
					eq(schema.course.moderationStatus, "active"),
					eq(schema.creatorApplication.status, "approved"),
				),
			)
			.groupBy(schema.course.id)
			.limit(1);
		if (!course) return null;
		const sections = await db
			.select()
			.from(schema.courseSection)
			.where(eq(schema.courseSection.courseId, course.id))
			.orderBy(asc(schema.courseSection.position));
		const sectionIds = sections.map((section) => section.id);
		const lessons = sectionIds.length
			? await db
					.select({
						id: schema.lesson.id,
						sectionId: schema.lesson.sectionId,
						title: schema.lesson.title,
						durationMinutes: schema.lesson.durationMinutes,
						position: schema.lesson.position,
					})
					.from(schema.lesson)
					.where(or(...sectionIds.map((id) => eq(schema.lesson.sectionId, id))))
					.orderBy(asc(schema.lesson.position))
			: [];
		return {
			...course,
			sections: sections.map((section) => ({
				id: section.id,
				title: section.title,
				position: section.position,
				lessons: lessons.filter((lesson) => lesson.sectionId === section.id),
			})),
		};
	});

export const listFeaturedCourses = createServerFn({ method: "GET" }).handler(
	async () => {
		const courses = await fetchPublicCourses({
			query: "",
			category: "",
			level: "",
			price: "",
		});
		return courses.slice(0, 4);
	},
);
