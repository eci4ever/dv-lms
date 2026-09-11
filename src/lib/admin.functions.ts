import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import {
	type AssignableOrganizationRole,
	assignableOrganizationRoles,
} from "@/lib/organization-permissions";

interface CreateAdminOrganizationUserInput {
	name: string;
	email: string;
	password: string;
	organizationId: string;
	organizationRole: AssignableOrganizationRole;
}

function isOrganizationRole(
	value: string,
): value is AssignableOrganizationRole {
	return assignableOrganizationRoles.some((role) => role === value);
}

function validateCreateAdminOrganizationUser(
	input: unknown,
): CreateAdminOrganizationUserInput {
	if (!input || typeof input !== "object") {
		throw new Error("User details are required.");
	}

	const values = input as Record<string, unknown>;
	const name = typeof values.name === "string" ? values.name.trim() : "";
	const email = typeof values.email === "string" ? values.email.trim() : "";
	const password = typeof values.password === "string" ? values.password : "";
	const organizationId =
		typeof values.organizationId === "string"
			? values.organizationId.trim()
			: "";
	const organizationRole =
		typeof values.organizationRole === "string" ? values.organizationRole : "";

	if (!name || !email || !password || !organizationId) {
		throw new Error("Name, email, password, and organization are required.");
	}
	if (!isOrganizationRole(organizationRole)) {
		throw new Error("Select a valid organization role.");
	}

	return { name, email, password, organizationId, organizationRole };
}

export const getAdminUsers = createServerFn({ method: "GET" }).handler(
	async () => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });

		if (
			!session?.user.role?.split(",").includes("admin") ||
			session.session.impersonatedBy
		) {
			throw new Error("Administrator access is required.");
		}

		return auth.api.listUsers({
			headers,
			query: { limit: 50, sortBy: "createdAt", sortDirection: "desc" },
		});
	},
);

export const createAdminOrganizationUser = createServerFn({ method: "POST" })
	.validator(validateCreateAdminOrganizationUser)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });

		if (
			!session?.user.role?.split(",").includes("admin") ||
			session.session.impersonatedBy
		) {
			throw new Error("Administrator access is required.");
		}

		const organizations = await auth.api.listOrganizations({ headers });
		if (
			!organizations.some(
				(organization) => organization.id === data.organizationId,
			)
		) {
			throw new Error("You do not have access to the selected organization.");
		}

		const created = await auth.api.createUser({
			headers,
			body: {
				name: data.name,
				email: data.email,
				password: data.password,
				role: "user",
			},
		});

		try {
			const membership = await auth.api.addMember({
				body: {
					userId: created.user.id,
					organizationId: data.organizationId,
					role: data.organizationRole,
				},
			});

			return { user: created.user, membership };
		} catch (error) {
			await auth.api
				.removeUser({
					headers,
					body: { userId: created.user.id },
				})
				.catch(() => undefined);
			throw error;
		}
	});
