import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";
import {
	deletePlatformOrganization,
	getPlatformAdminOverview,
	managePlatformUser,
} from "@/lib/platform-admin.functions";

export const Route = createFileRoute("/platform-admin")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) throw redirect({ to: "/login" });
		if (!session.user.role?.split(",").includes("admin")) {
			throw redirect({ to: "/dashboard" });
		}
		return { user: session.user };
	},
	loader: () => getPlatformAdminOverview(),
	component: PlatformAdminPage,
});

function PlatformAdminPage() {
	const { user } = Route.useRouteContext();
	const { users, organizations } = Route.useLoaderData();
	const router = useRouter();
	const [pendingId, setPendingId] = useState<string | null>(null);

	async function runUserAction(
		data:
			| { action: "set-role"; userId: string; role: "admin" | "user" }
			| { action: "ban" | "unban"; userId: string },
	) {
		setPendingId(data.userId);
		try {
			await managePlatformUser({ data });
			await router.invalidate();
		} finally {
			setPendingId(null);
		}
	}

	async function removeOrganization(id: string, name: string) {
		if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
		setPendingId(id);
		try {
			await deletePlatformOrganization({ data: id });
			await router.invalidate();
		} finally {
			setPendingId(null);
		}
	}

	async function handleSignOut() {
		await authClient.signOut();
		window.location.assign("/login");
	}

	return (
		<div className="dark min-h-screen bg-background text-foreground">
			<TooltipProvider>
				<SidebarProvider>
					<AppSidebar onSignOut={handleSignOut} user={user} />
					<SidebarInset className="bg-[#080d1a]">
						<header className="flex h-16 shrink-0 items-center border-b border-slate-800/80">
							<div className="flex items-center gap-2 px-4">
								<SidebarTrigger className="-ml-1" />
								<Separator
									className="mr-2 data-[orientation=vertical]:h-4"
									orientation="vertical"
								/>
								<Breadcrumb>
									<BreadcrumbList>
										<BreadcrumbItem className="hidden md:block">
											<BreadcrumbLink href="/dashboard">DevLMS</BreadcrumbLink>
										</BreadcrumbItem>
										<BreadcrumbSeparator className="hidden md:block" />
										<BreadcrumbItem>
											<BreadcrumbPage>Platform admin</BreadcrumbPage>
										</BreadcrumbItem>
									</BreadcrumbList>
								</Breadcrumb>
							</div>
						</header>

						<div className="space-y-8 p-4 md:p-6 lg:p-8">
							<section className="rounded-xl border border-blue-400/15 bg-gradient-to-br from-blue-500/15 via-slate-900 to-violet-500/10 p-6">
								<div className="flex items-center gap-3">
									<span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
										<ShieldCheck className="size-5" />
									</span>
									<div>
										<p className="font-mono text-xs tracking-widest text-blue-400">
											PLATFORM CONTROL
										</p>
										<h1 className="text-2xl font-semibold">
											Platform administration
										</h1>
									</div>
								</div>
								<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
									Manage global users and organizations. Organization membership
									roles remain separate from platform roles.
								</p>
							</section>

							<div className="grid gap-4 sm:grid-cols-2">
								<Metric
									icon={Users}
									label="Platform users"
									value={users.total}
								/>
								<Metric
									icon={Building2}
									label="Organizations"
									value={organizations.length}
								/>
							</div>

							<section
								className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
								id="users"
							>
								<div className="border-b border-slate-800 p-5">
									<h2 className="font-semibold">Users</h2>
									<p className="mt-1 text-sm text-slate-500">
										Global access, roles and account status.
									</p>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full min-w-3xl text-left text-sm">
										<thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500">
											<tr>
												<th className="px-5 py-3">User</th>
												<th className="px-5 py-3">Role</th>
												<th className="px-5 py-3">Status</th>
												<th className="px-5 py-3 text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-800">
											{users.users.map((account) => {
												const isSelf = account.id === user.id;
												const isAdmin =
													account.role?.split(",").includes("admin") ?? false;
												return (
													<tr key={account.id}>
														<td className="px-5 py-4">
															<p className="font-medium">{account.name}</p>
															<p className="text-xs text-slate-500">
																{account.email}
															</p>
														</td>
														<td className="px-5 py-4">
															<Badge className="border-blue-400/20 bg-blue-500/15 uppercase text-blue-300">
																{account.role ?? "user"}
															</Badge>
														</td>
														<td className="px-5 py-4">
															<Badge
																variant={
																	account.banned ? "destructive" : "outline"
																}
															>
																{account.banned ? "Banned" : "Active"}
															</Badge>
														</td>
														<td className="px-5 py-4">
															<div className="flex justify-end gap-2">
																<Button
																	disabled={isSelf || pendingId === account.id}
																	onClick={() =>
																		runUserAction({
																			action: "set-role",
																			userId: account.id,
																			role: isAdmin ? "user" : "admin",
																		})
																	}
																	size="sm"
																	variant="outline"
																>
																	{isAdmin ? "Make user" : "Make admin"}
																</Button>
																<Button
																	disabled={isSelf || pendingId === account.id}
																	onClick={() =>
																		runUserAction({
																			action: account.banned ? "unban" : "ban",
																			userId: account.id,
																		})
																	}
																	size="sm"
																	variant={
																		account.banned ? "outline" : "destructive"
																	}
																>
																	{account.banned ? "Unban" : "Ban"}
																</Button>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</section>

							<section
								className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
								id="organizations"
							>
								<div className="border-b border-slate-800 p-5">
									<h2 className="font-semibold">Organizations</h2>
									<p className="mt-1 text-sm text-slate-500">
										All tenants registered on the platform.
									</p>
								</div>
								<div className="divide-y divide-slate-800">
									{organizations.length === 0 ? (
										<p className="p-5 text-sm text-slate-500">
											No organizations yet.
										</p>
									) : (
										organizations.map((org) => (
											<div
												className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
												key={org.id}
											>
												<span className="grid size-10 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
													<Building2 className="size-5" />
												</span>
												<div className="min-w-0 flex-1">
													<p className="font-medium">{org.name}</p>
													<p className="truncate text-xs text-slate-500">
														/{org.slug} · {org.memberCount} members
													</p>
												</div>
												<Button
													disabled={pendingId === org.id}
													onClick={() => removeOrganization(org.id, org.name)}
													size="sm"
													variant="destructive"
												>
													Delete
												</Button>
											</div>
										))
									)}
								</div>
							</section>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</TooltipProvider>
		</div>
	);
}

function Metric({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Users;
	label: string;
	value: number;
}) {
	return (
		<article className="rounded-xl border border-slate-800 bg-slate-900/45 p-5">
			<span className="grid size-9 place-items-center rounded-lg bg-blue-500/10 text-blue-300">
				<Icon className="size-4" />
			</span>
			<p className="mt-4 text-sm text-slate-500">{label}</p>
			<p className="mt-1 text-2xl font-semibold">{value}</p>
		</article>
	);
}
