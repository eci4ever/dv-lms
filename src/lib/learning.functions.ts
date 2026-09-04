import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
	certificate,
	course,
	enrollment,
	lesson,
	lessonEngagement,
	lessonProgress,
	quizAttempt,
} from "@/db/schema";
import { getAuth } from "@/lib/auth";
import {
	getStudentQuiz,
	gradeQuiz,
	parseQuizDefinition,
	type QuizAnswer,
} from "@/lib/lesson-content";

async function requireUser() {
	const session = await getAuth().api.getSession({
		headers: getRequestHeaders(),
	});
	if (!session) throw new Error("Authentication required");
	return session.user;
}

async function syncCourseCompletion(userId: string, lessonId: string) {
	const db = getDatabase();
	const enrolledCourse = await db
		.select({ courseId: lesson.courseId, enrollmentId: enrollment.id })
		.from(lesson)
		.innerJoin(enrollment, eq(enrollment.courseId, lesson.courseId))
		.where(and(eq(lesson.id, lessonId), eq(enrollment.userId, userId)))
		.get();
	if (!enrolledCourse) return;

	const [lessonTotal, completedTotal] = await Promise.all([
		db
			.select({ total: count() })
			.from(lesson)
			.where(eq(lesson.courseId, enrolledCourse.courseId))
			.get(),
		db
			.select({ total: count() })
			.from(lessonProgress)
			.innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
			.where(
				and(
					eq(lessonProgress.userId, userId),
					eq(lesson.courseId, enrolledCourse.courseId),
				),
			)
			.get(),
	]);
	const isComplete =
		(lessonTotal?.total ?? 0) > 0 &&
		lessonTotal?.total === completedTotal?.total;
	await db
		.update(enrollment)
		.set({ completedAt: isComplete ? new Date() : null })
		.where(eq(enrollment.id, enrolledCourse.enrollmentId));
	if (isComplete) {
		await db
			.insert(certificate)
			.values({
				id: crypto.randomUUID(),
				verificationId: crypto.randomUUID(),
				userId,
				courseId: enrolledCourse.courseId,
				issuedAt: new Date(),
			})
			.onConflictDoNothing();
	} else {
		await db
			.delete(certificate)
			.where(
				and(
					eq(certificate.userId, userId),
					eq(certificate.courseId, enrolledCourse.courseId),
				),
			);
	}
}

export const getMyCourses = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await requireUser();
		const db = getDatabase();
		const enrolledCourses = await db
			.select({
				course,
				enrolledAt: enrollment.createdAt,
				lastAccessedAt: enrollment.lastAccessedAt,
				lastAccessedLessonId: enrollment.lastAccessedLessonId,
			})
			.from(enrollment)
			.innerJoin(course, eq(enrollment.courseId, course.id))
			.where(
				and(eq(enrollment.userId, user.id), eq(course.status, "published")),
			)
			.orderBy(desc(enrollment.lastAccessedAt), desc(enrollment.createdAt));

		if (enrolledCourses.length === 0) return [];

		const courseIds = enrolledCourses.map((item) => item.course.id);
		const [lessons, progress] = await Promise.all([
			db
				.select({
					id: lesson.id,
					courseId: lesson.courseId,
					position: lesson.position,
					title: lesson.title,
					duration: lesson.duration,
				})
				.from(lesson)
				.where(inArray(lesson.courseId, courseIds))
				.orderBy(asc(lesson.position)),
			db
				.select({ lessonId: lessonProgress.lessonId })
				.from(lessonProgress)
				.innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
				.where(
					and(
						eq(lessonProgress.userId, user.id),
						inArray(lesson.courseId, courseIds),
					),
				),
		]);
		const completedIds = new Set(progress.map((item) => item.lessonId));

		return enrolledCourses.map((item) => {
			const courseLessons = lessons.filter(
				(entry) => entry.courseId === item.course.id,
			);
			const completedLessonCount = courseLessons.filter((entry) =>
				completedIds.has(entry.id),
			).length;
			const nextLesson = courseLessons.find(
				(entry) => !completedIds.has(entry.id),
			);
			const savedLesson = courseLessons.find(
				(entry) => entry.id === item.lastAccessedLessonId,
			);
			const resumeLesson =
				savedLesson ?? nextLesson ?? courseLessons.at(-1) ?? null;

			return {
				course: item.course,
				enrolledAt: item.enrolledAt,
				lastAccessedAt: item.lastAccessedAt,
				lessonCount: courseLessons.length,
				completedLessonCount,
				progress:
					courseLessons.length === 0
						? 0
						: Math.round((completedLessonCount / courseLessons.length) * 100),
				nextLesson: nextLesson ?? null,
				resumeLesson,
			};
		});
	},
);

export const getMyCourse = createServerFn({ method: "GET" })
	.validator((data: { courseSlug: string }) => {
		if (!data.courseSlug) throw new Error("Course slug is required");
		return data;
	})
	.handler(async ({ data }) => {
		const user = await requireUser();
		const db = getDatabase();
		const activeCourse = await db
			.select()
			.from(course)
			.where(
				and(eq(course.slug, data.courseSlug), eq(course.status, "published")),
			)
			.get();

		if (!activeCourse) throw new Error("Course has not been published");

		const activeEnrollment = await db
			.select({
				id: enrollment.id,
				lastAccessedLessonId: enrollment.lastAccessedLessonId,
			})
			.from(enrollment)
			.where(
				and(
					eq(enrollment.courseId, activeCourse.id),
					eq(enrollment.userId, user.id),
				),
			)
			.get();

		if (!activeEnrollment) {
			return {
				course: activeCourse,
				enrolled: false,
				lessons: [],
				completedLessonIds: [] as string[],
				resumeLessonId: null,
			};
		}

		const [lessons, progress, engagement] = await Promise.all([
			db
				.select()
				.from(lesson)
				.where(eq(lesson.courseId, activeCourse.id))
				.orderBy(asc(lesson.position)),
			db
				.select({ lessonId: lessonProgress.lessonId })
				.from(lessonProgress)
				.innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
				.where(
					and(
						eq(lesson.courseId, activeCourse.id),
						eq(lessonProgress.userId, user.id),
					),
				),
			db
				.select({
					lessonId: lessonEngagement.lessonId,
					playbackPositionSeconds: lessonEngagement.playbackPositionSeconds,
					learningSeconds: lessonEngagement.learningSeconds,
				})
				.from(lessonEngagement)
				.innerJoin(lesson, eq(lessonEngagement.lessonId, lesson.id))
				.where(
					and(
						eq(lesson.courseId, activeCourse.id),
						eq(lessonEngagement.userId, user.id),
					),
				),
		]);
		const engagementByLesson = new Map(
			engagement.map((item) => [item.lessonId, item]),
		);

		const learnerLessons = lessons.map((item) => {
			const activity = engagementByLesson.get(item.id);
			const withEngagement = {
				...item,
				playbackPositionSeconds: activity?.playbackPositionSeconds ?? 0,
				learningSeconds: activity?.learningSeconds ?? 0,
			};
			if (item.contentType !== "quiz") return withEngagement;
			try {
				return {
					...withEngagement,
					content: JSON.stringify(
						getStudentQuiz(parseQuizDefinition(item.content)),
					),
				};
			} catch {
				return {
					...withEngagement,
					content: JSON.stringify({ passingScore: 80, questions: [] }),
				};
			}
		});

		return {
			course: activeCourse,
			enrolled: true,
			lessons: learnerLessons,
			completedLessonIds: progress.map((item) => item.lessonId),
			resumeLessonId: activeEnrollment.lastAccessedLessonId,
		};
	});

export const recordLessonEngagement = createServerFn({ method: "POST" })
	.validator(
		(data: {
			lessonId: string;
			learningSeconds: number;
			playbackPositionSeconds?: number;
		}) => {
			if (!data.lessonId) throw new Error("Lesson ID is required");
			if (
				!Number.isInteger(data.learningSeconds) ||
				data.learningSeconds < 0 ||
				data.learningSeconds > 60
			) {
				throw new Error("Learning duration is invalid");
			}
			const playbackPositionSeconds = Math.max(
				0,
				Math.floor(data.playbackPositionSeconds ?? 0),
			);
			return { ...data, playbackPositionSeconds };
		},
	)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const db = getDatabase();
		const enrolledLesson = await db
			.select({ id: lesson.id })
			.from(lesson)
			.innerJoin(enrollment, eq(enrollment.courseId, lesson.courseId))
			.where(and(eq(lesson.id, data.lessonId), eq(enrollment.userId, user.id)))
			.get();
		if (!enrolledLesson) throw new Error("Course enrollment required");

		const existing = await db
			.select({ learningSeconds: lessonEngagement.learningSeconds })
			.from(lessonEngagement)
			.where(
				and(
					eq(lessonEngagement.userId, user.id),
					eq(lessonEngagement.lessonId, data.lessonId),
				),
			)
			.get();
		await db
			.insert(lessonEngagement)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				lessonId: data.lessonId,
				learningSeconds: data.learningSeconds,
				playbackPositionSeconds: data.playbackPositionSeconds,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [lessonEngagement.userId, lessonEngagement.lessonId],
				set: {
					learningSeconds:
						(existing?.learningSeconds ?? 0) + data.learningSeconds,
					playbackPositionSeconds: data.playbackPositionSeconds,
					updatedAt: new Date(),
				},
			});
		return { success: true };
	});

export const recordLessonAccess = createServerFn({ method: "POST" })
	.validator((lessonId: string) => {
		if (!lessonId) throw new Error("Lesson ID is required");
		return lessonId;
	})
	.handler(async ({ data: lessonId }) => {
		const user = await requireUser();
		const db = getDatabase();
		const enrolledLesson = await db
			.select({ enrollmentId: enrollment.id })
			.from(lesson)
			.innerJoin(enrollment, eq(enrollment.courseId, lesson.courseId))
			.where(and(eq(lesson.id, lessonId), eq(enrollment.userId, user.id)))
			.get();
		if (!enrolledLesson) throw new Error("Course enrollment required");

		await db
			.update(enrollment)
			.set({ lastAccessedLessonId: lessonId, lastAccessedAt: new Date() })
			.where(eq(enrollment.id, enrolledLesson.enrollmentId));
		return { success: true };
	});

export const enrollInFreeCourse = createServerFn({ method: "POST" })
	.validator((data: { courseSlug: string }) => {
		if (!data.courseSlug) throw new Error("Course slug is required");
		return data;
	})
	.handler(async ({ data }) => {
		const user = await requireUser();
		const db = getDatabase();
		const activeCourse = await db
			.select({ id: course.id, priceSen: course.priceSen })
			.from(course)
			.where(
				and(eq(course.slug, data.courseSlug), eq(course.status, "published")),
			)
			.get();

		if (!activeCourse) throw new Error("Course has not been published");
		if (activeCourse.priceSen !== 0) {
			throw new Error("This course requires payment before enrollment");
		}

		await db
			.insert(enrollment)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				courseId: activeCourse.id,
				createdAt: new Date(),
			})
			.onConflictDoNothing();

		return { success: true };
	});

export const markLessonIncomplete = createServerFn({ method: "POST" })
	.validator((data: { lessonId: string }) => {
		if (!data.lessonId) throw new Error("Lesson ID is required");
		return data;
	})
	.handler(async ({ data }) => {
		const user = await requireUser();
		const db = getDatabase();
		const enrolledLesson = await db
			.select({ id: lesson.id })
			.from(lesson)
			.innerJoin(enrollment, eq(enrollment.courseId, lesson.courseId))
			.where(and(eq(lesson.id, data.lessonId), eq(enrollment.userId, user.id)))
			.get();
		if (!enrolledLesson) throw new Error("Course enrollment required");

		await db
			.delete(lessonProgress)
			.where(
				and(
					eq(lessonProgress.userId, user.id),
					eq(lessonProgress.lessonId, data.lessonId),
				),
			);
		await syncCourseCompletion(user.id, data.lessonId);
		return { success: true };
	});

export const completeLesson = createServerFn({ method: "POST" })
	.validator((data: { lessonId: string }) => {
		if (!data.lessonId) throw new Error("Lesson ID is required");
		return data;
	})
	.handler(async ({ data }) => {
		const user = await requireUser();
		const db = getDatabase();
		const enrolledLesson = await db
			.select({ lessonId: lesson.id, contentType: lesson.contentType })
			.from(lesson)
			.innerJoin(enrollment, eq(enrollment.courseId, lesson.courseId))
			.where(and(eq(lesson.id, data.lessonId), eq(enrollment.userId, user.id)))
			.get();

		if (!enrolledLesson) throw new Error("Course enrollment required");
		if (enrolledLesson.contentType === "quiz") {
			throw new Error("Pass the quiz to complete this lesson");
		}

		await db
			.insert(lessonProgress)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				lessonId: data.lessonId,
				completedAt: new Date(),
			})
			.onConflictDoNothing();
		await syncCourseCompletion(user.id, data.lessonId);

		return { success: true };
	});

export const submitQuiz = createServerFn({ method: "POST" })
	.validator((input: { lessonId: string; answers: QuizAnswer[] }) => {
		if (!input.lessonId) throw new Error("Lesson ID is required");
		if (!Array.isArray(input.answers) || input.answers.length > 30) {
			throw new Error("Quiz answers are invalid");
		}
		const questionIds = new Set<string>();
		for (const answer of input.answers) {
			if (
				!answer ||
				typeof answer.questionId !== "string" ||
				!Number.isInteger(answer.optionIndex) ||
				answer.optionIndex < 0 ||
				questionIds.has(answer.questionId)
			) {
				throw new Error("Quiz answers are invalid");
			}
			questionIds.add(answer.questionId);
		}
		return input;
	})
	.handler(async ({ data }) => {
		const user = await requireUser();
		const db = getDatabase();
		const enrolledQuiz = await db
			.select({
				id: lesson.id,
				content: lesson.content,
				contentType: lesson.contentType,
			})
			.from(lesson)
			.innerJoin(enrollment, eq(enrollment.courseId, lesson.courseId))
			.where(and(eq(lesson.id, data.lessonId), eq(enrollment.userId, user.id)))
			.get();
		if (!enrolledQuiz) throw new Error("Course enrollment required");
		if (enrolledQuiz.contentType !== "quiz") {
			throw new Error("This lesson is not a quiz");
		}

		const definition = parseQuizDefinition(enrolledQuiz.content);
		const allowedIds = new Set(
			definition.questions.map((question) => question.id),
		);
		if (data.answers.some((answer) => !allowedIds.has(answer.questionId))) {
			throw new Error("Quiz answers are invalid");
		}
		const result = gradeQuiz(definition, data.answers);
		await db.insert(quizAttempt).values({
			id: crypto.randomUUID(),
			userId: user.id,
			lessonId: data.lessonId,
			score: result.score,
			passed: result.passed,
			answers: JSON.stringify(data.answers),
			createdAt: new Date(),
		});
		if (result.passed) {
			await db
				.insert(lessonProgress)
				.values({
					id: crypto.randomUUID(),
					userId: user.id,
					lessonId: data.lessonId,
					completedAt: new Date(),
				})
				.onConflictDoNothing();
			await syncCourseCompletion(user.id, data.lessonId);
		}

		return result;
	});
