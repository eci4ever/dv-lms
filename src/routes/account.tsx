import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { KeyRound, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { sessionQueryKey, sessionQueryOptions } from "@/lib/session.query";

export const Route = createFileRoute("/account")({
	beforeLoad: async ({ context }) => {
		const session =
			await context.queryClient.ensureQueryData(sessionQueryOptions);
		if (!session) throw redirect({ to: "/login" });
		return { user: session.user };
	},
	component: AccountPage,
});

function AccountPage() {
	const { user } = Route.useRouteContext();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [name, setName] = useState(user.name);
	const [image, setImage] = useState(user.image ?? "");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	async function handleSignOut() {
		await authClient.signOut();
		queryClient.removeQueries({ queryKey: sessionQueryKey });
		window.location.assign("/login");
	}

	async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSavingProfile(true);
		try {
			const { error } = await authClient.updateUser({
				name: name.trim(),
				image: image.trim() || null,
			});
			if (error) throw new Error(error.message);
			await queryClient.invalidateQueries({
				queryKey: sessionQueryKey,
				refetchType: "all",
			});
			await router.invalidate({ sync: true });
			toast.success("Profile updated");
		} catch (error) {
			toast.error("Unable to update profile", {
				description:
					error instanceof Error ? error.message : "Please try again shortly.",
			});
		} finally {
			setIsSavingProfile(false);
		}
	}

	async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsChangingPassword(true);
		try {
			const { error } = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: true,
			});
			if (error) throw new Error(error.message);
			setCurrentPassword("");
			setNewPassword("");
			toast.success("Password changed", {
				description: "Other active sessions have been signed out.",
			});
		} catch (error) {
			toast.error("Unable to change password", {
				description:
					error instanceof Error ? error.message : "Please try again shortly.",
			});
		} finally {
			setIsChangingPassword(false);
		}
	}

	return (
		<div className="dark min-h-screen bg-background text-foreground">
			<TooltipProvider>
				<SidebarProvider>
					<AppSidebar onSignOut={handleSignOut} user={user} />
					<SidebarInset className="bg-[#080d1a]">
						<header className="flex h-16 shrink-0 items-center border-b border-slate-800/80">
							<div className="flex items-center gap-2 px-4">
								<SidebarTrigger />
								<Separator
									className="data-[orientation=vertical]:h-4"
									orientation="vertical"
								/>
								<p className="text-sm font-medium">Account</p>
							</div>
						</header>
						<main className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6 lg:p-8">
							<section>
								<p className="font-mono text-xs tracking-widest text-cyan-400">
									YOUR ACCOUNT
								</p>
								<h1 className="mt-2 text-3xl font-semibold tracking-tight">
									Profile and security
								</h1>
								<p className="mt-2 text-sm text-slate-400">
									Manage your public profile and account password.
								</p>
							</section>
							<form
								className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
								onSubmit={handleProfileSubmit}
							>
								<div className="flex items-center gap-3">
									<span className="grid size-9 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
										<UserRound className="size-4" />
									</span>
									<div>
										<h2 className="font-semibold">Profile</h2>
										<p className="text-sm text-slate-500">
											Shown across your learning space.
										</p>
									</div>
								</div>
								<div className="mt-6 grid gap-5">
									<div className="grid gap-2">
										<Label htmlFor="name">Display name</Label>
										<Input
											id="name"
											value={name}
											onChange={(event) => setName(event.target.value)}
											required
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="email">Email</Label>
										<Input id="email" value={user.email} disabled />
									</div>
									<div className="grid gap-2">
										<Label htmlFor="image">Avatar image URL</Label>
										<Input
											id="image"
											type="url"
											value={image}
											onChange={(event) => setImage(event.target.value)}
											placeholder="https://..."
										/>
									</div>
								</div>
								<Button
									className="mt-6 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
									disabled={isSavingProfile}
									type="submit"
								>
									{isSavingProfile ? "Saving..." : "Save profile"}
								</Button>
							</form>
							<form
								className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
								onSubmit={handlePasswordSubmit}
							>
								<div className="flex items-center gap-3">
									<span className="grid size-9 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
										<KeyRound className="size-4" />
									</span>
									<div>
										<h2 className="font-semibold">Password</h2>
										<p className="text-sm text-slate-500">
											Changing it signs out your other devices.
										</p>
									</div>
								</div>
								<div className="mt-6 grid gap-5">
									<div className="grid gap-2">
										<Label htmlFor="current-password">Current password</Label>
										<Input
											id="current-password"
											type="password"
											value={currentPassword}
											onChange={(event) =>
												setCurrentPassword(event.target.value)
											}
											required
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="new-password">New password</Label>
										<Input
											id="new-password"
											type="password"
											minLength={8}
											value={newPassword}
											onChange={(event) => setNewPassword(event.target.value)}
											required
										/>
									</div>
								</div>
								<Button
									className="mt-6"
									disabled={isChangingPassword}
									type="submit"
								>
									{isChangingPassword ? "Changing..." : "Change password"}
								</Button>
							</form>
						</main>
					</SidebarInset>
				</SidebarProvider>
			</TooltipProvider>
		</div>
	);
}
