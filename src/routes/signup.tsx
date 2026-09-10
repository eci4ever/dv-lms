import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-page";
import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/signup")({
	head: () => ({ meta: [{ title: "Sign up | DV LMS" }] }),
	beforeLoad: async () => {
		if (await getSession()) throw redirect({ to: "/dashboard" });
	},
	component: () => <AuthPage mode="signup" />,
});
