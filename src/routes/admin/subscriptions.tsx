import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getDashboardSession } from "@/lib/auth.functions";
import { listAdminOrganizationSubscriptions } from "@/lib/organization-billing.functions";
export const Route = createFileRoute("/admin/subscriptions")({
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
	loader: () => listAdminOrganizationSubscriptions(),
	component: AdminSubscriptions,
});
function AdminSubscriptions() {
	const dashboard = Route.useRouteContext();
	const subscriptions = Route.useLoaderData();
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={false}
				activeItem="subscriptions"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">
						Organization subscriptions
					</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<Card>
						<CardHeader>
							<CardTitle>Subscriptions</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Organization</TableHead>
										<TableHead>Owner</TableHead>
										<TableHead>Plan</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Period end</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{subscriptions.map((item) => (
										<TableRow key={item.id}>
											<TableCell className="font-medium">
												{item.organizationName}
											</TableCell>
											<TableCell>
												{item.ownerName}
												<span className="block text-xs text-muted-foreground">
													{item.ownerEmail}
												</span>
											</TableCell>
											<TableCell>
												{item.planName} · {item.billingInterval}
											</TableCell>
											<TableCell>
												<Badge>{item.status}</Badge>
											</TableCell>
											<TableCell>
												{new Date(item.currentPeriodEnd).toLocaleDateString()}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
