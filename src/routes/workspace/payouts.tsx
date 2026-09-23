import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { LandmarkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	getCreatorPayouts,
	saveCreatorPayoutProfile,
} from "@/lib/payout.functions";

export const Route = createFileRoute("/workspace/payouts")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: () => getCreatorPayouts(),
	head: () => ({ meta: [{ title: "Payouts | DV LMS" }] }),
	component: CreatorPayouts,
});

const money = (value: number) =>
	new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
		value / 100,
	);

function CreatorPayouts() {
	const dashboard = Route.useRouteContext();
	const data = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	async function save(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setBusy(true);
		try {
			await saveCreatorPayoutProfile({
				data: {
					accountHolderName: form.get("accountHolderName"),
					bankName: form.get("bankName"),
					bankAccountNumber: form.get("bankAccountNumber"),
				},
			});
			toast.success("Payout bank details saved securely.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to save bank details.",
			);
		} finally {
			setBusy(false);
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
				activeItem="payouts"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<p className="text-sm font-medium">Payouts</p>
				</header>
				<main className="flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-6xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Creator payouts</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Track earnings and configure the bank account used for manual
								payouts.
							</p>
						</div>
						<div className="grid gap-4 md:grid-cols-3">
							<Card>
								<CardHeader>
									<CardTitle className="text-sm">Available balance</CardTitle>
								</CardHeader>
								<CardContent className="text-2xl font-semibold">
									{money(data.balanceInSen)}
								</CardContent>
							</Card>
							<Card className="md:col-span-2">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<LandmarkIcon className="size-5" /> Bank details
									</CardTitle>
								</CardHeader>
								<CardContent>
									<form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
										<div>
											<Label>Account holder</Label>
											<Input
												name="accountHolderName"
												defaultValue={data.profile?.accountHolderName ?? ""}
												required
											/>
										</div>
										<div>
											<Label>Bank</Label>
											<Input
												name="bankName"
												defaultValue={data.profile?.bankName ?? ""}
												required
											/>
										</div>
										<div>
											<Label>Account number</Label>
											<Input
												name="bankAccountNumber"
												placeholder={
													data.profile
														? `•••• ${data.profile.bankAccountLast4}`
														: "Account number"
												}
												required={!data.profile}
											/>
											<Button className="mt-3" disabled={busy}>
												{busy ? "Saving…" : "Save details"}
											</Button>
										</div>
									</form>
								</CardContent>
							</Card>
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Ledger</CardTitle>
							</CardHeader>
							<CardContent>
								{data.entries.length ? (
									<div className="divide-y">
										{data.entries.map((entry) => (
											<div
												key={entry.id}
												className="flex items-center justify-between py-3 text-sm"
											>
												<div>
													<p>{entry.description}</p>
													<p className="text-xs text-muted-foreground">
														{new Intl.DateTimeFormat("en-MY", {
															dateStyle: "medium",
														}).format(entry.createdAt)}
													</p>
												</div>
												<span
													className={
														entry.amountInSen < 0
															? "text-destructive"
															: "text-emerald-600"
													}
												>
													{money(entry.amountInSen)}
												</span>
											</div>
										))}
									</div>
								) : (
									<p className="py-8 text-center text-sm text-muted-foreground">
										Paid sales will appear here.
									</p>
								)}
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Payout history</CardTitle>
							</CardHeader>
							<CardContent>
								{data.payouts.length ? (
									<div className="divide-y">
										{data.payouts.map((payout) => (
											<div
												key={payout.id}
												className="flex items-center justify-between py-3 text-sm"
											>
												<span>{money(payout.amountInSen)}</span>
												<Badge variant="secondary" className="capitalize">
													{payout.status}
												</Badge>
											</div>
										))}
									</div>
								) : (
									<p className="py-8 text-center text-sm text-muted-foreground">
										No payout has been created.
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
