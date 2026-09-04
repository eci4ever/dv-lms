import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { course, enrollment, lesson } from "@/db/schema";

export const getPublishedCourses = createServerFn({ method: "GET" }).handler(
	async () => {
		const db = getDatabase();
		return db
			.select({
				id: course.id,
				slug: course.slug,
				title: course.title,
				description: course.description,
				duration: course.duration,
				priceSen: course.priceSen,
				thumbnailUrl: course.thumbnailUrl,
				lessonCount: count(lesson.id),
			})
			.from(course)
			.leftJoin(lesson, eq(lesson.courseId, course.id))
			.where(eq(course.status, "published"))
			.groupBy(course.id)
			.orderBy(asc(course.publishedAt), asc(course.title));
	},
);

export const getPublishedCourse = createServerFn({ method: "GET" })
	.validator((data: { slug: string }) => {
		if (!data.slug.trim()) throw new Error("Course slug is required");
		return { slug: data.slug.trim() };
	})
	.handler(async ({ data }) => {
		const db = getDatabase();
		const publishedCourse = await db
			.select({
				id: course.id,
				slug: course.slug,
				title: course.title,
				description: course.description,
				duration: course.duration,
				priceSen: course.priceSen,
				thumbnailUrl: course.thumbnailUrl,
				publishedAt: course.publishedAt,
			})
			.from(course)
			.where(and(eq(course.slug, data.slug), eq(course.status, "published")))
			.get();

		if (!publishedCourse) return null;

		const [curriculum, enrollmentTotal] = await Promise.all([
			db
				.select({
					id: lesson.id,
					position: lesson.position,
					title: lesson.title,
					description: lesson.description,
					duration: lesson.duration,
					contentType: lesson.contentType,
					isPreview: lesson.isPreview,
				})
				.from(lesson)
				.where(eq(lesson.courseId, publishedCourse.id))
				.orderBy(asc(lesson.position)),
			db
				.select({ total: count() })
				.from(enrollment)
				.where(eq(enrollment.courseId, publishedCourse.id))
				.get(),
		]);

		return {
			course: publishedCourse,
			curriculum,
			enrollmentTotal: enrollmentTotal?.total ?? 0,
			level: "Beginner",
		};
	});
