import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { getDatabase } from "@/db";
import * as schema from "@/db/schema";

export function getAuth() {
	return betterAuth({
		appName: "DevLMS",
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(getDatabase(), {
			provider: "sqlite",
			schema,
		}),
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 8,
		},
		plugins: [
			admin({
				defaultRole: "user",
				adminRoles: ["admin"],
				impersonationSessionDuration: 60 * 60,
			}),
			organization({
				organizationLimit: 5,
				membershipLimit: 100,
				invitationLimit: 100,
				invitationExpiresIn: 60 * 60 * 48,
				cancelPendingInvitationsOnReInvite: true,
				requireEmailVerificationOnInvitation: true,
			}),
			tanstackStartCookies(),
		],
	});
}
