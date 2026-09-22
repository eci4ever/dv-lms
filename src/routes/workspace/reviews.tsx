import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { FlagIcon, MessageSquareMoreIcon, StarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
	listWorkspaceReviews,
	reportCourseReview,
	setReviewFeatured,
} from "@/lib/review.functions";

type ReviewSearch = { query?: string; rating?: number; status?: string };
export const Route = createFileRoute("/workspace/reviews")({
	validateSearch: (search: Record<string, unknown>): ReviewSearch => ({
		query: typeof search.query === "string" ? search.query : undefined,
		rating: [1, 2, 3, 4, 5].includes(Number(search.rating))
			? Number(search.rating)
			: undefined,
		status:
			search.status === "published" || search.status === "hidden"
				? search.status
				: undefined,
	}),
	loaderDeps: ({ search }) => search,
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: ({ deps }) => listWorkspaceReviews({ data: deps }),
	component: WorkspaceReviews,
});

function WorkspaceReviews() {
	const dashboard = Route.useRouteContext();
	const reviews = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/workspace/reviews" });
	const router = useRouter();
	const [reporting, setReporting] = useState<string | null>(null);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState<string | null>(null);
	async function feature(id: string, featured: boolean) {
		setBusy(id);
		try {
			await setReviewFeatured({ data: { id, featured } });
			toast.success(
				featured
					? "Review added to storefront testimonials."
					: "Review removed from testimonials.",
			);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to update testimonial.",
			);
		} finally {
			setBusy(null);
		}
	}
	async function report(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!reporting) return;
		setBusy(reporting);
		try {
			await reportCourseReview({ data: { reviewId: reporting, reason } });
			toast.success("Review reported to platform moderation.");
			setReporting(null);
			setReason("");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to report review.",
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
				activeItem="reviews"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator
						orientation="vertical"
						className="mx-2 data-vertical:h-4"
					/>
					<p className="text-sm font-medium">Reviews</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-6xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Course reviews</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Feature genuine learner testimonials or report reviews for
								platform moderation.
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-[1fr_160px_160px]">
							<Input
								placeholder="Search course, learner or review"
								value={search.query ?? ""}
								onChange={(event) =>
									navigate({
										search: (old) => ({
											...old,
											query: event.target.value || undefined,
										}),
									})
								}
							/>
							<select
								className="h-8 rounded-lg border bg-background px-2 text-sm"
								value={search.rating ?? ""}
								onChange={(event) =>
									navigate({
										search: (old) => ({
											...old,
											rating: event.target.value
												? Number(event.target.value)
												: undefined,
										}),
									})
								}
							>
								<option value="">All ratings</option>
								{[5, 4, 3, 2, 1].map((value) => (
									<option key={value} value={value}>
										{value} stars
									</option>
								))}
							</select>
							<select
								className="h-8 rounded-lg border bg-background px-2 text-sm"
								value={search.status ?? ""}
								onChange={(event) =>
									navigate({
										search: (old) => ({
											...old,
											status: event.target.value || undefined,
										}),
									})
								}
							>
								<option value="">All statuses</option>
								<option value="published">Published</option>
								<option value="hidden">Hidden</option>
							</select>
						</div>
						{reviews.length ? (
							<div className="space-y-4">
								{reviews.map((review) => (
									<Card key={review.id}>
										<CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
											<Avatar>
												<AvatarImage src={review.userImage ?? undefined} />
												<AvatarFallback>
													{review.userName.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-medium">{review.userName}</p>
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
													{review.featuredAt ? <Badge>Featured</Badge> : null}
												</div>
												<div className="mt-2 flex gap-0.5">
													{[1, 2, 3, 4, 5].map((star) => (
														<StarIcon
															key={star}
															className={`size-4 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
														/>
													))}
												</div>
												<p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
													{review.content}
												</p>
												{review.reportStatus ? (
													<p className="mt-3 text-xs text-amber-700">
														Report {review.reportStatus}: {review.reportReason}
													</p>
												) : null}
											</div>
											<div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
												<Button
													size="sm"
													variant="outline"
													disabled={
														busy === review.id || review.status !== "published"
													}
													onClick={() => feature(review.id, !review.featuredAt)}
												>
													{review.featuredAt ? "Unfeature" : "Feature"}
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={review.reportStatus === "pending"}
													onClick={() => {
														setReporting(review.id);
														setReason("");
													}}
												>
													<FlagIcon /> Report
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						) : (
							<div className="rounded-xl border border-dashed p-12 text-center">
								<MessageSquareMoreIcon className="mx-auto size-9 text-muted-foreground" />
								<p className="mt-3 font-medium">No matching reviews</p>
							</div>
						)}
						{reporting ? (
							<Card>
								<CardContent className="p-5">
									<form className="space-y-3" onSubmit={report}>
										<p className="font-medium">Report this review</p>
										<textarea
											className="min-h-24 w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
											minLength={10}
											maxLength={1000}
											required
											value={reason}
											onChange={(event) => setReason(event.target.value)}
											placeholder="Explain why this review should be moderated."
										/>
										<div className="flex gap-2">
											<Button type="submit" disabled={busy === reporting}>
												Submit report
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() => setReporting(null)}
											>
												Cancel
											</Button>
										</div>
									</form>
								</CardContent>
							</Card>
						) : null}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
