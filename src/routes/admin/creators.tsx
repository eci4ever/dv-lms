import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	decideCreatorApplication,
	listCreatorApplications,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/admin/creators")({
	validateSearch: (search: Record<string, unknown>) => ({
		query: typeof search.query === "string" ? search.query : "",
		status: typeof search.status === "string" ? search.status : "",
	}),
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
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => listCreatorApplications({ data: deps }),
	component: AdminCreators,
});

function AdminCreators() {
	const dashboard = Route.useRouteContext();
	const applications = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	async function act(
		id: string,
		action: "approve" | "reject" | "suspend" | "reactivate",
	) {
		const reason = window.prompt(`Reason to ${action} this creator:`)?.trim();
		if (!reason) return;
		setBusy(id);
		try {
			await decideCreatorApplication({ data: { id, action, reason } });
			toast.success(`Creator ${action} action completed.`);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update creator.",
			);
		} finally {
			setBusy(null);
		}
	}
	return (
		<SidebarProvider>
			<AppSidebar
				{...dashboard}
				user={dashboard.session.user}
				activeOrganizationId={dashboard.activeOrganizationId}
				isImpersonating={false}
				activeItem="creators"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Creator operations</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-6xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Creator approvals</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								Approve creator brands and suspend new sales when required.
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-[1fr_220px]">
							<Input
								value={search.query}
								placeholder="Search creator or email"
								onChange={(event) =>
									navigate({
										search: { ...search, query: event.target.value },
										replace: true,
									})
								}
							/>
							<select
								className="h-9 rounded-md border bg-background px-3 text-sm"
								value={search.status}
								onChange={(event) =>
									navigate({
										search: { ...search, status: event.target.value },
										replace: true,
									})
								}
							>
								<option value="">All statuses</option>
								{["pending", "approved", "rejected", "suspended"].map(
									(status) => (
										<option key={status} value={status}>
											{status}
										</option>
									),
								)}
							</select>
						</div>
						{applications.length ? (
							applications.map((item) => (
								<Card key={item.id}>
									<CardContent className="space-y-4 p-5">
										<div className="flex flex-wrap items-center gap-2">
											<strong>{item.organizationName}</strong>
											<Badge
												variant={
													item.status === "approved"
														? "default"
														: item.status === "suspended" ||
																item.status === "rejected"
															? "destructive"
															: "secondary"
												}
											>
												{item.status}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											{item.applicantName} · {item.applicantEmail}
										</p>
										<p className="text-sm">{item.note}</p>
										{item.decisionReason ? (
											<p className="rounded-md bg-muted p-3 text-sm">
												Last decision: {item.decisionReason}
											</p>
										) : null}
										<div className="flex gap-2">
											{item.status === "pending" ? (
												<>
													<Button
														disabled={busy === item.id}
														onClick={() => act(item.id, "approve")}
													>
														Approve
													</Button>
													<Button
														variant="destructive"
														disabled={busy === item.id}
														onClick={() => act(item.id, "reject")}
													>
														Reject
													</Button>
												</>
											) : item.status === "approved" ? (
												<Button
													variant="destructive"
													disabled={busy === item.id}
													onClick={() => act(item.id, "suspend")}
												>
													Suspend
												</Button>
											) : item.status === "suspended" ? (
												<Button
													disabled={busy === item.id}
													onClick={() => act(item.id, "reactivate")}
												>
													Reactivate
												</Button>
											) : null}
										</div>
									</CardContent>
								</Card>
							))
						) : (
							<div className="rounded-xl border border-dashed p-12 text-center">
								<ShieldCheckIcon className="mx-auto size-9 text-muted-foreground" />
								<p className="mt-3 font-medium">
									No creator applications found
								</p>
							</div>
						)}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
