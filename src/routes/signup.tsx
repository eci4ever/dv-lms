import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthPage } from "@/components/auth-page";
import { sessionQueryOptions } from "@/lib/session.query";

export const Route = createFileRoute("/signup")({
	beforeLoad: async ({ context }) => {
		if (await context.queryClient.ensureQueryData(sessionQueryOptions)) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: SignupPage,
});

function SignupPage() {
	return <AuthPage mode="signup" />;
}
