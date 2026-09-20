import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import {
	ActivityIcon,
	ArrowDownRightIcon,
	ArrowUpRightIcon,
	BookOpenIcon,
	CalendarClockIcon,
	CircleDollarSignIcon,
	EyeIcon,
	PlayIcon,
	ReceiptTextIcon,
	ShoppingCartIcon,
	UsersIcon,
} from "lucide-react";
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
} from "recharts";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardSession } from "@/lib/auth.functions";
import { formatCoursePrice } from "@/lib/course-types";
import {
	getCreatorDashboard,
	getCustomerDashboard,
} from "@/lib/dashboard.functions";

const allowedDays = [7, 30, 90, 365] as const;
type Days = (typeof allowedDays)[number];
type DashboardSearch = { days?: Days };
export const Route = createFileRoute("/dashboard")({
	validateSearch: (search: Record<string, unknown>): DashboardSearch => {
		const value = Number(search.days);
		return {
			days: allowedDays.includes(value as Days)
				? (value as Days)
				: (30 as Days),
		};
	},
	loaderDeps: ({ search }) => ({ days: search.days ?? 30 }),
	beforeLoad: async () => {
		const data = await getDashboardSession();
		if (!data) throw redirect({ to: "/login" });
		return data;
	},
	loader: async ({ context, deps }) =>
		context.isOrganizationOwner
			? {
					kind: "creator" as const,
					data: await getCreatorDashboard({ data: { days: deps.days } }),
				}
			: { kind: "customer" as const, data: await getCustomerDashboard() },
	pendingComponent: DashboardSkeleton,
	component: Dashboard,
});
const chartConfig = {
	revenue: { label: "Revenue (RM)", color: "var(--chart-1)" },
	storefront: { label: "Storefront visitors", color: "var(--chart-5)" },
	products: { label: "Product viewers", color: "var(--chart-2)" },
	checkouts: { label: "Checkout starts", color: "var(--chart-3)" },
	customers: { label: "Paid customers", color: "var(--chart-4)" },
} satisfies ChartConfig;
function Change({ value }: { value: number }) {
	return (
		<span
			className={
				value >= 0
					? "inline-flex items-center text-emerald-600"
					: "inline-flex items-center text-destructive"
			}
		>
			{value >= 0 ? (
				<ArrowUpRightIcon className="size-3" />
			) : (
				<ArrowDownRightIcon className="size-3" />
			)}
			{Math.abs(value)}%
		</span>
	);
}
function Dashboard() {
	const context = Route.useRouteContext();
	const dashboard = Route.useLoaderData();
	const { days = 30 } = Route.useSearch();
	const navigate = useNavigate({ from: "/dashboard" });
	return (
		<SidebarProvider>
			<AppSidebar
				user={context.session.user}
				organizations={context.organizations}
				activeOrganizationId={context.activeOrganizationId}
				isOrganizationOwner={context.isOrganizationOwner}
				organizationRole={context.organizationRole}
				isImpersonating={Boolean(context.session.session.impersonatedBy)}
				activeItem="dashboard"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Dashboard</p>
				</header>
				{dashboard.kind === "creator" ? (
					<CreatorDashboard
						data={dashboard.data}
						days={days}
						onDays={(next) => navigate({ search: { days: next } })}
					/>
				) : (
					<CustomerDashboard
						data={dashboard.data}
						name={context.session.user.name}
					/>
				)}
			</SidebarInset>
		</SidebarProvider>
	);
}
function CreatorDashboard({
	data,
	days,
	onDays,
}: {
	data: Awaited<ReturnType<typeof getCreatorDashboard>>;
	days: Days;
	onDays: (days: Days) => void;
}) {
	const metrics = [
		{
			label: "Storefront visitors",
			value: data.current.storefrontVisitors.toLocaleString(),
			change: data.comparisons.storefrontVisitors,
			icon: UsersIcon,
		},
		{
			label: "Product viewers",
			value: data.current.productViewers.toLocaleString(),
			change: data.comparisons.productViewers,
			icon: EyeIcon,
		},
		{
			label: "Checkout starts",
			value: data.current.checkoutStarts.toLocaleString(),
			change: data.comparisons.checkoutStarts,
			icon: ShoppingCartIcon,
		},
		{
			label: "Paid customers",
			value: data.current.paidCustomers.toLocaleString(),
			change: data.comparisons.paidCustomers,
			icon: UsersIcon,
		},
		{
			label: "Gross revenue",
			value: formatCoursePrice(data.current.grossInSen),
			change: data.comparisons.grossInSen,
			icon: CircleDollarSignIcon,
		},
	];
	const hasData =
		data.current.storefrontVisitors +
			data.current.productViewers +
			data.current.checkoutStarts +
			data.current.paidCustomers >
		0;
	return (
		<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
			<div className="mx-auto w-full max-w-7xl space-y-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="text-sm text-muted-foreground">
							{data.organizationName}
						</p>
						<h1 className="mt-1 text-2xl font-semibold tracking-tight">
							Creator analytics
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Performance compared with the previous {days}-day period.
						</p>
					</div>
					<Select
						value={String(days)}
						onValueChange={(value) => onDays(Number(value) as Days)}
					>
						<SelectTrigger className="w-36">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{allowedDays.map((value) => (
								<SelectItem key={value} value={String(value)}>
									{value} days
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
					{metrics.map((metric) => (
						<Card key={metric.label}>
							<CardHeader className="flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium">
									{metric.label}
								</CardTitle>
								<metric.icon className="size-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-semibold">{metric.value}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									<Change value={metric.change} /> from previous period
								</p>
							</CardContent>
						</Card>
					))}
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Conversion</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-semibold">
								{data.current.conversionRate}%
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Creator net</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-semibold">
								{formatCoursePrice(data.current.netInSen)}
							</p>
							<p className="text-xs text-muted-foreground">
								Platform fee {formatCoursePrice(data.current.platformFeeInSen)}{" "}
								· refunds {formatCoursePrice(data.current.refundsInSen)}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Memberships / MRR</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-semibold">{data.activeMemberships}</p>
							<p className="text-xs text-muted-foreground">
								{formatCoursePrice(data.mrrInSen)} mock MRR
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Learning engagement</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-semibold">
								{data.activeLearners} active
							</p>
							<p className="text-xs text-muted-foreground">
								{data.lessonCompletions} lessons · {data.completionRate}%
								complete
							</p>
						</CardContent>
					</Card>
				</div>
				{!hasData ? (
					<div className="rounded-xl border border-dashed p-10 text-center">
						<ActivityIcon className="mx-auto size-9 text-muted-foreground" />
						<h2 className="mt-3 font-medium">Analytics will appear here</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Publish your storefront and products, then share them with your
							audience.
						</p>
						<Button
							className="mt-4"
							render={<Link to="/workspace/storefront" />}
						>
							Manage storefront
						</Button>
					</div>
				) : null}
				<Card>
					<CardHeader>
						<CardTitle>Revenue and funnel</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-80 w-full">
							<ComposedChart data={data.daily}>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									minTickGap={28}
									tickFormatter={(value) =>
										new Intl.DateTimeFormat(undefined, {
											month: "short",
											day: "numeric",
										}).format(new Date(`${value}T00:00:00Z`))
									}
								/>
								<YAxis
									yAxisId="count"
									tickLine={false}
									axisLine={false}
									width={32}
								/>
								<YAxis
									yAxisId="revenue"
									orientation="right"
									tickLine={false}
									axisLine={false}
									width={45}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									yAxisId="revenue"
									dataKey="revenue"
									fill="var(--color-revenue)"
									radius={[4, 4, 0, 0]}
								/>
								<Line
									yAxisId="count"
									type="monotone"
									dataKey="storefront"
									stroke="var(--color-storefront)"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									yAxisId="count"
									type="monotone"
									dataKey="products"
									stroke="var(--color-products)"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									yAxisId="count"
									type="monotone"
									dataKey="checkouts"
									stroke="var(--color-checkouts)"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									yAxisId="count"
									type="monotone"
									dataKey="customers"
									stroke="var(--color-customers)"
									strokeWidth={2}
									dot={false}
								/>
							</ComposedChart>
						</ChartContainer>
					</CardContent>
				</Card>
				<div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
					<Card>
						<CardHeader>
							<CardTitle>Product performance</CardTitle>
						</CardHeader>
						<CardContent>
							{data.productBreakdown.length ? (
								<div className="overflow-x-auto">
									<table className="w-full text-left text-sm">
										<thead className="border-b text-muted-foreground">
											<tr>
												<th className="py-3">Product</th>
												<th>Views</th>
												<th>Checkouts</th>
												<th>Paid</th>
												<th>Conversion</th>
												<th>Revenue</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{data.productBreakdown.map((item) => (
												<tr key={item.id}>
													<td className="py-3 font-medium">{item.name}</td>
													<td>{item.views}</td>
													<td>{item.checkouts}</td>
													<td>{item.paidOrders}</td>
													<td>{item.conversionRate}%</td>
													<td>{formatCoursePrice(item.revenueInSen)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p className="py-8 text-center text-sm text-muted-foreground">
									No products yet.
								</p>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Recent activity</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{data.activity.length ? (
								data.activity.map((item) => (
									<div
										key={item.id}
										className="flex items-start justify-between gap-3 border-b pb-3 last:border-0"
									>
										<div>
											<p className="text-sm font-medium">{item.label}</p>
											<p className="text-xs text-muted-foreground">
												{item.type} ·{" "}
												{new Intl.DateTimeFormat(undefined, {
													dateStyle: "medium",
												}).format(item.occurredAt)}
											</p>
										</div>
										<Badge variant="secondary">{item.status}</Badge>
									</div>
								))
							) : (
								<p className="py-8 text-center text-sm text-muted-foreground">
									No recent activity.
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
function DashboardSkeleton() {
	return (
		<div className="space-y-6 p-6 sm:p-8">
			<div className="space-y-2">
				<Skeleton className="h-5 w-36" />
				<Skeleton className="h-8 w-64" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				{["one", "two", "three", "four", "five"].map((item) => (
					<Skeleton key={item} className="h-32 rounded-xl" />
				))}
			</div>
			<Skeleton className="h-80 rounded-xl" />
		</div>
	);
}
function CustomerDashboard({
	name,
	data,
}: {
	name: string;
	data: Awaited<ReturnType<typeof getCustomerDashboard>>;
}) {
	const firstName = name.split(/\s+/)[0] || name;
	return (
		<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
			<div className="mx-auto w-full max-w-6xl space-y-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Welcome, {firstName}
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Continue learning and track your progress.
						</p>
					</div>
					<Button variant="outline" render={<Link to="/courses" />}>
						Explore marketplace
					</Button>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<CustomerMetric
						label="Courses"
						value={String(data.courseCount)}
						icon={BookOpenIcon}
					/>
					<CustomerMetric
						label="Lessons completed"
						value={String(data.completedLessons)}
						icon={PlayIcon}
					/>
					<CustomerMetric
						label="Overall progress"
						value={`${data.overallProgress}%`}
						icon={ActivityIcon}
					/>
					<CustomerMetric
						label="Active memberships"
						value={String(data.memberships.length)}
						icon={CalendarClockIcon}
					/>
				</div>
				<div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
					<Card>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle>Continue learning</CardTitle>
							<Button variant="ghost" size="sm" render={<Link to="/library" />}>
								View library
							</Button>
						</CardHeader>
						<CardContent className="space-y-4">
							{data.courses.length ? (
								data.courses.map((course) => {
									const total = Number(course.totalLessons);
									const complete = Number(course.completedLessons);
									const progress = total
										? Math.round((complete / total) * 100)
										: 0;
									return (
										<div
											key={course.enrollmentId}
											className="flex gap-4 border-b pb-4 last:border-0 last:pb-0"
										>
											<div className="hidden size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
												{course.thumbnailUrl ? (
													<img
														src={course.thumbnailUrl}
														alt=""
														className="size-full object-cover"
													/>
												) : (
													<div className="grid size-full place-items-center">
														<BookOpenIcon className="size-6 text-muted-foreground" />
													</div>
												)}
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-muted-foreground">
													{course.organizationName}
												</p>
												<p className="truncate font-medium">{course.title}</p>
												<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
													<div
														className="h-full bg-primary"
														style={{ width: `${progress}%` }}
													/>
												</div>
												<p className="mt-1 text-xs text-muted-foreground">
													{complete} of {total} lessons · {progress}%
												</p>
											</div>
											{course.firstLessonId ? (
												<Button
													size="sm"
													render={
														<Link
															to="/learning/$slug/$lessonId"
															params={{
																slug: course.slug,
																lessonId: course.firstLessonId,
															}}
														/>
													}
												>
													Continue
												</Button>
											) : null}
										</div>
									);
								})
							) : (
								<EmptyCustomerState />
							)}
						</CardContent>
					</Card>
					<div className="space-y-6">
						<Card>
							<CardHeader className="flex-row items-center justify-between">
								<CardTitle>Memberships</CardTitle>
								<Button
									variant="ghost"
									size="sm"
									render={<Link to="/memberships" />}
								>
									Manage
								</Button>
							</CardHeader>
							<CardContent className="space-y-3">
								{data.memberships.length ? (
									data.memberships.slice(0, 3).map((membership) => (
										<div key={membership.id} className="text-sm">
											<p className="font-medium">{membership.productName}</p>
											<p className="text-xs text-muted-foreground">
												{membership.creatorName} · until{" "}
												{formatDate(membership.currentPeriodEnd)}
											</p>
										</div>
									))
								) : (
									<p className="text-sm text-muted-foreground">
										No active memberships.
									</p>
								)}
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex-row items-center justify-between">
								<CardTitle>Recent purchases</CardTitle>
								<Button
									variant="ghost"
									size="sm"
									render={<Link to="/purchases" />}
								>
									View all
								</Button>
							</CardHeader>
							<CardContent className="space-y-3">
								{data.purchases.length ? (
									data.purchases.slice(0, 3).map((purchase) => (
										<div
											key={purchase.id}
											className="flex items-start justify-between gap-3 text-sm"
										>
											<div>
												<p className="font-medium">
													{purchase.productName ?? "Product"}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatDate(purchase.createdAt)}
												</p>
											</div>
											<Badge variant="secondary" className="capitalize">
												{purchase.status}
											</Badge>
										</div>
									))
								) : (
									<p className="text-sm text-muted-foreground">
										No purchases yet.
									</p>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</main>
	);
}
function CustomerMetric({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string;
	icon: React.ComponentType<{ className?: string }>;
}) {
	return (
		<Card>
			<CardContent className="flex items-center justify-between p-5">
				<div>
					<p className="text-sm text-muted-foreground">{label}</p>
					<p className="mt-1 text-2xl font-semibold">{value}</p>
				</div>
				<Icon className="size-5 text-muted-foreground" />
			</CardContent>
		</Card>
	);
}
function EmptyCustomerState() {
	return (
		<div className="py-8 text-center">
			<ReceiptTextIcon className="mx-auto size-9 text-muted-foreground" />
			<p className="mt-3 font-medium">Your learning journey starts here</p>
			<p className="mt-1 text-sm text-muted-foreground">
				Choose a free or paid course from the marketplace.
			</p>
			<Button className="mt-4" render={<Link to="/courses" />}>
				Explore courses
			</Button>
		</div>
	);
}
function formatDate(value: Date) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		value,
	);
}
