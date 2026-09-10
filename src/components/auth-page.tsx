import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
	const isSignup = mode === "signup";
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	return (
		<div className="min-h-svh bg-background">
			<SiteHeader />
			<main className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-6 py-12">
				<div className="w-full max-w-sm space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>
								<h1 className="text-2xl">
									{isSignup ? "Create your account" : "Welcome back"}
								</h1>
							</CardTitle>
							<CardDescription>
								{isSignup
									? "Take the first step toward something new."
									: "Log in to continue your learning journey."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								className="space-y-5"
								onSubmit={async (event) => {
									event.preventDefault();
									setError(null);
									setIsSubmitting(true);
									const form = new FormData(event.currentTarget);
									const email = String(form.get("email"));
									const password = String(form.get("password"));
									const name = String(form.get("name")).trim();
									const result = isSignup
										? await authClient.signUp.email({
												email,
												password,
												name,
											})
										: await authClient.signIn.email({ email, password });

									if (result.error) {
										setIsSubmitting(false);
										setError(
											result.error.message ??
												"We couldn’t complete that request.",
										);
										return;
									}

									if (isSignup) {
										const slug = `${
											name
												.toLowerCase()
												.replace(/[^a-z0-9]+/g, "-")
												.replace(/(^-|-$)/g, "") || "workspace"
										}-${crypto.randomUUID().slice(0, 8)}`;
										const organization = await authClient.organization.create({
											name: `${name}'s workspace`,
											slug,
										});
										if (organization.error) {
											setIsSubmitting(false);
											setError(
												organization.error.message ??
													"We couldn’t create your workspace.",
											);
											return;
										}
									}

									setIsSubmitting(false);
									await navigate({ to: "/dashboard" });
								}}
							>
								{error && (
									<Alert variant="destructive">
										<AlertTitle>Couldn’t continue</AlertTitle>
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}
								{isSignup && (
									<div className="space-y-2">
										<Label htmlFor="name">Full name</Label>
										<Input
											id="name"
											name="name"
											autoComplete="name"
											placeholder="Alex Morgan"
											required
										/>
									</div>
								)}
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										placeholder="you@example.com"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="password">Password</Label>
									<Input
										id="password"
										name="password"
										type="password"
										autoComplete={
											isSignup ? "new-password" : "current-password"
										}
										required
										minLength={isSignup ? 8 : 1}
										aria-describedby={isSignup ? "password-hint" : undefined}
									/>
									{isSignup && (
										<p
											id="password-hint"
											className="text-sm text-muted-foreground"
										>
											Use at least 8 characters.
										</p>
									)}
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={isSubmitting}
								>
									{isSubmitting
										? "Please wait…"
										: isSignup
											? "Create account"
											: "Log in"}
								</Button>
							</form>
						</CardContent>
						<CardFooter className="justify-center text-sm">
							<p className="text-muted-foreground">
								{isSignup ? "Already have an account?" : "New to DV LMS?"}{" "}
								<Link
									to={isSignup ? "/login" : "/signup"}
									className="font-medium text-foreground underline underline-offset-4"
								>
									{isSignup ? "Log in" : "Sign up"}
								</Link>
							</p>
						</CardFooter>
					</Card>
					<p className="text-center text-xs leading-relaxed text-muted-foreground">
						Your details are protected and stored securely.
					</p>
				</div>
			</main>
		</div>
	);
}
