import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
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
	getAdminSettings,
	updateAdminSettings,
} from "@/lib/platform.functions";
export const Route = createFileRoute("/admin/settings")({
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
	loader: () => getAdminSettings(),
	component: AdminSettings,
});
function AdminSettings() {
	const dashboard = Route.useRouteContext();
	const initial = Route.useLoaderData();
	const router = useRouter();
	const [form, setForm] = useState({
		platformFeePercent: initial.platformFeePercent,
		refundWindowDays: initial.refundWindowDays,
		creatorApplicationsOpen: initial.creatorApplicationsOpen,
		maintenanceMode: initial.maintenanceMode,
	});
	const [busy, setBusy] = useState(false);
	async function save() {
		setBusy(true);
		try {
			await updateAdminSettings({ data: form });
			toast.success("Platform settings saved.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to save settings.",
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
				isImpersonating={false}
				activeItem="admin-settings"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Platform settings</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<Card className="mx-auto max-w-3xl">
						<CardHeader>
							<CardTitle>Commerce policies</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="fee">Platform commission (%)</Label>
									<Input
										id="fee"
										type="number"
										min={0}
										max={100}
										value={form.platformFeePercent}
										onChange={(e) =>
											setForm({
												...form,
												platformFeePercent: Number(e.target.value),
											})
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="refund">Refund window (days)</Label>
									<Input
										id="refund"
										type="number"
										min={0}
										max={90}
										value={form.refundWindowDays}
										onChange={(e) =>
											setForm({
												...form,
												refundWindowDays: Number(e.target.value),
											})
										}
									/>
								</div>
							</div>
							<label className="flex items-center gap-3 rounded-lg border p-4">
								<input
									type="checkbox"
									checked={form.creatorApplicationsOpen}
									onChange={(e) =>
										setForm({
											...form,
											creatorApplicationsOpen: e.target.checked,
										})
									}
								/>
								<span>
									<strong className="block text-sm">
										Creator applications open
									</strong>
									<span className="text-sm text-muted-foreground">
										Allow organization owners to submit applications.
									</span>
								</span>
							</label>
							<label className="flex items-center gap-3 rounded-lg border p-4">
								<input
									type="checkbox"
									checked={form.maintenanceMode}
									onChange={(e) =>
										setForm({ ...form, maintenanceMode: e.target.checked })
									}
								/>
								<span>
									<strong className="block text-sm">
										Checkout maintenance mode
									</strong>
									<span className="text-sm text-muted-foreground">
										Pause new checkout and membership renewals while learning
										remains available.
									</span>
								</span>
							</label>
							<Button disabled={busy} onClick={save}>
								Save settings
							</Button>
						</CardContent>
					</Card>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
