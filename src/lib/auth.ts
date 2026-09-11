import { env } from "cloudflare:workers";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { admin, organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/auth-schema";

const db = drizzle(env.DB, { schema });

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	databaseHooks: {
		user: {
			create: {
				after: async (createdUser) => {
					const firstUser = db
						.select({ id: schema.user.id })
						.from(schema.user)
						.orderBy(sql`rowid`)
						.limit(1);

					await db
						.update(schema.user)
						.set({ role: "admin" })
						.where(
							and(
								eq(schema.user.id, createdUser.id),
								inArray(schema.user.id, firstUser),
							),
						);
				},
			},
		},
	},
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	plugins: [admin(), organization(), tanstackStartCookies()],
});
