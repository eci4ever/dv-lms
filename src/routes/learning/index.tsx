import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BookOpenIcon, CircleCheckIcon, PlayIcon } from "lucide-react";

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
import { listMyLearning } from "@/lib/learning.functions";

export const Route = createFileRoute("/learning/")({
	head: () => ({ meta: [{ title: "My Learning | DV LMS" }] }),
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		return dashboard;
	},
	loader: () => listMyLearning(),
	component: MyLearning,
});

function MyLearning() {
	const dashboard = Route.useRouteContext();
	const enrollments = Route.useLoaderData();

	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={Boolean(dashboard.session.session.impersonatedBy)}
				activeItem="learning"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">My Learning</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-6xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								My courses
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Continue learning and track completed lessons.
							</p>
						</div>
						{enrollments.length ? (
							<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
								{enrollments.map((item) => {
									const total = Number(item.totalLessons);
									const completed = Number(item.completedLessons);
									const percentage = total
										? Math.round((completed / total) * 100)
										: 0;
									return (
										<Card
											key={item.enrollmentId}
											className="overflow-hidden py-0"
										>
											<div className="aspect-video bg-muted">
												{item.thumbnailUrl ? (
													<img
														src={item.thumbnailUrl}
														alt=""
														className="size-full object-cover"
													/>
												) : (
													<div className="grid size-full place-items-center">
														<BookOpenIcon className="size-9 text-muted-foreground" />
													</div>
												)}
											</div>
											<CardHeader className="pb-0">
												<div className="flex items-center justify-between gap-3">
													<p className="text-xs text-muted-foreground">
														{item.organizationName}
													</p>
													{item.status === "completed" ? (
														<Badge variant="secondary">
															<CircleCheckIcon /> Completed
														</Badge>
													) : null}
												</div>
												<CardTitle className="line-clamp-2 text-lg">
													{item.title}
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-4 pb-5">
												<div className="space-y-2">
													<div className="flex justify-between text-xs text-muted-foreground">
														<span>
															{completed} of {total} lessons
														</span>
														<span>{percentage}%</span>
													</div>
													<div className="h-2 overflow-hidden rounded-full bg-muted">
														<div
															className="h-full rounded-full bg-primary transition-[width]"
															style={{ width: `${percentage}%` }}
														/>
													</div>
												</div>
												{item.firstLessonId ? (
													<Button
														render={
															<Link
																to="/learning/$slug/$lessonId"
																params={{
																	slug: item.slug,
																	lessonId: item.firstLessonId,
																}}
															/>
														}
														className="w-full"
													>
														<PlayIcon />{" "}
														{completed ? "Continue" : "Start course"}
													</Button>
												) : (
													<Button className="w-full" disabled>
														No lessons yet
													</Button>
												)}
											</CardContent>
										</Card>
									);
								})}
							</div>
						) : (
							<div className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
								<div>
									<BookOpenIcon className="mx-auto size-10 text-muted-foreground" />
									<h2 className="mt-4 font-medium">No enrolled courses yet</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										Browse the catalog and enroll in a free course to begin.
									</p>
									<Button render={<Link to="/courses" />} className="mt-5">
										Browse courses
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
