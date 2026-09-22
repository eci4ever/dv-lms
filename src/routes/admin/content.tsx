import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { listAdminContent, moderateContent } from "@/lib/platform.functions";

export const Route = createFileRoute("/admin/content")({
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
	loader: () => listAdminContent(),
	component: AdminContent,
});
function AdminContent() {
	const dashboard = Route.useRouteContext();
	const { items } = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	async function act(
		id: string,
		type: "course" | "product" | "storefront",
		action: "unlist" | "suspend" | "restore",
	) {
		const reason = window.prompt(`Reason to ${action} this ${type}:`)?.trim();
		if (!reason) return;
		setBusy(id);
		try {
			await moderateContent({ data: { id, type, action, reason } });
			toast.success(`Content ${action} completed.`);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to moderate content.",
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
				activeItem="content"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Content moderation</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-6xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Platform content</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								Unlist or suspend public content while preserving learner
								access.
							</p>
						</div>
						{items.map((item) => (
							<Card key={`${item.type}-${item.id}`}>
								<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<div className="flex flex-wrap gap-2">
											<strong>{item.name}</strong>
											<Badge variant="outline">{item.type}</Badge>
											<Badge>{item.status}</Badge>
											{item.moderationStatus !== "active" ? (
												<Badge variant="destructive">
													{item.moderationStatus}
												</Badge>
											) : null}
										</div>
										<p className="mt-2 text-sm text-muted-foreground">
											{item.organizationName} · /{item.slug}
										</p>
									</div>
									<div className="flex gap-2">
										{item.moderationStatus === "active" ? (
											<>
												<Button
													variant="outline"
													disabled={busy === item.id}
													onClick={() => act(item.id, item.type, "unlist")}
												>
													Unlist
												</Button>
												<Button
													variant="destructive"
													disabled={busy === item.id}
													onClick={() => act(item.id, item.type, "suspend")}
												>
													Suspend
												</Button>
											</>
										) : (
											<Button
												disabled={busy === item.id}
												onClick={() => act(item.id, item.type, "restore")}
											>
												Restore
											</Button>
										)}
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
