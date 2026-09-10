import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		const session = await getDashboardSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return session;
	},
	component: Dashboard,
});

function Dashboard() {
	const { user, session, organizations } = Route.useRouteContext();
	const activeOrganization = organizations.find(
		(organization) => organization.id === session.activeOrganizationId,
	);

	return (
		<SidebarProvider>
			<AppSidebar
				user={user}
				organizations={organizations}
				activeOrganizationId={session.activeOrganizationId}
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="h-4" />
					<p className="text-sm text-muted-foreground">Dashboard</p>
				</header>
				<main className="mx-auto w-full max-w-5xl p-6 md:p-10">
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Welcome back</p>
						<h1 className="text-3xl font-semibold tracking-tight">
							{user.name}
						</h1>
						<p className="text-muted-foreground">
							You’re signed in as {user.email}.
						</p>
					</div>
					<div className="mt-8 grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Active organization</CardTitle>
								<CardDescription>
									Use the switcher in the sidebar to change your active
									organization.
								</CardDescription>
							</CardHeader>
							<CardContent className="text-sm">
								{activeOrganization?.name ?? "No organization selected"}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Your organizations</CardTitle>
								<CardDescription>
									Organizations are available to this account.
								</CardDescription>
							</CardHeader>
							<CardContent className="text-sm">
								{organizations.length
									? `${organizations.length} available`
									: "You have not joined an organization yet."}
							</CardContent>
						</Card>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
