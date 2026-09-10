import { Link } from "@tanstack/react-router";
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

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
	const isSignup = mode === "signup";
	const [submitted, setSubmitted] = useState(false);
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
							{submitted ? (
								<div className="space-y-6">
									<Alert role="status">
										<AlertTitle>
											{isSignup ? "You’re all set!" : "You’re logged in!"}
										</AlertTitle>
										<AlertDescription>
											{isSignup
												? "Your demo signup is complete. No account has been created."
												: "Your demo login is complete. No account has been accessed."}
										</AlertDescription>
									</Alert>
									<Button
										className="w-full"
										nativeButton={false}
										render={<Link to="/" />}
									>
										Back to home
									</Button>
									<Button
										variant="outline"
										className="w-full"
										onClick={() => setSubmitted(false)}
									>
										Try again
									</Button>
								</div>
							) : (
								<form
									className="space-y-5"
									onSubmit={(event) => {
										event.preventDefault();
										event.currentTarget.reset();
										setSubmitted(true);
									}}
								>
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
									<Button type="submit" className="w-full">
										{isSignup ? "Create account" : "Log in"}
									</Button>
								</form>
							)}
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
						Demo only. Use any sample details.
						<br />
						Your details are not saved or sent.
					</p>
				</div>
			</main>
		</div>
	);
}
