import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { CheckIcon, CreditCardIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	cancelOrganizationSubscription,
	getOrganizationBilling,
	listPlans,
	selectOrganizationPlan,
} from "@/lib/organization-billing.functions";

export const Route = createFileRoute("/workspace/billing")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: async () => {
		const [billing, plans] = await Promise.all([
			getOrganizationBilling(),
			listPlans(),
		]);
		return { billing, plans };
	},
	component: OrganizationBilling,
});
function money(value: number) {
	return value === 0
		? "Free"
		: new Intl.NumberFormat("en-MY", {
				style: "currency",
				currency: "MYR",
				maximumFractionDigits: 0,
			}).format(value / 100);
}
function OrganizationBilling() {
	const dashboard = Route.useRouteContext();
	const { billing, plans } = Route.useLoaderData();
	const router = useRouter();
	const [interval, setInterval] = useState<"month" | "year">("month");
	const [busy, setBusy] = useState<string | null>(null);
	async function choose(planId: string) {
		setBusy(planId);
		try {
			await selectOrganizationPlan({ data: { planId, interval } });
			toast.success("Organization plan updated.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update plan.",
			);
		} finally {
			setBusy(null);
		}
	}
	async function cancel() {
		setBusy("cancel");
		try {
			await cancelOrganizationSubscription();
			toast.success("Cancellation scheduled for period end.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to cancel subscription.",
			);
		} finally {
			setBusy(null);
		}
	}
	const current = billing.subscription;
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={Boolean(dashboard.session.session.impersonatedBy)}
				activeItem="billing"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Billing & plan</span>
				</header>
				<main className="space-y-8 p-4 sm:p-6 lg:p-8">
					<div>
						<h1 className="text-2xl font-semibold">Organization plan</h1>
						<p className="mt-1 text-muted-foreground">
							Manage the SaaS plan for your creator business.
						</p>
					</div>
					{current ? (
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>{current.plan.name}</CardTitle>
										<CardDescription>
											{current.subscription.status} · renews/ends{" "}
											{new Date(
												current.subscription.currentPeriodEnd,
											).toLocaleDateString()}
										</CardDescription>
									</div>
									<Badge>{current.subscription.status}</Badge>
								</div>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-3">
								<span className="text-sm text-muted-foreground">
									{billing.usage.publishedCourses}/
									{current.plan.maxPublishedCourses} courses ·{" "}
									{billing.usage.products}/{current.plan.maxProducts} products ·{" "}
									{billing.usage.teamMembers}/{current.plan.maxTeamMembers} team
									members
								</span>
								{current.subscription.priceInSenSnapshot > 0 ? (
									!current.subscription.cancelAtPeriodEnd ? (
										<Button
											className="ml-auto"
											variant="outline"
											disabled={busy === "cancel"}
											onClick={cancel}
										>
											Cancel at period end
										</Button>
									) : (
										<Badge variant="secondary">Cancellation scheduled</Badge>
									)
								) : null}
							</CardContent>
						</Card>
					) : null}
					<div className="flex w-fit rounded-lg border p-1">
						<Button
							size="sm"
							variant={interval === "month" ? "secondary" : "ghost"}
							onClick={() => setInterval("month")}
						>
							Monthly
						</Button>
						<Button
							size="sm"
							variant={interval === "year" ? "secondary" : "ghost"}
							onClick={() => setInterval("year")}
						>
							Yearly
						</Button>
					</div>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						{plans.map((plan) => {
							const price =
								interval === "year"
									? plan.yearlyPriceInSen
									: plan.monthlyPriceInSen;
							const needsPaymentSetup = price > 0 && plan.trialDays === 0;
							return (
								<Card
									key={plan.id}
									className={
										current?.plan.id === plan.id ? "border-primary" : undefined
									}
								>
									<CardHeader>
										<CardTitle>{plan.name}</CardTitle>
										<CardDescription>{plan.description}</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<p className="text-2xl font-semibold">
											{money(price)}
											<span className="text-sm font-normal text-muted-foreground">
												/{interval === "year" ? "year" : "month"}
											</span>
										</p>
										<div className="space-y-2 text-sm text-muted-foreground">
											<p className="flex gap-2">
												<CheckIcon className="size-4 text-primary" />
												{plan.maxPublishedCourses} published courses
											</p>
											<p className="flex gap-2">
												<CheckIcon className="size-4 text-primary" />
												{plan.maxProducts} products
											</p>
											<p className="flex gap-2">
												<CheckIcon className="size-4 text-primary" />
												{plan.maxTeamMembers} team members
											</p>
											<p className="flex gap-2">
												<CreditCardIcon className="size-4 text-primary" />
												{plan.trialDays
													? `${plan.trialDays}-day trial`
													: "No trial"}
											</p>
										</div>
										<Button
											className="w-full"
											disabled={
												Boolean(busy) ||
												current?.plan.id === plan.id ||
												needsPaymentSetup
											}
											onClick={() => choose(plan.id)}
										>
											{current?.plan.id === plan.id
												? "Current plan"
												: needsPaymentSetup
													? "Payment setup required"
													: plan.trialDays > 0 && price > 0
														? `Start ${plan.trialDays}-day trial`
														: "Choose plan"}
										</Button>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
