import { createFileRoute, redirect } from "@tanstack/react-router";
import { Clock3, Code2, Flame, Play } from "lucide-react";

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
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) throw redirect({ to: "/login" });
		return { user: session.user };
	},
	component: DashboardPage,
});

const courses = [
	{
		title: "Build a Full-Stack TypeScript App",
		module: "Module 4 · Authentication & Sessions",
		progress: 68,
		lessons: "17 of 25 lessons",
		gradient: "from-blue-500 to-cyan-400",
	},
	{
		title: "Modern React Patterns",
		module: "Module 2 · Server State",
		progress: 34,
		lessons: "8 of 24 lessons",
		gradient: "from-violet-500 to-fuchsia-400",
	},
];

function DashboardPage() {
	const { user } = Route.useRouteContext();

	async function handleSignOut() {
		await authClient.signOut();
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
											<BreadcrumbLink href="/dashboard">DevLMS</BreadcrumbLink>
										</BreadcrumbItem>
										<BreadcrumbSeparator className="hidden md:block" />
										<BreadcrumbItem>
											<BreadcrumbPage>Learning overview</BreadcrumbPage>
										</BreadcrumbItem>
									</BreadcrumbList>
								</Breadcrumb>
							</div>
						</header>

						<div className="flex flex-1 flex-col gap-6 p-4 pt-4 md:p-6 lg:p-8">
							<section className="overflow-hidden rounded-xl border border-blue-400/15 bg-gradient-to-br from-blue-500/15 via-slate-900 to-violet-500/10 p-6 md:p-8">
								<p className="font-mono text-xs tracking-widest text-blue-400">
									YOUR LEARNING SPACE
								</p>
								<h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
									Welcome back, {user.name.split(" ")[0]}.
								</h1>
								<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
									Keep your momentum going. You’re two lessons away from your
									next milestone.
								</p>
								<Button className="mt-6 bg-blue-500 text-white hover:bg-blue-400">
									<Play className="size-4 fill-current" /> Continue learning
								</Button>
							</section>

							<div
								className="grid auto-rows-min gap-4 md:grid-cols-3"
								id="progress"
							>
								<StatCard
									icon={Clock3}
									label="Learning time"
									note="This month"
									value="12.5 hrs"
								/>
								<StatCard
									icon={Flame}
									label="Current streak"
									note="Personal best: 12"
									value="7 days"
								/>
								<StatCard
									icon={Code2}
									label="Projects built"
									note="2 in progress"
									value="4"
								/>
							</div>

							<section
								className="min-h-[45vh] flex-1 rounded-xl border border-slate-800 bg-slate-900/35 p-5 md:p-6"
								id="learning"
							>
								<div>
									<p className="font-mono text-xs tracking-widest text-blue-400">
										IN PROGRESS
									</p>
									<h2 className="mt-1 text-xl font-semibold">
										Continue learning
									</h2>
								</div>
								<div className="mt-5 grid gap-4 xl:grid-cols-2">
									{courses.map((course) => (
										<article
											className="rounded-xl border border-slate-800 bg-[#0b1327] p-5"
											key={course.title}
										>
											<div
												className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${course.gradient}`}
											/>
											<h3 className="mt-5 font-semibold">{course.title}</h3>
											<p className="mt-1 text-sm text-slate-500">
												{course.module}
											</p>
											<div className="mt-6 flex justify-between text-xs text-slate-500">
												<span>{course.lessons}</span>
												<span>{course.progress}%</span>
											</div>
											<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
												<div
													className={`h-full rounded-full bg-gradient-to-r ${course.gradient}`}
													style={{ width: `${course.progress}%` }}
												/>
											</div>
										</article>
									))}
								</div>
							</section>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</TooltipProvider>
		</div>
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
