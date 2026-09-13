import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });

function asRecord(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Invalid request.");
	}
	return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string) {
	const text = typeof value === "string" ? value.trim() : "";
	if (!text || text.length > 120) throw new Error(`${label} is invalid.`);
	return text;
}

function validateSlug(input: unknown) {
	const values = asRecord(input);
	return { slug: requiredString(values.slug, "Course URL") };
}

function validateLearningInput(input: unknown) {
	const values = asRecord(input);
	return {
		slug: requiredString(values.slug, "Course URL"),
		lessonId: requiredString(values.lessonId, "Lesson"),
	};
}

function validateProgressInput(input: unknown) {
	const values = asRecord(input);
	const positionSeconds = Number(values.positionSeconds ?? 0);
	if (
		!Number.isSafeInteger(positionSeconds) ||
		positionSeconds < 0 ||
		positionSeconds > 86_400
	) {
		throw new Error("Lesson position is invalid.");
	}
	return {
		lessonId: requiredString(values.lessonId, "Lesson"),
		completed: values.completed === true,
		positionSeconds,
	};
}

async function sessionOrNull() {
	return auth.api.getSession({ headers: getRequestHeaders() });
}

async function requireSession() {
	const session = await sessionOrNull();
	if (!session) throw new Error("Authentication required.");
	return session;
}

async function firstLessonId(courseId: string) {
	const [firstLesson] = await db
		.select({ id: schema.lesson.id })
		.from(schema.lesson)
		.innerJoin(
			schema.courseSection,
			eq(schema.lesson.sectionId, schema.courseSection.id),
		)
		.where(eq(schema.courseSection.courseId, courseId))
		.orderBy(asc(schema.courseSection.position), asc(schema.lesson.position))
		.limit(1);
	return firstLesson?.id ?? null;
}

export const getEnrollmentState = createServerFn({ method: "GET" })
	.validator(validateSlug)
	.handler(async ({ data }) => {
		const session = await sessionOrNull();
		if (!session) return { signedIn: false as const, enrollment: null };
		const [result] = await db
			.select({
				courseId: schema.course.id,
				enrollmentId: schema.enrollment.id,
				status: schema.enrollment.status,
			})
			.from(schema.course)
			.leftJoin(
				schema.enrollment,
				and(
					eq(schema.enrollment.courseId, schema.course.id),
					eq(schema.enrollment.userId, session.user.id),
				),
			)
			.where(
				and(
					eq(schema.course.slug, data.slug),
					eq(schema.course.status, "published"),
				),
			)
			.limit(1);
		if (!result) return { signedIn: true as const, enrollment: null };
		return {
			signedIn: true as const,
			enrollment: result.enrollmentId
				? {
						id: result.enrollmentId,
						status: result.status,
						firstLessonId: await firstLessonId(result.courseId),
					}
				: null,
		};
	});

export const enrollInFreeCourse = createServerFn({ method: "POST" })
	.validator(validateSlug)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const [course] = await db
			.select({ id: schema.course.id, priceInSen: schema.course.priceInSen })
			.from(schema.course)
			.where(
				and(
					eq(schema.course.slug, data.slug),
					eq(schema.course.status, "published"),
				),
			)
			.limit(1);
		if (!course) throw new Error("Published course not found.");
		if (course.priceInSen !== 0) {
			throw new Error("This course requires checkout.");
		}
		const [existing] = await db
			.select({ id: schema.enrollment.id })
			.from(schema.enrollment)
			.where(
				and(
					eq(schema.enrollment.courseId, course.id),
					eq(schema.enrollment.userId, session.user.id),
				),
			)
			.limit(1);
		const enrollmentId = existing?.id ?? crypto.randomUUID();
		if (!existing) {
			await db.insert(schema.enrollment).values({
				id: enrollmentId,
				courseId: course.id,
				userId: session.user.id,
			});
		}
		return {
			enrollmentId,
			firstLessonId: await firstLessonId(course.id),
		};
	});

export const listMyLearning = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await requireSession();
		return db
			.select({
				enrollmentId: schema.enrollment.id,
				status: schema.enrollment.status,
				enrolledAt: schema.enrollment.enrolledAt,
				courseId: schema.course.id,
				slug: schema.course.slug,
				title: schema.course.title,
				summary: schema.course.summary,
				thumbnailUrl: schema.course.thumbnailUrl,
				organizationName: schema.organization.name,
				firstLessonId: sql<string | null>`(
					select l.id from lesson l
					inner join course_section cs on l.section_id = cs.id
					where cs.course_id = ${schema.course.id}
					order by cs.position asc, l.position asc
					limit 1
				)`,
				totalLessons: sql<number>`count(distinct ${schema.lesson.id})`,
				completedLessons: sql<number>`count(distinct case when ${schema.lessonProgress.completedAt} is not null then ${schema.lessonProgress.lessonId} end)`,
			})
			.from(schema.enrollment)
			.innerJoin(
				schema.course,
				eq(schema.enrollment.courseId, schema.course.id),
			)
			.innerJoin(
				schema.organization,
				eq(schema.course.organizationId, schema.organization.id),
			)
			.leftJoin(
				schema.courseSection,
				eq(schema.course.id, schema.courseSection.courseId),
			)
			.leftJoin(
				schema.lesson,
				eq(schema.courseSection.id, schema.lesson.sectionId),
			)
			.leftJoin(
				schema.lessonProgress,
				and(
					eq(schema.lessonProgress.enrollmentId, schema.enrollment.id),
					eq(schema.lessonProgress.lessonId, schema.lesson.id),
				),
			)
			.where(
				and(
					eq(schema.enrollment.userId, session.user.id),
					ne(schema.course.status, "draft"),
				),
			)
			.groupBy(schema.enrollment.id)
			.orderBy(desc(schema.enrollment.updatedAt));
	},
);

export const getLearningCourse = createServerFn({ method: "GET" })
	.validator(validateLearningInput)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const [access] = await db
			.select({
				enrollmentId: schema.enrollment.id,
				courseId: schema.course.id,
				title: schema.course.title,
				slug: schema.course.slug,
				organizationName: schema.organization.name,
			})
			.from(schema.enrollment)
			.innerJoin(
				schema.course,
				eq(schema.enrollment.courseId, schema.course.id),
			)
			.innerJoin(
				schema.organization,
				eq(schema.course.organizationId, schema.organization.id),
			)
			.where(
				and(
					eq(schema.enrollment.userId, session.user.id),
					eq(schema.course.slug, data.slug),
					ne(schema.course.status, "draft"),
				),
			)
			.limit(1);
		if (!access)
			throw new Error("Enroll in this course to access its lessons.");

		const sections = await db
			.select({
				id: schema.courseSection.id,
				title: schema.courseSection.title,
				position: schema.courseSection.position,
			})
			.from(schema.courseSection)
			.where(eq(schema.courseSection.courseId, access.courseId))
			.orderBy(asc(schema.courseSection.position));
		const lessons = await db
			.select({
				id: schema.lesson.id,
				sectionId: schema.lesson.sectionId,
				title: schema.lesson.title,
				content: schema.lesson.content,
				videoUrl: schema.lesson.videoUrl,
				durationMinutes: schema.lesson.durationMinutes,
				position: schema.lesson.position,
				completedAt: schema.lessonProgress.completedAt,
				positionSeconds: schema.lessonProgress.positionSeconds,
			})
			.from(schema.lesson)
			.innerJoin(
				schema.courseSection,
				eq(schema.lesson.sectionId, schema.courseSection.id),
			)
			.leftJoin(
				schema.lessonProgress,
				and(
					eq(schema.lessonProgress.enrollmentId, access.enrollmentId),
					eq(schema.lessonProgress.lessonId, schema.lesson.id),
				),
			)
			.where(eq(schema.courseSection.courseId, access.courseId))
			.orderBy(asc(schema.courseSection.position), asc(schema.lesson.position));
		const selectedLesson = lessons.find(
			(lesson) => lesson.id === data.lessonId,
		);
		if (!selectedLesson) throw new Error("Lesson not found in this course.");
		return {
			...access,
			selectedLesson,
			sections: sections.map((section) => ({
				...section,
				lessons: lessons
					.filter((lesson) => lesson.sectionId === section.id)
					.map(({ content, videoUrl, ...lesson }) => lesson),
			})),
		};
	});

export const updateLessonProgress = createServerFn({ method: "POST" })
	.validator(validateProgressInput)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const [access] = await db
			.select({
				enrollmentId: schema.enrollment.id,
				courseId: schema.course.id,
			})
			.from(schema.enrollment)
			.innerJoin(
				schema.course,
				eq(schema.enrollment.courseId, schema.course.id),
			)
			.innerJoin(
				schema.courseSection,
				eq(schema.course.id, schema.courseSection.courseId),
			)
			.innerJoin(
				schema.lesson,
				and(
					eq(schema.courseSection.id, schema.lesson.sectionId),
					eq(schema.lesson.id, data.lessonId),
				),
			)
			.where(
				and(
					eq(schema.enrollment.userId, session.user.id),
					ne(schema.course.status, "draft"),
				),
			)
			.limit(1);
		if (!access) throw new Error("You cannot update this lesson.");

		const completedAt = data.completed ? new Date() : null;
		await db
			.insert(schema.lessonProgress)
			.values({
				id: crypto.randomUUID(),
				enrollmentId: access.enrollmentId,
				lessonId: data.lessonId,
				positionSeconds: data.positionSeconds,
				completedAt,
			})
			.onConflictDoUpdate({
				target: [
					schema.lessonProgress.enrollmentId,
					schema.lessonProgress.lessonId,
				],
				set: {
					positionSeconds: data.positionSeconds,
					completedAt,
					updatedAt: new Date(),
				},
			});

		const [counts] = await db
			.select({
				total: sql<number>`count(distinct ${schema.lesson.id})`,
				completed: sql<number>`count(distinct case when ${schema.lessonProgress.completedAt} is not null then ${schema.lessonProgress.lessonId} end)`,
			})
			.from(schema.lesson)
			.innerJoin(
				schema.courseSection,
				eq(schema.lesson.sectionId, schema.courseSection.id),
			)
			.leftJoin(
				schema.lessonProgress,
				and(
					eq(schema.lessonProgress.enrollmentId, access.enrollmentId),
					eq(schema.lessonProgress.lessonId, schema.lesson.id),
				),
			)
			.where(eq(schema.courseSection.courseId, access.courseId));
		const isComplete = Number(counts.completed) === Number(counts.total);
		await db
			.update(schema.enrollment)
			.set({
				status: isComplete ? "completed" : "active",
				completedAt: isComplete ? new Date() : null,
				updatedAt: new Date(),
			})
			.where(eq(schema.enrollment.id, access.enrollmentId));
		return {
			completed: data.completed,
			completedLessons: Number(counts.completed),
			totalLessons: Number(counts.total),
		};
	});
