import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { listAuditLogs } from "@/lib/platform.functions";
export const Route = createFileRoute("/admin/audit-log")({
	validateSearch: (search: Record<string, unknown>) => ({
		query: typeof search.query === "string" ? search.query : "",
		action: typeof search.action === "string" ? search.action : "",
	}),
	loaderDeps: ({ search }) => search,
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (
			!dashboard.session.user.role?.split(",").includes("admin") ||
			dashboard.session.session.impersonatedBy
		)
			throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: ({ deps }) => listAuditLogs({ data: deps }),
	component: AuditLog,
});
function AuditLog() {
	const dashboard = Route.useRouteContext();
	const logs = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={false}
				activeItem="audit-log"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Audit log</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-6xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Platform audit log</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								Read-only history of sensitive platform operations.
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<Input
								placeholder="Search actor, organization or resource"
								value={search.query}
								onChange={(e) =>
									navigate({
										search: { ...search, query: e.target.value },
										replace: true,
									})
								}
							/>
							<Input
								placeholder="Filter action"
								value={search.action}
								onChange={(e) =>
									navigate({
										search: { ...search, action: e.target.value },
										replace: true,
									})
								}
							/>
						</div>
						{logs.map((log) => (
							<Card key={log.id}>
								<CardContent className="space-y-2 p-4">
									<div className="flex flex-wrap items-center gap-2">
										<Badge>{log.action}</Badge>
										<Badge variant="outline">{log.resourceType}</Badge>
										{log.impersonated ? (
											<Badge variant="destructive">impersonated</Badge>
										) : null}
										<span className="ml-auto text-xs text-muted-foreground">
											{new Date(log.createdAt).toLocaleString()}
										</span>
									</div>
									<p className="text-sm">
										{log.actorName ?? "System"}{" "}
										{log.actorEmail ? `(${log.actorEmail})` : ""}
										{log.organizationName ? ` · ${log.organizationName}` : ""}
									</p>
									<details className="text-xs text-muted-foreground">
										<summary>Metadata</summary>
										<pre className="mt-2 overflow-auto whitespace-pre-wrap">
											{log.metadata}
										</pre>
									</details>
								</CardContent>
							</Card>
						))}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
