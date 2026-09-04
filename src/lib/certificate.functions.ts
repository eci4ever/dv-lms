import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { certificate, course, user } from "@/db/schema";

export const verifyCertificate = createServerFn({ method: "GET" })
	.validator((data: { verificationId: string }) => {
		if (!data.verificationId.trim())
			throw new Error("Verification ID is required");
		return { verificationId: data.verificationId.trim() };
	})
	.handler(async ({ data }) => {
		const db = getDatabase();
		return (
			(await db
				.select({
					verificationId: certificate.verificationId,
					issuedAt: certificate.issuedAt,
					learnerName: user.name,
					courseTitle: course.title,
				})
				.from(certificate)
				.innerJoin(user, eq(certificate.userId, user.id))
				.innerJoin(course, eq(certificate.courseId, course.id))
				.where(eq(certificate.verificationId, data.verificationId))
				.get()) ?? null
		);
	});
