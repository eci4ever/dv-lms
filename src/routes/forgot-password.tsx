import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
	head: () => ({ meta: [{ title: "Forgot password | DV LMS" }] }),
	beforeLoad: async () => {
		if (await getSession()) throw redirect({ to: "/dashboard" });
	},
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsPending(true);

		const result = await authClient.requestPasswordReset({
			email,
			redirectTo: `${window.location.origin}/reset-password`,
		});

		setIsPending(false);
		if (result.error) {
			toast.error("We could not process your request. Please try again.");
			return;
		}

		setIsSubmitted(true);
		toast.success("Reset link requested", {
			description: "Check your inbox for the next step.",
		});
	}

	return (
		<AuthLayout
			title="Forgot your password?"
			description="Enter your email and we’ll send you a secure reset link."
			footer={
				<Link
					className="font-medium text-foreground underline underline-offset-4"
					to="/login"
				>
					Back to sign in
				</Link>
			}
		>
			{isSubmitted ? (
				<div className="space-y-5 text-center">
					<div className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
						<MailCheckIcon className="size-5" aria-hidden="true" />
					</div>
					<div className="space-y-1.5">
						<p className="font-medium">Check your inbox</p>
						<p className="text-sm leading-6 text-muted-foreground">
							If an account exists for {email}, we sent a password reset link.
							It expires in 1 hour.
						</p>
					</div>
					<Button
						className="h-10 w-full"
						type="button"
						variant="outline"
						onClick={() => setIsSubmitted(false)}
					>
						Try another email
					</Button>
				</div>
			) : (
				<form className="space-y-5" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor="reset-email">
							Email address
						</label>
						<Input
							id="reset-email"
							name="email"
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							value={email}
							onChange={(event) => setEmail(event.currentTarget.value)}
							required
						/>
					</div>
					<Button className="h-10 w-full" type="submit" disabled={isPending}>
						{isPending ? "Sending reset link…" : "Send reset link"}
					</Button>
				</form>
			)}
		</AuthLayout>
	);
}
