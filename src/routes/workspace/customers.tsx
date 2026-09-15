import { createFileRoute, redirect } from "@tanstack/react-router";
import { BookOpenIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { listOrganizationCustomers } from "@/lib/commerce.functions";
import { formatCoursePrice } from "@/lib/course-types";

export const Route = createFileRoute("/workspace/customers")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: () => listOrganizationCustomers(),
	head: () => ({ meta: [{ title: "Customers | DV LMS" }] }),
	component: CustomersPage,
});

function CustomersPage() {
	const dashboard = Route.useRouteContext();
	const customers = Route.useLoaderData();
	const [query, setQuery] = useState("");
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return q
			? customers.filter(
					(item) =>
						item.name.toLowerCase().includes(q) ||
						item.email.toLowerCase().includes(q),
				)
			: customers;
	}, [customers, query]);
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={Boolean(dashboard.session.session.impersonatedBy)}
				activeItem="customers"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Customers</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-6xl space-y-6">
						<div>
							<p className="text-sm text-muted-foreground">
								{dashboard.organization?.name}
							</p>
							<h1 className="mt-1 text-2xl font-semibold tracking-tight">
								Creator customers
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								See purchases, memberships, spend, and course access for your
								customers.
							</p>
						</div>
						<div className="relative max-w-md">
							<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-9"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search name or email"
							/>
						</div>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<UsersRoundIcon className="size-5" />
									Customers <Badge variant="secondary">{filtered.length}</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent>
								{filtered.length ? (
									<div className="overflow-x-auto">
										<table className="w-full text-left text-sm">
											<thead className="border-b text-muted-foreground">
												<tr>
													<th className="px-3 py-3 font-medium">Customer</th>
													<th className="px-3 py-3 font-medium">Products</th>
													<th className="px-3 py-3 font-medium">Memberships</th>
													<th className="px-3 py-3 font-medium">
														Course access
													</th>
													<th className="px-3 py-3 font-medium">Total spent</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{filtered.map((item) => (
													<tr key={item.id}>
														<td className="px-3 py-3">
															<p className="font-medium">{item.name}</p>
															<p className="text-xs text-muted-foreground">
																{item.email}
															</p>
														</td>
														<td className="px-3 py-3">
															{Number(item.productsPurchased)}
														</td>
														<td className="px-3 py-3">
															{Number(item.activeMemberships)}
														</td>
														<td className="px-3 py-3">
															<span className="inline-flex items-center gap-1">
																<BookOpenIcon className="size-4 text-muted-foreground" />
																{Number(item.courseAccess)}
															</span>
														</td>
														<td className="px-3 py-3 font-medium">
															{formatCoursePrice(Number(item.totalSpentInSen))}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className="py-12 text-center text-sm text-muted-foreground">
										No matching customers.
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
