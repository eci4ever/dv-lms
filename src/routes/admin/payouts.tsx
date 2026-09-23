import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	createCreatorPayout,
	listAdminPayouts,
	updateCreatorPayout,
} from "@/lib/payout.functions";

export const Route = createFileRoute("/admin/payouts")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (
			dashboard.session.session.impersonatedBy ||
			!dashboard.session.user.role?.split(",").includes("admin")
		)
			throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: () => listAdminPayouts(),
	head: () => ({ meta: [{ title: "Creator Payouts | DV LMS" }] }),
	component: AdminPayouts,
});
const money = (value: number) =>
	new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
		value / 100,
	);
function AdminPayouts() {
	const dashboard = Route.useRouteContext();
	const data = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	async function create(organizationId: string) {
		setBusy(organizationId);
		try {
			await createCreatorPayout({ data: { organizationId } });
			toast.success("Payout draft created.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to create payout.",
			);
		} finally {
			setBusy(null);
		}
	}
	async function update(
		event: React.FormEvent<HTMLFormElement>,
		id: string,
		status: "processing" | "paid" | "failed",
	) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(id);
		try {
			await updateCreatorPayout({
				data: {
					id,
					status,
					reference: form.get("reference"),
					reason: form.get("reason"),
				},
			});
			toast.success(`Payout marked ${status}.`);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update payout.",
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
				activeItem="admin-payouts"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<p className="text-sm font-medium">Platform Payouts</p>
				</header>
				<main className="flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Manual creator payouts</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Create payouts from authoritative ledger balances and record
								bank transfers.
							</p>
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Creator balances</CardTitle>
							</CardHeader>
							<CardContent className="divide-y">
								{data.organizations.map((item) => (
									<div
										key={item.id}
										className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
									>
										<div className="flex-1">
											<p className="font-medium">{item.name}</p>
											<p className="text-xs text-muted-foreground">
												{item.bankName
													? `${item.bankName} · ${item.accountHolderName} · •••• ${item.bankAccountLast4}`
													: "Bank details missing"}
											</p>
										</div>
										<span className="font-semibold">
											{money(item.balanceInSen)}
										</span>
										<Button
											size="sm"
											disabled={
												busy === item.id ||
												item.balanceInSen <= 0 ||
												!item.bankName
											}
											onClick={() => create(item.id)}
										>
											Create payout
										</Button>
									</div>
								))}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Payout queue</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{data.payouts.map((payout) => (
									<form
										key={payout.id}
										onSubmit={(event) => update(event, payout.id, "paid")}
										className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto_auto]"
									>
										<div>
											<div className="flex items-center gap-2">
												<p className="font-medium">{payout.organizationName}</p>
												<Badge variant="secondary" className="capitalize">
													{payout.status}
												</Badge>
											</div>
											<p className="text-sm">{money(payout.amountInSen)}</p>
										</div>
										<Input
											name="reference"
											placeholder="Bank transfer reference"
											defaultValue={payout.transferReference ?? ""}
											disabled={payout.status === "paid"}
										/>
										<div className="flex gap-2">
											<Button
												size="sm"
												disabled={
													busy === payout.id || payout.status === "paid"
												}
											>
												Mark paid
											</Button>
											{payout.status !== "paid" ? (
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() =>
														updateCreatorPayout({
															data: {
																id: payout.id,
																status: "processing",
																reference: "",
																reason: "",
															},
														}).then(() => router.invalidate({ sync: true }))
													}
												>
													Processing
												</Button>
											) : null}
										</div>
									</form>
								))}
							</CardContent>
						</Card>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
