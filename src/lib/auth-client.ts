import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import {
	organizationAccessControl,
	organizationRoles,
} from "@/lib/organization-permissions";

export const authClient = createAuthClient({
	plugins: [
		adminClient(),
		organizationClient({
			ac: organizationAccessControl,
			roles: organizationRoles,
		}),
	],
});
