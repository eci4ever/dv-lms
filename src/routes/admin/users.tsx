import { createFileRoute, redirect } from "@tanstack/react-router";
import { SearchIcon, UserRoundCogIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getAdminUsers } from "@/lib/admin.functions";
import { getDashboardSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/users")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.session.user.role?.split(",").includes("admin")) {
			throw redirect({ to: "/dashboard" });
		}
		const users = await getAdminUsers();
		return { ...dashboard, initialUsers: users.users };
	},
	component: UsersPage,
});

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

function UsersPage() {
	const data = Route.useRouteContext();
	const [users, setUsers] = useState(data.initialUsers);
	const [search, setSearch] = useState("");
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const visibleUsers = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return users;
		return users.filter(
			(user) =>
				user.name.toLowerCase().includes(query) ||
				user.email.toLowerCase().includes(query),
		);
	}, [search, users]);

	async function toggleRole(user: (typeof users)[number]) {
		const isAdmin = user.role?.split(",").includes("admin") ?? false;
		setPendingId(user.id);
		setError(null);
		const role = isAdmin ? "user" : "admin";
		const result = await authClient.admin.setRole({ userId: user.id, role });
		if (result.error)
			setError(result.error.message ?? "Unable to update role.");
		else
			setUsers((current) =>
				current.map((item) => (item.id === user.id ? { ...item, role } : item)),
			);
		setPendingId(null);
	}

	return (
		<SidebarProvider>
			<AppSidebar
				user={data.session.user}
				organizations={data.organizations}
				activeOrganizationId={data.activeOrganizationId}
				isOrganizationOwner={data.isOrganizationOwner}
				organizationRole={data.organizationRole}
				isImpersonating={Boolean(data.session.session.impersonatedBy)}
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Users</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
						<div className="flex items-start gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card">
								<UserRoundCogIcon className="size-5" />
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">Platform Admin</p>
								<h1 className="text-2xl font-semibold tracking-tight">
									User management
								</h1>
								<p className="text-sm text-muted-foreground">
									Review accounts and manage platform access.
								</p>
							</div>
						</div>

						<section className="overflow-hidden rounded-xl border bg-card">
							<div className="border-b p-3">
								<div className="relative max-w-sm">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										value={search}
										onChange={(event) => setSearch(event.currentTarget.value)}
										placeholder="Search by name or email"
										className="pl-8"
									/>
								</div>
							</div>
							{error ? (
								<p
									className="border-b bg-destructive/5 px-4 py-3 text-sm text-destructive"
									role="alert"
								>
									{error}
								</p>
							) : null}
							<div className="divide-y">
								{visibleUsers.map((user) => {
									const isAdmin =
										user.role?.split(",").includes("admin") ?? false;
									const isCurrentUser = user.id === data.session.user.id;
									return (
										<div
											key={user.id}
											className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
										>
											<Avatar>
												<AvatarFallback>{initials(user.name)}</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<p className="truncate font-medium">{user.name}</p>
													{isCurrentUser ? (
														<Badge variant="outline">You</Badge>
													) : null}
												</div>
												<p className="truncate text-sm text-muted-foreground">
													{user.email}
												</p>
											</div>
											<Badge variant="secondary">
												{isAdmin ? "Admin" : "User"}
											</Badge>
											<Button
												variant="outline"
												disabled={isCurrentUser || pendingId === user.id}
												onClick={() => toggleRole(user)}
											>
												{pendingId === user.id
													? "Saving…"
													: isAdmin
														? "Make user"
														: "Make admin"}
											</Button>
										</div>
									);
								})}
							</div>
						</section>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
