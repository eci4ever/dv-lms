import {
	ArrowLeft,
	ArrowRight,
	Check,
	GitFork,
	LockKeyhole,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthPageProps = {
	mode: "login" | "signup";
};

export function AuthPage({ mode }: AuthPageProps) {
	const [submitted, setSubmitted] = useState(false);
	const isSignup = mode === "signup";

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitted(true);
	}

	return (
		<main className="dark min-h-screen bg-[#080d1a] text-white">
			<div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
				<section className="relative hidden overflow-hidden border-r border-slate-800 bg-[#0b1327] p-10 lg:flex lg:flex-col">
					<div className="absolute -left-40 top-20 size-120 rounded-full bg-blue-600/20 blur-3xl" />
					<div className="absolute -bottom-56 right-0 size-120 rounded-full bg-violet-600/20 blur-3xl" />
					<a
						className="relative flex items-center gap-2.5 text-lg font-semibold tracking-tight"
						href="/"
					>
						<span className="grid size-8 place-items-center rounded-lg bg-blue-500 font-mono text-xs shadow-lg shadow-blue-500/30">
							&lt;/&gt;
						</span>
						DevLMS
					</a>
					<div className="relative my-auto max-w-md">
						<p className="font-mono text-xs tracking-widest text-blue-400">
							LEARN BY BUILDING
						</p>
						<h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] text-balance">
							The next project in your portfolio starts here.
						</h1>
						<p className="mt-6 text-base leading-7 text-slate-400">
							Hands-on courses for every stage of your web-development journey.
						</p>
						<div className="mt-10 space-y-4">
							{[
								"Build production-style apps",
								"Follow clear, focused learning paths",
								"Learn the stack real teams use",
							].map((item) => (
								<div
									className="flex items-center gap-3 text-sm text-slate-300"
									key={item}
								>
									<span className="grid size-5 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
										<Check className="size-3" />
									</span>
									{item}
								</div>
							))}
						</div>
					</div>
					<p className="relative font-mono text-xs text-slate-600">
						© 2026 DevLMS
					</p>
				</section>

				<section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
					<div className="w-full max-w-sm">
						<div className="mb-12 flex items-center justify-between lg:hidden">
							<a className="flex items-center gap-2 font-semibold" href="/">
								<span className="grid size-7 place-items-center rounded-md bg-blue-500 font-mono text-[10px]">
									&lt;/&gt;
								</span>
								DevLMS
							</a>
							<a className="text-sm text-slate-400" href="/">
								Back home
							</a>
						</div>
						<a
							className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
							href="/"
						>
							<ArrowLeft className="size-4" />
							Back to home
						</a>
						<div>
							<span className="grid size-11 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
								<LockKeyhole className="size-5" />
							</span>
							<h2 className="mt-6 text-3xl font-semibold tracking-tight">
								{isSignup ? "Start building today." : "Welcome back."}
							</h2>
							<p className="mt-2 text-sm leading-6 text-slate-400">
								{isSignup
									? "Create your free account and choose your next project."
									: "Sign in to continue learning and pick up where you left off."}
							</p>
						</div>

						<Button
							className="mt-7 h-11 w-full border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
							variant="outline"
							type="button"
						>
							<GitFork className="size-4" />
							Continue with GitHub
						</Button>
						<div className="my-6 flex items-center gap-3 text-xs text-slate-500">
							<span className="h-px flex-1 bg-slate-800" />
							OR CONTINUE WITH EMAIL
							<span className="h-px flex-1 bg-slate-800" />
						</div>

						<form className="space-y-5" onSubmit={handleSubmit}>
							{isSignup && (
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										className="h-11 border-slate-700 bg-slate-900/70 placeholder:text-slate-600 focus-visible:border-blue-400"
										id="name"
										placeholder="Ada Lovelace"
										required
									/>
								</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="email">Email address</Label>
								<Input
									className="h-11 border-slate-700 bg-slate-900/70 placeholder:text-slate-600 focus-visible:border-blue-400"
									id="email"
									type="email"
									placeholder="you@example.com"
									required
								/>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="password">Password</Label>
									{!isSignup && (
										<a
											className="text-xs font-medium text-blue-400 hover:text-blue-300"
											href="#forgot-password"
										>
											Forgot password?
										</a>
									)}
								</div>
								<Input
									className="h-11 border-slate-700 bg-slate-900/70 placeholder:text-slate-600 focus-visible:border-blue-400"
									id="password"
									type="password"
									placeholder="At least 8 characters"
									minLength={8}
									required
								/>
							</div>
							{isSignup ? (
								<div className="flex items-start gap-3 text-xs leading-5 text-slate-400">
									<Checkbox
										className="mt-0.5 border-slate-600 data-[state=checked]:bg-blue-500"
										id="terms"
										required
									/>
									<Label
										className="cursor-pointer text-xs leading-5 text-slate-400"
										htmlFor="terms"
									>
										I agree to the Terms of Service and Privacy Policy.
									</Label>
								</div>
							) : (
								<div className="flex items-center gap-3 text-sm text-slate-400">
									<Checkbox
										className="border-slate-600 data-[state=checked]:bg-blue-500"
										id="remember-me"
									/>
									<Label
										className="cursor-pointer text-sm text-slate-400"
										htmlFor="remember-me"
									>
										Remember me for 30 days
									</Label>
								</div>
							)}
							<Button
								className="h-11 w-full bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400"
								type="submit"
							>
								{isSignup ? "Create free account" : "Sign in"}
								<ArrowRight className="size-4" />
							</Button>
						</form>

						{submitted && (
							<output className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-200">
								Mock {isSignup ? "account created" : "sign-in successful"}. No
								data was sent.
							</output>
						)}
						<p className="mt-7 text-center text-sm text-slate-400">
							{isSignup ? "Already have an account?" : "New to DevLMS?"}{" "}
							<a
								className="font-medium text-blue-400 hover:text-blue-300"
								href={isSignup ? "/login" : "/signup"}
							>
								{isSignup ? "Sign in" : "Create a free account"}
							</a>
						</p>
					</div>
				</section>
			</div>
		</main>
	);
}
