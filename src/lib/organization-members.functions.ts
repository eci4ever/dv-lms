import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, count, eq, gt, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";
import { ensureOrganizationSubscription } from "@/lib/organization-plan.server";
import { writeAudit } from "@/lib/platform.server";

const db = drizzle(env.DB, { schema });

function record(input: unknown) {
	if (!input || typeof input !== "object" || Array.isArray(input))
		throw new Error("Invalid request.");
	return input as Record<string, unknown>;
}

async function managerContext() {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Authentication required.");
	const organizations = await auth.api.listOrganizations({ headers });
	const organizationId = session.session.activeOrganizationId;
	if (
		!organizationId ||
		!organizations.some((item) => item.id === organizationId)
	)
		throw new Error("Select an organization first.");
	const organization = await auth.api.getFullOrganization({
		headers,
		query: { organizationId },
	});
	const role = organization?.members.find(
		(item) => item.userId === session.user.id,
	)?.role;
	if (!role?.split(",").some((value) => value === "owner" || value === "admin"))
		throw new Error("Organization administrator access is required.");
	return { headers, session, organizationId };
}

export const inviteOrganizationMember = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const value = record(input);
		const email = typeof value.email === "string" ? value.email.trim() : "";
		const role = value.role;
		if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email is invalid.");
		if (role !== "admin" && role !== "member")
			throw new Error("Role is invalid.");
		return { email, role: role as "admin" | "member" };
	})
	.handler(async ({ data }) => {
		const { headers, organizationId, session } = await managerContext();
		await ensureOrganizationSubscription(organizationId);
		const [[subscription], [members], [pendingInvitations]] = await Promise.all(
			[
				db
					.select({ limit: schema.platformPlan.maxTeamMembers })
					.from(schema.organizationSubscription)
					.innerJoin(
						schema.platformPlan,
						eq(schema.organizationSubscription.planId, schema.platformPlan.id),
					)
					.where(
						and(
							eq(
								schema.organizationSubscription.organizationId,
								organizationId,
							),
							inArray(schema.organizationSubscription.status, [
								"active",
								"trialing",
							]),
							gt(schema.organizationSubscription.currentPeriodEnd, new Date()),
						),
					)
					.limit(1),
				db
					.select({ value: count() })
					.from(schema.member)
					.where(eq(schema.member.organizationId, organizationId)),
				db
					.select({ value: count() })
					.from(schema.invitation)
					.where(
						and(
							eq(schema.invitation.organizationId, organizationId),
							eq(schema.invitation.status, "pending"),
						),
					),
			],
		);
		if (
			!subscription ||
			members.value + pendingInvitations.value >= subscription.limit
		)
			throw new Error("Your plan team-member limit has been reached.");
		const invitation = await auth.api.createInvitation({
			headers,
			body: { ...data, organizationId },
		});
		await writeAudit({
			actorId: session.user.id,
			organizationId,
			action: "organization_member.invited",
			resourceType: "organization_invitation",
			resourceId: invitation.id,
			metadata: { role: data.role },
		});
		return { success: true };
	});

export const updateOrganizationMemberRole = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const value = record(input);
		const memberId = typeof value.memberId === "string" ? value.memberId : "";
		const role = value.role;
		if (!memberId) throw new Error("Member is required.");
		if (role !== "admin" && role !== "member")
			throw new Error("Role is invalid.");
		return { memberId, role };
	})
	.handler(async ({ data }) => {
		const { organizationId, session } = await managerContext();
		const [member] = await db
			.select({ role: schema.member.role })
			.from(schema.member)
			.where(
				and(
					eq(schema.member.id, data.memberId),
					eq(schema.member.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!member) throw new Error("Member not found.");
		if (member.role.split(",").includes("owner"))
			throw new Error("The organization owner role cannot be changed here.");
		await db
			.update(schema.member)
			.set({ role: data.role })
			.where(eq(schema.member.id, data.memberId));
		await writeAudit({
			actorId: session.user.id,
			organizationId,
			action: "organization_member.role_updated",
			resourceType: "organization_member",
			resourceId: data.memberId,
			metadata: { role: data.role },
		});
		return { success: true };
	});
