import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { asc, count, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { course, enrollment, lesson } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import {
	getYouTubeEmbedUrl,
	parseQuizDefinition,
	serializeQuizDefinition,
} from "@/lib/lesson-content";

export type CourseStatus = "draft" | "published";
export type LessonContentType = "video" | "article" | "quiz";

export type CourseInput = {
	id?: string;
	title: string;
	slug: string;
	description: string;
	duration: string;
	priceSen: number;
	status: CourseStatus;
	thumbnailUrl: string;
};

export type LessonInput = {
	id?: string;
	courseId: string;
	title: string;
	description: string;
	duration: string;
	contentType: LessonContentType;
	videoUrl: string;
	content: string;
	attachmentUrl: string;
	isPreview: boolean;
};

async function requirePlatformAdmin() {
	const session = await getAuth().api.getSession({
		headers: getRequestHeaders(),
	});
	const roles = session?.user.role?.split(",") ?? [];

	if (!session || !roles.includes("admin")) {
		throw new Error("Platform admin access required");
	}

	return session.user;
}

function requiredText(value: string, label: string, maxLength = 5000) {
	const result = value.trim();
	if (!result) throw new Error(`${label} is required`);
	if (result.length > maxLength) {
		throw new Error(`${label} must be ${maxLength} characters or fewer`);
	}
	return result;
}

function optionalUrl(value: string, label: string) {
	const result = value.trim();
	if (!result) return null;
	try {
		const url = new URL(result);
		if (url.protocol !== "https:" && url.protocol !== "http:")
			throw new Error();
	} catch {
		throw new Error(`${label} must be a valid HTTP or HTTPS URL`);
	}
	return result;
}

function validateCourse(input: CourseInput) {
	const title = requiredText(input.title, "Course title", 160);
	const slug = requiredText(input.slug, "Course slug", 120).toLowerCase();
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new Error(
			"Course slug may contain lowercase letters, numbers, and hyphens",
		);
	}
	if (!Number.isInteger(input.priceSen) || input.priceSen < 0) {
		throw new Error("Course price must be a positive amount");
	}
	if (input.status !== "draft" && input.status !== "published") {
		throw new Error("Invalid course status");
	}

	return {
		id: input.id,
		title,
		slug,
		description: requiredText(input.description, "Course description"),
		duration: requiredText(input.duration, "Course duration", 80),
		priceSen: input.priceSen,
		status: input.status,
		thumbnailUrl: optionalUrl(input.thumbnailUrl, "Thumbnail URL"),
	};
}

function validateLesson(input: LessonInput) {
	if (!input.courseId) throw new Error("Course ID is required");
	if (!(["video", "article", "quiz"] as const).includes(input.contentType)) {
		throw new Error("Invalid lesson content type");
	}

	const videoUrl = optionalUrl(input.videoUrl, "YouTube URL");
	if (videoUrl && !getYouTubeEmbedUrl(videoUrl)) {
		throw new Error("Video URL must be a valid YouTube link");
	}
	let content = input.content.trim() || null;
	if (input.contentType === "article" && !content) {
		throw new Error("Article content is required for an article lesson");
	}
	if (input.contentType === "quiz") {
		content = serializeQuizDefinition(parseQuizDefinition(content));
	}

	return {
		id: input.id,
		courseId: input.courseId,
		title: requiredText(input.title, "Lesson title", 160),
		description: requiredText(input.description, "Lesson description"),
		duration: requiredText(input.duration, "Lesson duration", 80),
		contentType: input.contentType,
		videoUrl,
		content,
		attachmentUrl: optionalUrl(input.attachmentUrl, "Attachment URL"),
		isPreview: Boolean(input.isPreview),
	};
}

export const getCourseAdminOverview = createServerFn({ method: "GET" }).handler(
	async () => {
		await requirePlatformAdmin();
		const db = getDatabase();
		const [courses, lessons, enrollmentTotals] = await Promise.all([
			db.select().from(course).orderBy(desc(course.createdAt)),
			db.select().from(lesson).orderBy(asc(lesson.position)),
			db
				.select({ courseId: enrollment.courseId, total: count(enrollment.id) })
				.from(enrollment)
				.groupBy(enrollment.courseId),
		]);

		const totals = new Map(
			enrollmentTotals.map((item) => [item.courseId, item.total]),
		);
		return courses.map((item) => ({
			...item,
			enrollmentCount: totals.get(item.id) ?? 0,
			lessons: lessons.filter((entry) => entry.courseId === item.id),
		}));
	},
);

export const createCourse = createServerFn({ method: "POST" })
	.validator(validateCourse)
	.handler(async ({ data }) => {
		await requirePlatformAdmin();
		if (data.status === "published") {
			throw new Error(
				"Create the course as a draft, add a lesson, then publish it",
			);
		}
		const id = crypto.randomUUID();
		const now = new Date();
		await getDatabase().insert(course).values({
			id,
			title: data.title,
			slug: data.slug,
			description: data.description,
			duration: data.duration,
			priceSen: data.priceSen,
			status: "draft",
			thumbnailUrl: data.thumbnailUrl,
			createdAt: now,
			updatedAt: now,
		});
		return { id };
	});

export const updateCourse = createServerFn({ method: "POST" })
	.validator((input: CourseInput) => {
		const result = validateCourse(input);
		if (!result.id) throw new Error("Course ID is required");
		return { ...result, id: result.id };
	})
	.handler(async ({ data }) => {
		await requirePlatformAdmin();
		const db = getDatabase();
		const currentCourse = await db
			.select({ id: course.id, publishedAt: course.publishedAt })
			.from(course)
			.where(eq(course.id, data.id))
			.get();
		if (!currentCourse) throw new Error("Course not found");

		if (data.status === "published") {
			const firstLesson = await db
				.select({ id: lesson.id })
				.from(lesson)
				.where(eq(lesson.courseId, data.id))
				.get();
			if (!firstLesson)
				throw new Error("Add at least one lesson before publishing");
		}

		const now = new Date();
		await db
			.update(course)
			.set({
				title: data.title,
				slug: data.slug,
				description: data.description,
				duration: data.duration,
				priceSen: data.priceSen,
				status: data.status,
				thumbnailUrl: data.thumbnailUrl,
				publishedAt:
					data.status === "published"
						? (currentCourse.publishedAt ?? now)
						: null,
				updatedAt: now,
			})
			.where(eq(course.id, data.id));
		return { success: true };
	});

export const deleteCourse = createServerFn({ method: "POST" })
	.validator((id: string) => {
		if (!id) throw new Error("Course ID is required");
		return id;
	})
	.handler(async ({ data: id }) => {
		await requirePlatformAdmin();
		await getDatabase().delete(course).where(eq(course.id, id));
		return { success: true };
	});

export const createLesson = createServerFn({ method: "POST" })
	.validator(validateLesson)
	.handler(async ({ data }) => {
		await requirePlatformAdmin();
		const db = getDatabase();
		const parentCourse = await db
			.select({ id: course.id })
			.from(course)
			.where(eq(course.id, data.courseId))
			.get();
		if (!parentCourse) throw new Error("Course not found");

		const lastLesson = await db
			.select({ position: lesson.position })
			.from(lesson)
			.where(eq(lesson.courseId, data.courseId))
			.orderBy(desc(lesson.position))
			.get();
		const id = crypto.randomUUID();
		const now = new Date();
		await db.insert(lesson).values({
			id,
			courseId: data.courseId,
			position: (lastLesson?.position ?? 0) + 1,
			title: data.title,
			description: data.description,
			duration: data.duration,
			contentType: data.contentType,
			videoUrl: data.videoUrl,
			content: data.content,
			attachmentUrl: data.attachmentUrl,
			isPreview: data.isPreview,
			createdAt: now,
			updatedAt: now,
		});
		return { id };
	});

export const updateLesson = createServerFn({ method: "POST" })
	.validator((input: LessonInput) => {
		const result = validateLesson(input);
		if (!result.id) throw new Error("Lesson ID is required");
		return { ...result, id: result.id };
	})
	.handler(async ({ data }) => {
		await requirePlatformAdmin();
		await getDatabase()
			.update(lesson)
			.set({
				title: data.title,
				description: data.description,
				duration: data.duration,
				contentType: data.contentType,
				videoUrl: data.videoUrl,
				content: data.content,
				attachmentUrl: data.attachmentUrl,
				isPreview: data.isPreview,
				updatedAt: new Date(),
			})
			.where(eq(lesson.id, data.id));
		return { success: true };
	});

export const deleteLesson = createServerFn({ method: "POST" })
	.validator((id: string) => {
		if (!id) throw new Error("Lesson ID is required");
		return id;
	})
	.handler(async ({ data: id }) => {
		await requirePlatformAdmin();
		const db = getDatabase();
		const target = await db
			.select({ courseId: lesson.courseId })
			.from(lesson)
			.where(eq(lesson.id, id))
			.get();
		if (!target) throw new Error("Lesson not found");

		const parentCourse = await db
			.select({ status: course.status })
			.from(course)
			.where(eq(course.id, target.courseId))
			.get();
		const courseLessons = await db
			.select({ id: lesson.id })
			.from(lesson)
			.where(eq(lesson.courseId, target.courseId));
		if (parentCourse?.status === "published" && courseLessons.length === 1) {
			throw new Error("Unpublish the course before deleting its only lesson");
		}

		await db.delete(lesson).where(eq(lesson.id, id));
		const remainingLessons = await db
			.select({ id: lesson.id })
			.from(lesson)
			.where(eq(lesson.courseId, target.courseId))
			.orderBy(asc(lesson.position));
		for (const [index, item] of remainingLessons.entries()) {
			await db
				.update(lesson)
				.set({ position: index + 1 })
				.where(eq(lesson.id, item.id));
		}
		return { success: true };
	});

export const reorderLessons = createServerFn({ method: "POST" })
	.validator((input: { courseId: string; lessonIds: string[] }) => {
		if (!input.courseId) throw new Error("Course ID is required");
		if (!input.lessonIds.length)
			throw new Error("At least one lesson is required");
		if (new Set(input.lessonIds).size !== input.lessonIds.length) {
			throw new Error("Lesson order contains duplicates");
		}
		return input;
	})
	.handler(async ({ data }) => {
		await requirePlatformAdmin();
		const db = getDatabase();
		const existingLessons = await db
			.select({ id: lesson.id })
			.from(lesson)
			.where(eq(lesson.courseId, data.courseId));
		const existingIds = new Set(existingLessons.map((item) => item.id));
		if (
			existingIds.size !== data.lessonIds.length ||
			data.lessonIds.some((id) => !existingIds.has(id))
		) {
			throw new Error("Lesson order does not match this course");
		}

		for (const [index, id] of data.lessonIds.entries()) {
			await db
				.update(lesson)
				.set({ position: index + 1 })
				.where(eq(lesson.id, id));
		}
		return { success: true };
	});
