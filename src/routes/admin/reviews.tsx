import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { MessageSquareWarningIcon, StarIcon } from "lucide-react";
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
import { listAdminReviews, moderateReview } from "@/lib/review.functions";

export const Route = createFileRoute("/admin/reviews")({
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
	loader: () => listAdminReviews(),
	component: AdminReviews,
});

function AdminReviews() {
	const dashboard = Route.useRouteContext();
	const reviews = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	async function act(id: string, action: "hide" | "restore" | "dismiss") {
		setBusy(`${action}-${id}`);
		try {
			await moderateReview({ data: { id, action } });
			toast.success(`Moderation action completed: ${action}.`);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to moderate review.",
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
				activeItem="admin-reviews"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator
						orientation="vertical"
						className="mx-2 data-vertical:h-4"
					/>
					<p className="text-sm font-medium">Platform review moderation</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-6xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Review moderation</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Resolve creator reports and control public visibility.
							</p>
						</div>
						{reviews.length ? (
							<div className="space-y-4">
								{reviews.map((review) => (
									<Card key={`${review.id}-${review.reportId ?? "review"}`}>
										<CardContent className="space-y-4 p-5">
											<div className="flex flex-wrap items-center gap-2">
												<Badge variant="outline">
													{review.organizationName}
												</Badge>
												<Badge variant="outline">{review.courseTitle}</Badge>
												<Badge
													variant={
														review.status === "published"
															? "secondary"
															: "destructive"
													}
												>
													{review.status}
												</Badge>
												{review.reportStatus ? (
													<Badge
														variant={
															review.reportStatus === "pending"
																? "destructive"
																: "secondary"
														}
													>
														Report: {review.reportStatus}
													</Badge>
												) : null}
											</div>
											<div>
												<p className="font-medium">{review.userName}</p>
												<div className="mt-1 flex gap-0.5">
													{[1, 2, 3, 4, 5].map((star) => (
														<StarIcon
															key={star}
															className={`size-4 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
														/>
													))}
												</div>
												<p className="mt-3 text-sm leading-6 text-muted-foreground">
													{review.content}
												</p>
											</div>
											{review.reportReason ? (
												<div className="rounded-lg bg-muted p-3 text-sm">
													<span className="font-medium">Report reason:</span>{" "}
													{review.reportReason}
												</div>
											) : null}
											<div className="flex flex-wrap gap-2">
												{review.status === "published" ? (
													<Button
														variant="destructive"
														disabled={Boolean(busy)}
														onClick={() => act(review.id, "hide")}
													>
														Hide review
													</Button>
												) : (
													<Button
														disabled={Boolean(busy)}
														onClick={() => act(review.id, "restore")}
													>
														Restore review
													</Button>
												)}
												{review.reportId &&
												review.reportStatus === "pending" ? (
													<Button
														variant="outline"
														disabled={Boolean(busy)}
														onClick={() =>
															act(review.reportId as string, "dismiss")
														}
													>
														Dismiss report
													</Button>
												) : null}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						) : (
							<div className="rounded-xl border border-dashed p-12 text-center">
								<MessageSquareWarningIcon className="mx-auto size-9 text-muted-foreground" />
								<p className="mt-3 font-medium">No reviews to moderate</p>
							</div>
						)}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
