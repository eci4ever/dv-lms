import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-page";
import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Log in | DV LMS" }] }),
	beforeLoad: async () => {
		if (await getSession()) throw redirect({ to: "/dashboard" });
	},
	component: () => <AuthPage mode="login" />,
});
