import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getDashboardSession } from "@/lib/auth.functions";
import {
	createAdminPlan,
	listAdminPlans,
	saveAdminPlan,
} from "@/lib/organization-billing.functions";
export const Route = createFileRoute("/admin/plans")({
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
	loader: () => listAdminPlans(),
	component: AdminPlans,
});
function AdminPlans() {
	const dashboard = Route.useRouteContext();
	const initial = Route.useLoaderData();
	const router = useRouter();
	const [plans, setPlans] = useState(initial);
	const [busy, setBusy] = useState<string | null>(null);
	const [newPlan, setNewPlan] = useState({ name: "", slug: "" });
	function update(id: string, values: Partial<(typeof plans)[number]>) {
		setPlans((current) =>
			current.map((plan) => (plan.id === id ? { ...plan, ...values } : plan)),
		);
	}
	async function save(id: string) {
		const plan = plans.find((item) => item.id === id);
		if (!plan) return;
		setBusy(id);
		try {
			await saveAdminPlan({ data: plan });
			toast.success("Plan saved.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to save plan.",
			);
		} finally {
			setBusy(null);
		}
	}
	async function create() {
		setBusy("new");
		try {
			await createAdminPlan({ data: newPlan });
			setNewPlan({ name: "", slug: "" });
			toast.success("Draft plan created.");
			setPlans(await listAdminPlans());
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to create plan.",
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
				isImpersonating={false}
				activeItem="plans"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Platform plans</span>
				</header>
				<main className="space-y-6 p-4 sm:p-6 lg:p-8">
					<div>
						<h1 className="text-2xl font-semibold">Plans</h1>
						<p className="text-muted-foreground">
							Configure organization pricing and usage limits.
						</p>
					</div>
					<Card>
						<CardHeader>
							<CardTitle>Create plan</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
							<Input
								placeholder="Plan name"
								value={newPlan.name}
								onChange={(event) =>
									setNewPlan((value) => ({
										...value,
										name: event.target.value,
									}))
								}
							/>
							<Input
								placeholder="plan-slug"
								value={newPlan.slug}
								onChange={(event) =>
									setNewPlan((value) => ({
										...value,
										slug: event.target.value,
									}))
								}
							/>
							<Button
								disabled={busy === "new" || !newPlan.name || !newPlan.slug}
								onClick={create}
							>
								Create draft
							</Button>
						</CardContent>
					</Card>
					<div className="grid gap-4 xl:grid-cols-2">
						{plans.map((plan) => (
							<Card key={plan.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>{plan.name}</CardTitle>
										<Badge
											variant={
												plan.status === "active" ? "default" : "secondary"
											}
										>
											{plan.status}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2 sm:col-span-2">
										<Label>Name</Label>
										<Input
											value={plan.name}
											onChange={(e) =>
												update(plan.id, { name: e.target.value })
											}
										/>
									</div>
									<div className="space-y-2">
										<Label>Monthly price (sen)</Label>
										<Input
											type="number"
											value={plan.monthlyPriceInSen}
											onChange={(e) =>
												update(plan.id, {
													monthlyPriceInSen: Number(e.target.value),
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label>Yearly price (sen)</Label>
										<Input
											type="number"
											value={plan.yearlyPriceInSen}
											onChange={(e) =>
												update(plan.id, {
													yearlyPriceInSen: Number(e.target.value),
												})
											}
										/>
									</div>
									{(
										[
											"maxPublishedCourses",
											"maxProducts",
											"maxTeamMembers",
											"maxCustomers",
											"analyticsRetentionDays",
											"trialDays",
										] as const
									).map((key) => (
										<div className="space-y-2" key={key}>
											<Label>{key.replace(/([A-Z])/g, " $1")}</Label>
											<Input
												type="number"
												value={plan[key]}
												onChange={(e) =>
													update(plan.id, { [key]: Number(e.target.value) })
												}
											/>
										</div>
									))}
									<div className="space-y-2">
										<Label>Status</Label>
										<Select
											value={plan.status}
											onValueChange={(value) => {
												if (value) update(plan.id, { status: value });
											}}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="draft">Draft</SelectItem>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="archived">Archived</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex items-end">
										<Button
											className="w-full"
											disabled={busy === plan.id}
											onClick={() => save(plan.id)}
										>
											Save plan
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
