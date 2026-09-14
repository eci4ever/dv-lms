import { env } from "cloudflare:workers";
import { and, eq, gt, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });

async function isCompleted(enrollmentId: string, courseId: string) {
	const lessons = await db
		.select({ completedAt: schema.lessonProgress.completedAt })
		.from(schema.lesson)
		.innerJoin(
			schema.courseSection,
			eq(schema.lesson.sectionId, schema.courseSection.id),
		)
		.leftJoin(
			schema.lessonProgress,
			and(
				eq(schema.lessonProgress.enrollmentId, enrollmentId),
				eq(schema.lessonProgress.lessonId, schema.lesson.id),
			),
		)
		.where(eq(schema.courseSection.courseId, courseId));
	return lessons.length > 0 && lessons.every((lesson) => lesson.completedAt);
}

export async function activateEnrollment(
	userId: string,
	courseId: string,
	now = new Date(),
) {
	const [existing] = await db
		.select({ id: schema.enrollment.id })
		.from(schema.enrollment)
		.where(
			and(
				eq(schema.enrollment.userId, userId),
				eq(schema.enrollment.courseId, courseId),
			),
		)
		.limit(1);
	const id = existing?.id ?? crypto.randomUUID();
	const completed = existing ? await isCompleted(id, courseId) : false;
	await db
		.insert(schema.enrollment)
		.values({
			id,
			userId,
			courseId,
			status: completed ? "completed" : "active",
			completedAt: completed ? now : null,
		})
		.onConflictDoUpdate({
			target: [schema.enrollment.courseId, schema.enrollment.userId],
			set: {
				status: completed ? "completed" : "active",
				completedAt: completed ? now : null,
				updatedAt: now,
			},
		});
	return id;
}

export async function hasPermanentAccess(userId: string, courseId: string) {
	const [access] = await db
		.select({ id: schema.orderEntitlement.id })
		.from(schema.orderEntitlement)
		.innerJoin(
			schema.courseOrder,
			eq(schema.orderEntitlement.orderId, schema.courseOrder.id),
		)
		.where(
			and(
				eq(schema.courseOrder.buyerId, userId),
				eq(schema.orderEntitlement.courseId, courseId),
				eq(schema.orderEntitlement.status, "active"),
				eq(schema.courseOrder.status, "paid"),
			),
		)
		.limit(1);
	return Boolean(access);
}

export async function reconcileCourseAccess(
	userId: string,
	courseIds: string[],
	now = new Date(),
) {
	for (const courseId of [...new Set(courseIds)]) {
		const [course] = await db
			.select({ priceInSen: schema.course.priceInSen })
			.from(schema.course)
			.where(eq(schema.course.id, courseId))
			.limit(1);
		const permanent = await hasPermanentAccess(userId, courseId);
		const [membership] = await db
			.select({ id: schema.subscriptionEntitlement.id })
			.from(schema.subscriptionEntitlement)
			.innerJoin(
				schema.subscription,
				eq(
					schema.subscriptionEntitlement.subscriptionId,
					schema.subscription.id,
				),
			)
			.where(
				and(
					eq(schema.subscription.buyerId, userId),
					eq(schema.subscriptionEntitlement.courseId, courseId),
					eq(schema.subscriptionEntitlement.status, "active"),
					inArray(schema.subscription.status, ["active", "cancelled"]),
					gt(schema.subscription.currentPeriodEnd, now),
				),
			)
			.limit(1);
		if (course?.priceInSen === 0 || permanent || membership)
			await activateEnrollment(userId, courseId, now);
		else
			await db
				.update(schema.enrollment)
				.set({ status: "cancelled", completedAt: null, updatedAt: now })
				.where(
					and(
						eq(schema.enrollment.userId, userId),
						eq(schema.enrollment.courseId, courseId),
					),
				);
	}
}
