import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

interface ResetPasswordSearch {
	error?: string;
	token?: string;
}

export const Route = createFileRoute("/reset-password")({
	head: () => ({ meta: [{ title: "Reset password | DV LMS" }] }),
	validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
		error: typeof search.error === "string" ? search.error : undefined,
		token: typeof search.token === "string" ? search.token : undefined,
	}),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const navigate = useNavigate({ from: "/reset-password" });
	const { error: tokenError, token } = Route.useSearch();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isPending, setIsPending] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!token) {
			toast.error("This reset link is invalid or has expired.");
			return;
		}
		if (password !== confirmPassword) {
			toast.error("Passwords do not match.");
			return;
		}

		setIsPending(true);
		const result = await authClient.resetPassword({
			newPassword: password,
			token,
		});
		setIsPending(false);

		if (result.error) {
			toast.error(
				result.error.code === "INVALID_TOKEN"
					? "This reset link is invalid or has expired. Request a new one."
					: (result.error.message ??
							"We could not reset your password. Please try again."),
			);
			return;
		}

		toast.success("Password updated", {
			description: "Sign in with your new password.",
		});
		await navigate({ to: "/login", replace: true });
	}

	const invalidToken = Boolean(tokenError) || !token;

	return (
		<AuthLayout
			title="Choose a new password"
			description="Use at least 8 characters for your new password."
			footer={
				<Link
					className="font-medium text-foreground underline underline-offset-4"
					to="/login"
				>
					Back to sign in
				</Link>
			}
		>
			{invalidToken ? (
				<div className="space-y-5 text-center">
					<div className="mx-auto grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
						<CircleAlertIcon className="size-5" aria-hidden="true" />
					</div>
					<div className="space-y-1.5">
						<p className="font-medium">Reset link unavailable</p>
						<p className="text-sm leading-6 text-muted-foreground">
							This password reset link is invalid or has expired.
						</p>
					</div>
					<Button
						className="h-10 w-full"
						render={<Link to="/forgot-password" />}
					>
						Request a new link
					</Button>
				</div>
			) : (
				<form className="space-y-5" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor="new-password">
							New password
						</label>
						<Input
							id="new-password"
							name="new-password"
							type="password"
							autoComplete="new-password"
							placeholder="Enter a new password"
							value={password}
							onChange={(event) => setPassword(event.currentTarget.value)}
							minLength={8}
							maxLength={128}
							required
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor="confirm-password">
							Confirm new password
						</label>
						<Input
							id="confirm-password"
							name="confirm-password"
							type="password"
							autoComplete="new-password"
							placeholder="Enter your new password again"
							value={confirmPassword}
							onChange={(event) =>
								setConfirmPassword(event.currentTarget.value)
							}
							minLength={8}
							maxLength={128}
							required
						/>
					</div>
					<Button className="h-10 w-full" type="submit" disabled={isPending}>
						{isPending ? "Updating password…" : "Reset password"}
					</Button>
				</form>
			)}
		</AuthLayout>
	);
}
