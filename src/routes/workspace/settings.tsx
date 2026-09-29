import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	CreditCardIcon,
	Settings2Icon,
	ShieldCheckIcon,
	Trash2Icon,
	UsersRoundIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	inviteOrganizationMember,
	updateOrganizationMemberRole,
} from "@/lib/organization-members.functions";

export const Route = createFileRoute("/workspace/settings")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();

		if (!dashboard) {
			throw redirect({ to: "/login" });
		}

		if (!dashboard.canManageOrganization) {
			throw redirect({ to: "/dashboard" });
		}

		return dashboard;
	},
	component: WorkspaceSettings,
});

const roles = [
	{
		name: "Owner",
		description: "Full access, including billing and workspace deletion.",
		badge: "Your role",
	},
	{
		name: "Admin",
		description:
			"Run courses, products, customers, reviews, and sales for the organization.",
	},
	{
		name: "Member",
		description:
			"Belong to the organization without organization management access.",
	},
];

function WorkspaceSettings() {
	const router = useRouter();
	const {
		session,
		organization,
		organizations,
		activeOrganizationId,
		isOrganizationOwner,
		organizationRole,
	} = Route.useRouteContext();
	const organizationName = organization?.name ?? "Your workspace";
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
	const [busy, setBusy] = useState(false);

	async function invite(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		try {
			await inviteOrganizationMember({
				data: { email: inviteEmail, role: inviteRole },
			});
			setInviteEmail("");
			toast.success("Invitation sent.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to send invitation.",
			);
		} finally {
			setBusy(false);
		}
	}

	async function changeRole(memberId: string, role: "admin" | "member") {
		setBusy(true);
		try {
			await updateOrganizationMemberRole({ data: { memberId, role } });
			toast.success("Member role updated.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update member.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<SidebarProvider>
			<AppSidebar
				user={session.user}
				organizations={organizations}
				activeOrganizationId={activeOrganizationId}
				isOrganizationOwner={isOrganizationOwner}
				organizationRole={organizationRole}
				isImpersonating={Boolean(session.session.impersonatedBy)}
				activeItem="settings"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Workspace settings</p>
				</header>

				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
						<div className="flex items-start gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card">
								<Settings2Icon className="size-5" />
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">
									{organizationName}
								</p>
								<h1 className="text-2xl font-semibold tracking-tight">
									Workspace settings
								</h1>
								<p className="text-sm leading-6 text-muted-foreground">
									Review access, plan usage, and workspace controls.
								</p>
							</div>
						</div>

						<Tabs defaultValue="roles" className="gap-5">
							<TabsList
								variant="line"
								className="w-full justify-start overflow-x-auto"
							>
								<TabsTrigger value="roles" className="flex-none px-3">
									<ShieldCheckIcon />
									Roles &amp; Permissions
								</TabsTrigger>
								<TabsTrigger value="billing" className="flex-none px-3">
									<CreditCardIcon />
									Billing &amp; Usage
								</TabsTrigger>
								<TabsTrigger value="danger" className="flex-none px-3">
									<Trash2Icon />
									Danger Zone
								</TabsTrigger>
							</TabsList>

							<TabsContent value="roles">
								<div className="space-y-4">
									<section className="overflow-hidden rounded-xl border bg-card">
										<div className="flex items-start gap-3 border-b p-5 sm:p-6">
											<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
												<UsersRoundIcon className="size-4" />
											</div>
											<div className="space-y-1">
												<h2 className="font-medium">Workspace access</h2>
												<p className="text-sm leading-6 text-muted-foreground">
													Roles determine what members can manage in this
													workspace.
												</p>
											</div>
										</div>
										<div className="divide-y">
											{roles.map((role) => (
												<div
													key={role.name}
													className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
												>
													<div className="space-y-1">
														<div className="flex items-center gap-2">
															<p className="font-medium">{role.name}</p>
															{role.badge ? (
																<Badge variant="secondary">{role.badge}</Badge>
															) : null}
														</div>
														<p className="text-sm leading-6 text-muted-foreground">
															{role.description}
														</p>
													</div>
												</div>
											))}
										</div>
									</section>
									<section className="rounded-xl border bg-card p-5 sm:p-6">
										<div className="mb-4">
											<h2 className="font-medium">Team members</h2>
											<p className="text-sm text-muted-foreground">
												Invite admins or members using Better Auth organization
												roles.
											</p>
										</div>
										<form
											onSubmit={invite}
											className="mb-5 grid gap-3 sm:grid-cols-[1fr_150px_auto]"
										>
											<Input
												type="email"
												placeholder="member@example.com"
												value={inviteEmail}
												onChange={(event) => setInviteEmail(event.target.value)}
												required
											/>
											<Select
												value={inviteRole}
												onValueChange={(value) => {
													if (value === "admin" || value === "member")
														setInviteRole(value);
												}}
											>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="admin">Admin</SelectItem>
													<SelectItem value="member">Member</SelectItem>
												</SelectContent>
											</Select>
											<Button disabled={busy}>Send invite</Button>
										</form>
										<div className="divide-y rounded-lg border">
											{organization?.members.map((member) => {
												const isOwner = member.role
													.split(",")
													.includes("owner");
												return (
													<div
														key={member.id}
														className="flex items-center justify-between gap-4 p-3"
													>
														<div className="min-w-0">
															<p className="truncate text-sm font-medium">
																{member.user.name}
															</p>
															<p className="truncate text-xs text-muted-foreground">
																{member.user.email}
															</p>
														</div>
														{isOwner ? (
															<Badge>Owner</Badge>
														) : (
															<Select
																value={
																	member.role === "admin" ? "admin" : "member"
																}
																disabled={busy}
																onValueChange={(value) => {
																	if (value === "admin" || value === "member")
																		void changeRole(member.id, value);
																}}
															>
																<SelectTrigger className="w-32">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="admin">Admin</SelectItem>
																	<SelectItem value="member">Member</SelectItem>
																</SelectContent>
															</Select>
														)}
													</div>
												);
											})}
										</div>
									</section>
								</div>
							</TabsContent>

							<TabsContent value="billing">
								<section className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
									<div className="space-y-1">
										<p className="font-medium">Billing and usage</p>
										<p className="text-sm text-muted-foreground">
											View the current plan, resource usage, limits, and billing
											cycle.
										</p>
									</div>
									{isOrganizationOwner ? (
										<Button render={<Link to="/workspace/billing" />}>
											<CreditCardIcon />
											Manage plan
										</Button>
									) : (
										<Badge variant="secondary">Owner managed</Badge>
									)}
								</section>
							</TabsContent>

							<TabsContent value="danger">
								<section className="rounded-xl border border-destructive/40 bg-card p-5 sm:p-6">
									<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
										<div className="max-w-2xl space-y-1">
											<h2 className="font-medium">Delete workspace</h2>
											<p className="text-sm leading-6 text-muted-foreground">
												Permanently remove {organizationName} and all associated
												data. Deletion is disabled in this preview.
											</p>
										</div>
										<AlertDialog>
											<AlertDialogTrigger
												render={<Button variant="destructive" />}
											>
												<Trash2Icon />
												Delete workspace
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Delete this workspace?
													</AlertDialogTitle>
													<AlertDialogDescription>
														This would permanently delete {organizationName}.
														This action is disabled in the mock settings page.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction variant="destructive" disabled>
														Delete workspace
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</section>
							</TabsContent>
						</Tabs>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
