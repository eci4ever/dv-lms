import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { count, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { member, organization, session as sessionTable } from "@/db/schema";
import { getAuth } from "@/lib/auth";

async function requirePlatformAdmin() {
	const headers = getRequestHeaders();
	const session = await getAuth().api.getSession({ headers });
	const roles = session?.user.role?.split(",") ?? [];

	if (!session || !roles.includes("admin")) {
		throw new Error("Platform admin access required");
	}

	return { headers, session };
}

export const getPlatformAdminOverview = createServerFn({
	method: "GET",
}).handler(async () => {
	const { headers } = await requirePlatformAdmin();
	const [users, organizations] = await Promise.all([
		getAuth().api.listUsers({ query: { limit: 100, offset: 0 }, headers }),
		getDatabase()
			.select({
				id: organization.id,
				name: organization.name,
				slug: organization.slug,
				createdAt: organization.createdAt,
				memberCount: count(member.id),
			})
			.from(organization)
			.leftJoin(member, eq(member.organizationId, organization.id))
			.groupBy(organization.id)
			.orderBy(organization.createdAt),
	]);

	return { users, organizations };
});

type UserAction =
	| { action: "set-role"; userId: string; role: "admin" | "user" }
	| { action: "ban"; userId: string }
	| { action: "unban"; userId: string };

export const managePlatformUser = createServerFn({ method: "POST" })
	.inputValidator((input: UserAction) => input)
	.handler(async ({ data }) => {
		const { headers, session } = await requirePlatformAdmin();
		if (data.userId === session.user.id) {
			throw new Error("You cannot change your own platform access");
		}

		if (data.action === "set-role") {
			await getAuth().api.setRole({
				body: { userId: data.userId, role: data.role },
				headers,
			});
		} else if (data.action === "ban") {
			await getAuth().api.banUser({
				body: { userId: data.userId, banReason: "Platform policy violation" },
				headers,
			});
		} else {
			await getAuth().api.unbanUser({ body: { userId: data.userId }, headers });
		}

		return { success: true };
	});

export const deletePlatformOrganization = createServerFn({ method: "POST" })
	.inputValidator((organizationId: string) => {
		if (!organizationId) throw new Error("Organization ID is required");
		return organizationId;
	})
	.handler(async ({ data: organizationId }) => {
		await requirePlatformAdmin();
		const db = getDatabase();
		await db.batch([
			db
				.update(sessionTable)
				.set({ activeOrganizationId: null })
				.where(eq(sessionTable.activeOrganizationId, organizationId)),
			db.delete(organization).where(eq(organization.id, organizationId)),
		]);
		return { success: true };
	});
