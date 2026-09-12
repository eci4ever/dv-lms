import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
	const isSignup = mode === "signup";
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [createdUser, setCreatedUser] = useState<{
		id: string;
		name: string;
	} | null>(null);

	async function createWorkspace(user: { id: string; name: string }) {
		const firstName = user.name.trim().split(/\s+/)[0] || "My";
		const slugPrefix =
			firstName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "") || "my";
		const result = await authClient.organization.create({
			name: `${firstName}'s workspace`,
			slug: `${slugPrefix}-workspace-${user.id.toLowerCase()}`,
			keepCurrentActiveOrganization: false,
		});

		if (result.error) {
			setCreatedUser(user);
			setError(
				result.error.message ??
					"Your account was created, but we could not set up your workspace.",
			);
			return;
		}

		await navigate({ to: "/dashboard" });
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsPending(true);

		if (isSignup) {
			const result = await authClient.signUp.email({ name, email, password });
			setIsPending(false);

			if (result.error || !result.data?.user) {
				setError(
					result.error?.message ??
						"Unable to create your account. Please try again.",
				);
				return;
			}

			await createWorkspace(result.data.user);
			return;
		}

		const result = await authClient.signIn.email({ email, password });
		setIsPending(false);

		if (result.error) {
			setError(result.error.message ?? "Unable to sign in. Please try again.");
			return;
		}

		await navigate({ to: "/dashboard" });
	}

	async function retryWorkspace() {
		if (!createdUser) return;
		setError(null);
		setIsPending(true);
		await createWorkspace(createdUser);
		setIsPending(false);
	}

	return (
		<AuthLayout
			title={isSignup ? "Create your account" : "Welcome back"}
			description={
				isSignup
					? "Start learning in one simple workspace."
					: "Sign in to access your DV LMS workspace."
			}
			footer={
				<>
					{isSignup ? "Already have an account?" : "New to DV LMS?"}{" "}
					<Link
						className="font-medium text-foreground underline underline-offset-4"
						to={isSignup ? "/login" : "/signup"}
					>
						{isSignup ? "Sign in" : "Create an account"}
					</Link>
				</>
			}
		>
			<form className="space-y-5" onSubmit={handleSubmit}>
				{isSignup ? (
					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor="full-name">
							Full name
						</label>
						<Input
							id="full-name"
							name="name"
							autoComplete="name"
							placeholder="Your full name"
							value={name}
							onChange={(event) => setName(event.currentTarget.value)}
							required
						/>
					</div>
				) : null}
				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="email">
						Email address
					</label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						placeholder="you@example.com"
						value={email}
						onChange={(event) => setEmail(event.currentTarget.value)}
						required
					/>
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-4">
						<label className="text-sm font-medium" htmlFor="password">
							Password
						</label>
						{isSignup ? null : (
							<Link
								className="text-sm font-medium underline underline-offset-4"
								to="/forgot-password"
							>
								Forgot password?
							</Link>
						)}
					</div>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete={isSignup ? "new-password" : "current-password"}
						placeholder={isSignup ? "Create a password" : "Enter your password"}
						value={password}
						onChange={(event) => setPassword(event.currentTarget.value)}
						minLength={isSignup ? 8 : undefined}
						required
					/>
				</div>
				{error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : null}
				<Button
					className="mt-1 h-10 w-full"
					type={createdUser ? "button" : "submit"}
					disabled={isPending}
					onClick={createdUser ? retryWorkspace : undefined}
				>
					{isPending
						? isSignup
							? "Creating account…"
							: "Signing in…"
						: createdUser
							? "Set up workspace"
							: isSignup
								? "Create account"
								: "Sign in"}
				</Button>
			</form>
		</AuthLayout>
	);
}
