import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	ActivityIcon,
	BookOpenIcon,
	CircleDollarSignIcon,
	Layers3Icon,
	UsersIcon,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { formatCoursePrice } from "@/lib/course-types";
import { getAdminOverview } from "@/lib/platform.functions";

const periods = [7, 30, 90] as const;
export const Route = createFileRoute("/admin/")({
	validateSearch: (search: Record<string, unknown>) => ({
		days: periods.includes(Number(search.days) as 7 | 30 | 90)
			? (Number(search.days) as 7 | 30 | 90)
			: 30,
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
	loader: ({ deps }) => getAdminOverview({ data: { days: deps.days } }),
	component: AdminOverview,
});
function AdminOverview() {
	const dashboard = Route.useRouteContext();
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const metrics = [
		{ label: "Users", value: data.counts.users, icon: UsersIcon },
		{ label: "Courses", value: data.counts.courses, icon: BookOpenIcon },
		{ label: "Products", value: data.counts.products, icon: Layers3Icon },
		{
			label: "Active memberships",
			value: data.counts.activeMemberships,
			icon: ActivityIcon,
		},
		{
			label: "Pending creators",
			value: data.counts.pendingCreators,
			icon: UsersIcon,
		},
	];
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={false}
				activeItem="admin-overview"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Platform overview</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-6">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<h1 className="text-2xl font-semibold">Platform operations</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									Global commerce and moderation health.
								</p>
							</div>
							<select
								className="h-9 rounded-md border bg-background px-3 text-sm"
								value={search.days}
								onChange={(e) =>
									navigate({
										search: { days: Number(e.target.value) as 7 | 30 | 90 },
									})
								}
							>
								{periods.map((day) => (
									<option key={day} value={day}>
										{day} days
									</option>
								))}
							</select>
						</div>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
							{metrics.map((item) => (
								<Card key={item.label}>
									<CardHeader className="flex-row items-center justify-between pb-2">
										<CardTitle className="text-sm">{item.label}</CardTitle>
										<item.icon className="size-4 text-muted-foreground" />
									</CardHeader>
									<CardContent className="text-2xl font-semibold">
										{item.value}
									</CardContent>
								</Card>
							))}
						</div>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{[
								{ label: "Gross revenue", value: data.revenue.gross },
								{ label: "Refunds", value: data.revenue.refunds },
								{ label: "Platform fees", value: data.revenue.fees },
								{ label: "Creator net", value: data.revenue.net },
							].map((item) => (
								<Card key={item.label}>
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-sm">
											<CircleDollarSignIcon className="size-4" />
											{item.label}
										</CardTitle>
									</CardHeader>
									<CardContent className="text-2xl font-semibold">
										{formatCoursePrice(item.value)}
									</CardContent>
								</Card>
							))}
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Creator status</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-3">
								{["pending", "approved", "rejected", "suspended"].map(
									(status) => (
										<Badge key={status} variant="outline">
											{status}: {Number(data.creators[status] ?? 0)}
										</Badge>
									),
								)}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Recent platform activity</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{data.recent.length ? (
									data.recent.map((item) => (
										<div
											key={item.id}
											className="flex items-center justify-between border-b pb-3 text-sm"
										>
											<span>
												{item.action} · {item.resourceType}
											</span>
											<span className="text-muted-foreground">
												{new Date(item.createdAt).toLocaleString()}
											</span>
										</div>
									))
								) : (
									<p className="text-sm text-muted-foreground">
										No recent activity.
									</p>
								)}
							</CardContent>
						</Card>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
