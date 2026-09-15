import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { CalendarClockIcon, CreditCardIcon, RefreshCwIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	cancelMembership,
	listMemberships,
	renewMockMembership,
} from "@/lib/commerce.functions";

export const Route = createFileRoute("/memberships")({
	head: () => ({ meta: [{ title: "Memberships | DV LMS" }] }),
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		return dashboard;
	},
	loader: () => listMemberships(),
	component: MembershipsPage,
});

function money(sen: number) {
	return new Intl.NumberFormat("en-MY", {
		style: "currency",
		currency: "MYR",
	}).format(sen / 100);
}
function date(value: Date) {
	return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(
		value,
	);
}

function MembershipsPage() {
	const dashboard = Route.useRouteContext();
	const memberships = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const renewalKeys = useRef<Record<string, string>>({});
	async function cancel(id: string) {
		setBusy(id);
		try {
			await cancelMembership({ data: { id } });
			toast.success("Membership will end after the current period.");
			await router.invalidate();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to cancel membership.",
			);
		} finally {
			setBusy(null);
		}
	}
	async function renew(id: string) {
		setBusy(id);
		renewalKeys.current[id] ||= crypto.randomUUID();
		try {
			await renewMockMembership({
				data: { subscriptionId: id, renewalKey: renewalKeys.current[id] },
			});
			delete renewalKeys.current[id];
			toast.success("Mock renewal completed.");
			await router.invalidate();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to renew membership.",
			);
		} finally {
			setBusy(null);
		}
	}
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={Boolean(dashboard.session.session.impersonatedBy)}
				activeItem="memberships"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Memberships</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-5xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								Your memberships
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Manage access, renewals, and cancellation for creator
								memberships.
							</p>
						</div>
						{memberships.length ? (
							<div className="grid gap-4 md:grid-cols-2">
								{memberships.map((item) => (
									<Card key={item.id}>
										<CardHeader>
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="text-sm text-muted-foreground">
														{item.creatorName}
													</p>
													<CardTitle className="mt-1">
														{item.productName}
													</CardTitle>
												</div>
												<Badge
													className="capitalize"
													variant={
														item.status === "active" ? "default" : "secondary"
													}
												>
													{item.status}
												</Badge>
											</div>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="grid gap-2 text-sm">
												<p className="flex items-center gap-2">
													<CreditCardIcon className="size-4 text-muted-foreground" />
													{money(item.priceInSen)} / {item.billingInterval}
												</p>
												<p className="flex items-center gap-2">
													<CalendarClockIcon className="size-4 text-muted-foreground" />
													Access until {date(item.currentPeriodEnd)}
												</p>
												{item.cancelAtPeriodEnd ? (
													<p className="text-amber-700">
														Cancellation scheduled at period end.
													</p>
												) : null}
											</div>
											<div className="flex flex-wrap gap-2">
												<Button
													variant="outline"
													render={
														<Link
															to="/creators/$creatorSlug/products/$productSlug"
															params={{
																creatorSlug: item.creatorSlug,
																productSlug: item.productSlug,
															}}
														/>
													}
												>
													View product
												</Button>
												<Button
													variant="outline"
													disabled={busy === item.id}
													onClick={() => renew(item.id)}
												>
													<RefreshCwIcon /> Renew mock
												</Button>
												{item.status === "active" && !item.cancelAtPeriodEnd ? (
													<Button
														variant="destructive"
														disabled={busy === item.id}
														onClick={() => cancel(item.id)}
													>
														Cancel
													</Button>
												) : null}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						) : (
							<div className="grid min-h-64 place-items-center rounded-xl border border-dashed p-8 text-center">
								<div>
									<CalendarClockIcon className="mx-auto size-10 text-muted-foreground" />
									<h2 className="mt-4 font-medium">No memberships yet</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										Explore creator storefronts to find memberships.
									</p>
									<Button className="mt-5" render={<Link to="/courses" />}>
										Explore marketplace
									</Button>
								</div>
							</div>
						)}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
