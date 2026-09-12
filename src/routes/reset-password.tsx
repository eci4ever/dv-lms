import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

interface ResetPasswordSearch {
	error?: string;
	success?: boolean;
	token?: string;
}

export const Route = createFileRoute("/reset-password")({
	head: () => ({ meta: [{ title: "Reset password | DV LMS" }] }),
	validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
		error: typeof search.error === "string" ? search.error : undefined,
		success: search.success === true || search.success === "true" || undefined,
		token: typeof search.token === "string" ? search.token : undefined,
	}),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const navigate = useNavigate({ from: "/reset-password" });
	const { error: tokenError, success, token } = Route.useSearch();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		if (!token) {
			setError("This reset link is invalid or has expired.");
			return;
		}
		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setIsPending(true);
		const result = await authClient.resetPassword({
			newPassword: password,
			token,
		});
		setIsPending(false);

		if (result.error) {
			setError(
				result.error.code === "INVALID_TOKEN"
					? "This reset link is invalid or has expired. Request a new one."
					: (result.error.message ??
							"We could not reset your password. Please try again."),
			);
			return;
		}

		await navigate({
			to: "/reset-password",
			search: { success: true },
			replace: true,
		});
	}

	const invalidToken = Boolean(tokenError) || (!token && !success);

	return (
		<AuthLayout
			title={success ? "Password reset" : "Choose a new password"}
			description={
				success
					? "Your password has been updated successfully."
					: "Use at least 8 characters for your new password."
			}
			footer={
				<Link
					className="font-medium text-foreground underline underline-offset-4"
					to="/login"
				>
					Back to sign in
				</Link>
			}
		>
			{success ? (
				<div className="space-y-5">
					<Alert>
						<CheckCircle2Icon aria-hidden="true" />
						<AlertTitle>Password updated</AlertTitle>
						<AlertDescription>
							You can now sign in with your new password. Other active sessions
							have been signed out.
						</AlertDescription>
					</Alert>
					<Button className="h-10 w-full" render={<Link to="/login" />}>
						Sign in
					</Button>
				</div>
			) : invalidToken ? (
				<div className="space-y-5">
					<Alert variant="destructive">
						<CircleAlertIcon aria-hidden="true" />
						<AlertTitle>Reset link unavailable</AlertTitle>
						<AlertDescription>
							This password reset link is invalid or has expired.
						</AlertDescription>
					</Alert>
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
					{error ? (
						<Alert variant="destructive">
							<CircleAlertIcon aria-hidden="true" />
							<AlertTitle>Password not changed</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}
					<Button className="h-10 w-full" type="submit" disabled={isPending}>
						{isPending ? "Updating password…" : "Reset password"}
					</Button>
				</form>
			)}
		</AuthLayout>
	);
}
