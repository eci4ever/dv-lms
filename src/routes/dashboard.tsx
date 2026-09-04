import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	BookOpen,
	CheckCircle2,
	type Clock3,
	Layers3,
	Play,
} from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { getMyCourses } from "@/lib/learning.functions";
import { sessionQueryKey, sessionQueryOptions } from "@/lib/session.query";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async ({ context }) => {
		const session =
			await context.queryClient.ensureQueryData(sessionQueryOptions);
		if (!session) throw redirect({ to: "/login" });
		return { user: session.user };
	},
	loader: () => getMyCourses(),
	component: DashboardPage,
});

function DashboardPage() {
	const { user } = Route.useRouteContext();
	const courses = Route.useLoaderData();
	const queryClient = useQueryClient();
	const currentCourse = courses[0];
	const totalLessons = courses.reduce(
		(total, item) => total + item.lessonCount,
		0,
	);
	const completedLessons = courses.reduce(
		(total, item) => total + item.completedLessonCount,
		0,
	);
	const completedCourses = courses.filter(
		(item) => item.progress === 100,
	).length;

	async function handleSignOut() {
		await authClient.signOut();
		queryClient.removeQueries({ queryKey: sessionQueryKey });
		window.location.assign("/login");
	}

	return (
		<div className="dark min-h-screen bg-background text-foreground">
			<TooltipProvider>
				<SidebarProvider>
					<AppSidebar onSignOut={handleSignOut} user={user} />
					<SidebarInset className="bg-[#080d1a]">
						<header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-800/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
							<div className="flex items-center gap-2 px-4">
								<SidebarTrigger className="-ml-1" />
								<Separator
									className="mr-2 data-[orientation=vertical]:h-4"
									orientation="vertical"
								/>
								<Breadcrumb>
									<BreadcrumbList>
										<BreadcrumbItem className="hidden md:block">
											<BreadcrumbLink asChild>
												<Link to="/dashboard">DevLMS</Link>
											</BreadcrumbLink>
										</BreadcrumbItem>
										<BreadcrumbSeparator className="hidden md:block" />
										<BreadcrumbItem>
											<BreadcrumbPage>My learning</BreadcrumbPage>
										</BreadcrumbItem>
									</BreadcrumbList>
								</Breadcrumb>
							</div>
						</header>

						<div className="flex flex-1 flex-col gap-6 p-4 pt-4 md:p-6 lg:p-8">
							<section className="overflow-hidden rounded-xl border border-blue-400/15 bg-gradient-to-br from-blue-500/15 via-slate-900 to-violet-500/10 p-6 md:p-8">
								<p className="font-mono text-xs tracking-widest text-blue-400">
									{currentCourse ? "CONTINUE LEARNING" : "MY LEARNING"}
								</p>
								<h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
									Welcome back, {user.name.split(" ")[0]}.
								</h1>
								{currentCourse ? (
									<>
										<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
											Resume {currentCourse.course.title}
											{currentCourse.resumeLesson
												? ` from ${currentCourse.resumeLesson.title}.`
												: "."}
										</p>
										<Button
											asChild
											className="mt-6 bg-blue-500 text-white hover:bg-blue-400"
										>
											<Link
												to="/learn/$courseSlug"
												params={{ courseSlug: currentCourse.course.slug }}
											>
												<Play className="size-4 fill-current" /> Continue
												learning
											</Link>
										</Button>
									</>
								) : (
									<>
										<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
											You have not joined a course yet. Explore the catalogue to
											get started.
										</p>
										<Button
											asChild
											className="mt-6 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
										>
											<Link to="/courses">Explore courses</Link>
										</Button>
									</>
								)}
							</section>

							<div
								className="grid auto-rows-min gap-4 md:grid-cols-3"
								id="progress"
							>
								<StatCard
									icon={Layers3}
									label="Enrolled courses"
									note="Your library"
									value={String(courses.length)}
								/>
								<StatCard
									icon={BookOpen}
									label="Lessons completed"
									note={`${totalLessons} total lessons`}
									value={String(completedLessons)}
								/>
								<StatCard
									icon={CheckCircle2}
									label="Courses completed"
									note="Keep building"
									value={String(completedCourses)}
								/>
							</div>

							<section
								className="min-h-[45vh] flex-1 rounded-xl border border-slate-800 bg-slate-900/35 p-5 md:p-6"
								id="learning"
							>
								<p className="font-mono text-xs tracking-widest text-blue-400">
									YOUR COURSES
								</p>
								<h2 className="mt-1 text-xl font-semibold">My learning</h2>
								{courses.length > 0 ? (
									<div className="mt-5 grid gap-4 xl:grid-cols-2">
										{courses.map((item) => (
											<CourseCard item={item} key={item.course.id} />
										))}
									</div>
								) : (
									<div className="mt-5 rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center">
										<BookOpen className="mx-auto size-8 text-slate-600" />
										<p className="mt-4 font-medium">No enrolled courses yet</p>
										<p className="mt-1 text-sm text-slate-500">
											Your courses will appear here after enrollment.
										</p>
									</div>
								)}
							</section>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</TooltipProvider>
		</div>
	);
}

type DashboardCourse = ReturnType<typeof Route.useLoaderData>[number];

function CourseCard({ item }: { item: DashboardCourse }) {
	const lesson = item.resumeLesson ?? item.nextLesson;
	return (
		<article className="rounded-xl border border-slate-800 bg-[#0b1327] p-5">
			<div className="h-1.5 w-24 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
			<h3 className="mt-5 font-semibold">{item.course.title}</h3>
			<p className="mt-1 text-sm text-slate-500">
				{lesson
					? `Lesson ${lesson.position} · ${lesson.title}`
					: "No lessons available"}
			</p>
			<div className="mt-6 flex justify-between text-xs text-slate-500">
				<span>
					{item.completedLessonCount} of {item.lessonCount} lessons
				</span>
				<span>{item.progress}%</span>
			</div>
			<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
				<div
					className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
					style={{ width: `${item.progress}%` }}
				/>
			</div>
			<Button asChild className="mt-5" size="sm" variant="outline">
				<Link to="/learn/$courseSlug" params={{ courseSlug: item.course.slug }}>
					{item.progress === 100 ? "Review course" : "Continue"}
				</Link>
			</Button>
		</article>
	);
}

function StatCard({
	icon: Icon,
	label,
	value,
	note,
}: {
	icon: typeof Clock3;
	label: string;
	value: string;
	note: string;
}) {
	return (
		<article className="rounded-xl border border-slate-800 bg-slate-900/45 p-5">
			<span className="grid size-9 place-items-center rounded-lg bg-blue-500/10 text-blue-300">
				<Icon className="size-4" />
			</span>
			<p className="mt-4 text-sm text-slate-500">{label}</p>
			<p className="mt-1 text-2xl font-semibold">{value}</p>
			<p className="mt-1 text-xs text-slate-600">{note}</p>
		</article>
	);
}
