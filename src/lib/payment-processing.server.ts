import { env } from "cloudflare:workers";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { activateEnrollment } from "@/lib/access.server";
import * as schema from "@/lib/auth-schema";
import {
	billplzCollectionId,
	verifyBillplzSignature,
} from "@/lib/billplz.server";
import { writeAudit } from "@/lib/platform.server";

const db = drizzle(env.DB, { schema });

async function coursesForOffer(offerId: string) {
	return db
		.select({ id: schema.course.id })
		.from(schema.productCourse)
		.innerJoin(
			schema.course,
			eq(schema.productCourse.courseId, schema.course.id),
		)
		.innerJoin(
			schema.product,
			eq(schema.productCourse.productId, schema.product.id),
		)
		.innerJoin(schema.offer, eq(schema.offer.productId, schema.product.id))
		.where(eq(schema.offer.id, offerId))
		.orderBy(asc(schema.productCourse.position));
}

export async function processBillplzCallback(parameters: URLSearchParams) {
	if (!(await verifyBillplzSignature(parameters))) {
		return { ok: false as const, status: 401, error: "Invalid signature." };
	}
	const billId = parameters.get("id") ?? "";
	const collectionId = parameters.get("collection_id") ?? "";
	const amount = Number(parameters.get("amount"));
	const paidAmount = Number(parameters.get("paid_amount"));
	const paid = parameters.get("paid") === "true";
	const state = parameters.get("state") ?? "";
	const [attempt] = await db
		.select({
			id: schema.paymentAttempt.id,
			status: schema.paymentAttempt.status,
			orderId: schema.courseOrder.id,
			orderStatus: schema.courseOrder.status,
			buyerId: schema.courseOrder.buyerId,
			offerId: schema.courseOrder.offerId,
			organizationId: schema.courseOrder.organizationId,
			grossInSen: schema.courseOrder.grossInSen,
			sellerNetInSen: schema.courseOrder.sellerNetInSen,
			currency: schema.courseOrder.currency,
		})
		.from(schema.paymentAttempt)
		.innerJoin(
			schema.courseOrder,
			eq(schema.paymentAttempt.orderId, schema.courseOrder.id),
		)
		.where(
			and(
				eq(schema.paymentAttempt.provider, "billplz"),
				eq(schema.paymentAttempt.providerPaymentId, billId),
			),
		)
		.limit(1);
	if (!attempt)
		return { ok: false as const, status: 404, error: "Unknown bill." };
	if (attempt.orderStatus === "refunded")
		return { ok: true as const, paid: true };
	if (
		collectionId !== billplzCollectionId() ||
		!Number.isInteger(amount) ||
		amount !== attempt.grossInSen ||
		(paid && paidAmount !== attempt.grossInSen)
	) {
		await writeAudit({
			organizationId: attempt.organizationId,
			action: "payment.callback_mismatch",
			resourceType: "course_order",
			resourceId: attempt.orderId,
			metadata: { billId, state, amount, paidAmount },
		});
		return {
			ok: false as const,
			status: 400,
			error: "Payment details do not match.",
		};
	}
	const callbackPayload = JSON.stringify({
		id: billId,
		state,
		paid,
		amount,
		paidAmount,
		transactionId: parameters.get("transaction_id"),
		transactionStatus: parameters.get("transaction_status"),
		paidAt: parameters.get("paid_at"),
	});
	if (!paid || state !== "paid") {
		await db
			.update(schema.paymentAttempt)
			.set({
				status: state === "deleted" ? "cancelled" : "pending",
				callbackPayload,
				failureReason:
					parameters.get("transaction_status") === "failed"
						? "Payment failed."
						: null,
				updatedAt: new Date(),
			})
			.where(eq(schema.paymentAttempt.id, attempt.id));
		return { ok: true as const, paid: false };
	}
	if (!attempt.offerId)
		return { ok: false as const, status: 400, error: "Order has no offer." };
	const courses = await coursesForOffer(attempt.offerId);
	if (!courses.length)
		return { ok: false as const, status: 400, error: "Order has no courses." };
	const now = new Date();
	await db.batch([
		db
			.update(schema.paymentAttempt)
			.set({
				status: "paid",
				callbackPayload,
				transactionReference: parameters.get("transaction_id"),
				paymentChannel: parameters.get("transaction_status") ? "Billplz" : null,
				paidAt: now,
				failureReason: null,
				updatedAt: now,
			})
			.where(eq(schema.paymentAttempt.id, attempt.id)),
		db
			.update(schema.courseOrder)
			.set({
				status: "paid",
				paidAt: now,
				paymentFailureReason: null,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.courseOrder.id, attempt.orderId),
					eq(schema.courseOrder.status, "pending"),
				),
			),
		...courses.map((course) =>
			db
				.insert(schema.orderEntitlement)
				.values({
					id: crypto.randomUUID(),
					orderId: attempt.orderId,
					courseId: course.id,
				})
				.onConflictDoUpdate({
					target: [
						schema.orderEntitlement.orderId,
						schema.orderEntitlement.courseId,
					],
					set: { status: "active", revokedAt: null },
				}),
		),
		db
			.insert(schema.creatorLedgerEntry)
			.values({
				id: crypto.randomUUID(),
				organizationId: attempt.organizationId,
				orderId: attempt.orderId,
				type: "sale",
				amountInSen: attempt.sellerNetInSen,
				currency: attempt.currency,
				description: `Sale for order ${attempt.orderId}`,
			})
			.onConflictDoNothing(),
	]);
	for (const course of courses)
		await activateEnrollment(attempt.buyerId, course.id, now);
	return { ok: true as const, paid: true };
}
