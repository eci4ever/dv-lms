import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	BadgeDollarSignIcon,
	CalendarClockIcon,
	CircleDollarSignIcon,
	PercentIcon,
	RotateCcwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { listOrganizationSales } from "@/lib/commerce.functions";
import { formatCoursePrice } from "@/lib/course-types";

export const Route = createFileRoute("/workspace/sales")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: () => listOrganizationSales(),
	head: () => ({ meta: [{ title: "Sales | DV LMS" }] }),
	component: OrganizationSales,
});

function OrganizationSales() {
	const dashboard = Route.useRouteContext();
	const { orders, totals } = Route.useLoaderData();
	const [product, setProduct] = useState("all");
	const [offer, setOffer] = useState("all");
	const [billing, setBilling] = useState("all");
	const [status, setStatus] = useState("all");
	const products = useMemo(
		() =>
			[
				...new Set(orders.map((order) => order.productName).filter(Boolean)),
			] as string[],
		[orders],
	);
	const offers = useMemo(
		() =>
			[
				...new Set(orders.map((order) => order.offerName).filter(Boolean)),
			] as string[],
		[orders],
	);
	const filteredOrders = orders.filter(
		(order) =>
			(product === "all" || order.productName === product) &&
			(offer === "all" || order.offerName === offer) &&
			(billing === "all" || order.billingType === billing) &&
			(status === "all" || order.status === status),
	);
	const metrics = [
		{
			label: "Refunds",
			value: totals.refundsInSen,
			icon: RotateCcwIcon,
		},
		{
			label: "Gross sales",
			value: totals.grossInSen,
			icon: CircleDollarSignIcon,
		},
		{
			label: "Platform fee",
			value: totals.platformFeeInSen,
			icon: PercentIcon,
		},
		{
			label: "Net revenue",
			value: totals.sellerNetInSen,
			icon: BadgeDollarSignIcon,
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
				isImpersonating={Boolean(dashboard.session.session.impersonatedBy)}
				activeItem="sales"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Sales</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-6xl space-y-6">
						<div>
							<p className="text-sm text-muted-foreground">
								{dashboard.organization?.name}
							</p>
							<h1 className="mt-1 text-2xl font-semibold tracking-tight">
								Course sales
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Revenue reflects paid orders after the 10% platform fee.
							</p>
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
										<p className="text-2xl font-semibold">
											{formatCoursePrice(metric.value)}
										</p>
									</CardContent>
								</Card>
							))}
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<Card>
								<CardHeader className="flex-row items-center justify-between pb-2">
									<CardTitle className="text-sm font-medium">
										Active memberships
									</CardTitle>
									<CalendarClockIcon className="size-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<p className="text-2xl font-semibold">
										{totals.activeMemberships}
									</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className="flex-row items-center justify-between pb-2">
									<CardTitle className="text-sm font-medium">
										Mock MRR
									</CardTitle>
									<CircleDollarSignIcon className="size-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<p className="text-2xl font-semibold">
										{formatCoursePrice(totals.mrrInSen)}
									</p>
								</CardContent>
							</Card>
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Orders</CardTitle>
								<div className="grid gap-2 pt-2 sm:grid-cols-2 xl:grid-cols-4">
									<select
										className="h-9 rounded-md border bg-background px-3 text-sm"
										value={product}
										onChange={(event) => setProduct(event.target.value)}
									>
										<option value="all">All products</option>
										{products.map((name) => (
											<option key={name} value={name}>
												{name}
											</option>
										))}
									</select>
									<select
										className="h-9 rounded-md border bg-background px-3 text-sm"
										value={offer}
										onChange={(event) => setOffer(event.target.value)}
									>
										<option value="all">All offers</option>
										{offers.map((name) => (
											<option key={name} value={name}>
												{name}
											</option>
										))}
									</select>
									<select
										className="h-9 rounded-md border bg-background px-3 text-sm"
										value={billing}
										onChange={(event) => setBilling(event.target.value)}
									>
										<option value="all">All billing</option>
										<option value="one_time">One-time</option>
										<option value="recurring">Recurring</option>
									</select>
									<select
										className="h-9 rounded-md border bg-background px-3 text-sm"
										value={status}
										onChange={(event) => setStatus(event.target.value)}
									>
										<option value="all">All statuses</option>
										<option value="paid">Paid</option>
										<option value="refunded">Refunded</option>
										<option value="pending">Pending</option>
										<option value="expired">Expired</option>
									</select>
								</div>
							</CardHeader>
							<CardContent>
								{filteredOrders.length ? (
									<div className="overflow-x-auto">
										<table className="w-full text-left text-sm">
											<thead className="border-b text-muted-foreground">
												<tr>
													<th className="px-3 py-3 font-medium">Course</th>
													<th className="px-3 py-3 font-medium">Buyer</th>
													<th className="px-3 py-3 font-medium">Status</th>
													<th className="px-3 py-3 font-medium">Gross</th>
													<th className="px-3 py-3 font-medium">Fee</th>
													<th className="px-3 py-3 font-medium">Net</th>
													<th className="px-3 py-3 font-medium">Date</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{filteredOrders.map((order) => (
													<tr key={order.id}>
														<td className="px-3 py-3 font-medium">
															{order.productName ?? order.courseTitle}
															<p className="text-xs font-normal text-muted-foreground">
																{order.offerName ?? "Legacy offer"}
															</p>
														</td>
														<td className="px-3 py-3">
															<p>{order.buyerName}</p>
															<p className="text-xs text-muted-foreground">
																{order.buyerEmail}
															</p>
														</td>
														<td className="px-3 py-3">
															<div className="flex flex-wrap gap-1">
																<OrderStatusBadge status={order.status} />
																{order.refundStatus ? (
																	<OrderStatusBadge
																		status={order.refundStatus}
																	/>
																) : null}
															</div>
														</td>
														<td className="px-3 py-3">
															{formatCoursePrice(order.grossInSen)}
														</td>
														<td className="px-3 py-3">
															{formatCoursePrice(order.platformFeeInSen)}
														</td>
														<td className="px-3 py-3 font-medium">
															{formatCoursePrice(order.sellerNetInSen)}
														</td>
														<td className="px-3 py-3 text-muted-foreground">
															{new Intl.DateTimeFormat("en-MY", {
																dateStyle: "medium",
															}).format(order.createdAt)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className="py-12 text-center text-sm text-muted-foreground">
										No course orders for this organization yet.
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
