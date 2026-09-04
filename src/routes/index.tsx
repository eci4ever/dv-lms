import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Clock3,
	Network,
	PlayCircle,
	Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { freeCourses, networkCourse } from "@/lib/course";
import { sessionQueryOptions } from "@/lib/session.query";

export const Route = createFileRoute("/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(sessionQueryOptions),
	component: Home,
});

const outcomes = [
	"Set up and test a LAN in Cisco Packet Tracer",
	"Solve subnetting questions with a repeatable method",
	"Configure VLANs and static routes for your lab assessment",
];

function Home() {
	const session = Route.useLoaderData();
	const isSignedIn = Boolean(session);

	return (
		<main className="dark min-h-screen overflow-hidden bg-[#080d1a] text-white selection:bg-cyan-400/30">
			<div className="mx-auto max-w-6xl px-5 sm:px-8">
				<header className="flex h-20 items-center justify-between">
					<a
						className="flex items-center gap-2.5 font-semibold tracking-tight"
						href="#top"
					>
						<span className="grid size-8 place-items-center rounded-lg bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
							<Network className="size-4" />
						</span>
						NetLab MY
					</a>
					<nav
						className="hidden items-center gap-7 text-sm text-slate-400 md:flex"
						aria-label="Main navigation"
					>
						<a className="transition hover:text-white" href="#course">
							Course
						</a>
						<a className="transition hover:text-white" href="#outcomes">
							What you learn
						</a>
						<a className="transition hover:text-white" href="#faq">
							For students
						</a>
					</nav>
					<Button asChild variant="ghost" className="text-slate-200">
						{isSignedIn ? (
							<Link to="/dashboard">
								Go to dashboard <ArrowRight />
							</Link>
						) : (
							<Link to="/login">
								Sign in <ArrowRight />
							</Link>
						)}
					</Button>
				</header>

				<section
					className="grid items-center gap-14 py-18 lg:grid-cols-[1fr_.9fr] lg:py-28"
					id="top"
				>
					<div>
						<Badge className="border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100 hover:bg-cyan-400/10">
							<span className="mr-2 size-1.5 rounded-full bg-cyan-400" /> FOR
							MALAYSIAN DIPLOMA IT STUDENTS
						</Badge>
						<h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-[-.06em] text-balance sm:text-6xl lg:text-7xl">
							Stop guessing in your{" "}
							<span className="text-cyan-400">networking lab.</span>
						</h1>
						<p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
							A practical Packet Tracer course for students who want to
							understand the lab, not memorise commands the night before.
						</p>
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<Button
								asChild
								size="lg"
								className="h-11 bg-cyan-400 px-5 text-slate-950 shadow-lg shadow-cyan-400/20 hover:bg-cyan-300"
							>
								{isSignedIn ? (
									<Link to="/dashboard">
										Go to dashboard <ArrowRight />
									</Link>
								) : (
									<a href="#course">
										Start the free course <ArrowRight />
									</a>
								)}
							</Button>
							<a
								className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
								href="#outcomes"
							>
								<PlayCircle className="size-4" /> See what you will build
							</a>
						</div>
						<div className="mt-10 flex items-center gap-3 text-xs text-slate-500">
							<Users className="size-4 text-cyan-400" /> Built for Diploma IT
							students preparing for practical labs
						</div>
					</div>
					<div className="relative mx-auto w-full max-w-md">
						<div className="absolute -inset-12 rounded-full bg-cyan-400/10 blur-3xl" />
						<Card className="relative overflow-hidden border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
							<CardHeader className="border-b border-slate-700 bg-slate-950/50">
								<div className="flex items-center justify-between">
									<span className="font-mono text-xs text-cyan-300">
										LAB 01 / PACKET TRACER
									</span>
									<span className="size-2 rounded-full bg-cyan-400" />
								</div>
							</CardHeader>
							<CardContent className="p-6">
								<div className="grid min-h-52 place-items-center rounded-xl border border-cyan-400/20 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.16),transparent_50%)]">
									<div className="flex items-center gap-3">
										<span className="size-12 rounded-xl border border-cyan-400/50 bg-cyan-400/10" />
										<span className="h-px w-16 bg-cyan-400" />
										<span className="size-12 rounded-xl border border-cyan-400/50 bg-cyan-400/10" />
									</div>
								</div>
								<p className="mt-5 text-sm font-semibold">
									Build and test your first LAN
								</p>
								<p className="mt-1 text-sm text-slate-500">
									Device setup, IP addressing, and connectivity testing.
								</p>
							</CardContent>
						</Card>
					</div>
				</section>
			</div>

			<section
				className="border-y border-slate-800 bg-slate-950/50"
				id="outcomes"
			>
				<div className="mx-auto grid max-w-6xl md:grid-cols-3">
					{outcomes.map((outcome, index) => (
						<div
							className="flex items-start gap-3 border-slate-800 px-6 py-6 text-sm text-slate-300 not-last:border-b md:border-r md:not-last:border-b-0"
							key={outcome}
						>
							<span className="font-mono text-xs text-cyan-400">
								0{index + 1}
							</span>
							{outcome}
						</div>
					))}
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-5 py-24 sm:px-8" id="course">
				<div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
					<div>
						<p className="font-mono text-xs tracking-widest text-cyan-400">
							THE FIRST COHORT
						</p>
						<h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
							{networkCourse.title}
						</h2>
						<p className="mt-5 max-w-xl leading-7 text-slate-400">
							Short, practical lessons that follow the workflow you use in a
							network lab. Every module includes a Packet Tracer exercise.
						</p>
						<div className="mt-8 space-y-3">
							{networkCourse.lessons.map((lesson, index) => (
								<div
									className="flex items-center gap-4 border-b border-slate-800 py-3"
									key={lesson.title}
								>
									<span className="font-mono text-xs text-cyan-400">
										0{index + 1}
									</span>
									<span className="flex-1 text-sm font-medium">
										{lesson.title}
									</span>
									<span className="flex items-center gap-1 text-xs text-slate-500">
										<Clock3 className="size-3" />
										{lesson.duration}
									</span>
								</div>
							))}
						</div>
					</div>
					<Card className="border-cyan-400/20 bg-slate-900/80">
						<CardHeader>
							<p className="font-mono text-xs tracking-widest text-cyan-400">
								FREE COURSE
							</p>
							<CardTitle className="mt-3 text-5xl">
								{networkCourse.price}
							</CardTitle>
							<p className="text-sm text-slate-400">
								Free access for the first cohort.
							</p>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-slate-300">
							{[
								"5 practical Packet Tracer lessons",
								"Downloadable lab files",
								"Learn at your own pace",
							].map((item) => (
								<p className="flex gap-2" key={item}>
									<Check className="size-4 shrink-0 text-cyan-400" />
									{item}
								</p>
							))}
						</CardContent>
						<CardFooter>
							<Button
								asChild
								className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
							>
								{isSignedIn ? (
									<Link to="/dashboard">
										Go to dashboard <ArrowRight />
									</Link>
								) : (
									<Link to="/signup">
										Create a free account <ArrowRight />
									</Link>
								)}
							</Button>
						</CardFooter>
					</Card>
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
				<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
					<div>
						<p className="font-mono text-xs tracking-widest text-cyan-400">
							EXPLORE THE LIBRARY
						</p>
						<h2 className="mt-3 text-3xl font-semibold tracking-tight">
							Two more free foundations courses.
						</h2>
					</div>
					<p className="max-w-sm text-sm leading-6 text-slate-400">
						Start with the topic that helps you most in your next class or lab.
					</p>
				</div>
				<div className="mt-8 grid gap-5 md:grid-cols-2">
					{freeCourses.slice(1).map((course) => (
						<Card
							className="border-slate-800 bg-slate-900/60 transition hover:-translate-y-0.5 hover:border-cyan-400/35"
							key={course.slug}
						>
							<CardHeader>
								<div className="flex items-center justify-between">
									<span className="font-mono text-xs tracking-widest text-cyan-400">
										FREE COURSE
									</span>
									<span className="text-xs text-slate-500">
										{course.duration}
									</span>
								</div>
								<CardTitle className="mt-4 text-2xl">{course.title}</CardTitle>
								<p className="mt-2 text-sm leading-6 text-slate-400">
									{course.subtitle}
								</p>
							</CardHeader>
							<CardFooter className="justify-between">
								<span className="text-sm text-slate-400">
									{Array.isArray(course.lessons)
										? course.lessons.length
										: course.lessons}{" "}
									lessons
								</span>
								<Button
									asChild
									size="sm"
									variant="outline"
									className="border-slate-700"
								>
									<Link
										to="/learn/$courseSlug"
										params={{ courseSlug: course.slug }}
									>
										Start learning <ArrowRight />
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			</section>

			<section
				className="border-t border-slate-800 bg-slate-950/30 px-5 py-20 text-center sm:px-8"
				id="faq"
			>
				<div className="mx-auto max-w-xl">
					<p className="font-mono text-xs tracking-widest text-cyan-400">
						START WITH THE LAB
					</p>
					<h2 className="mt-4 text-4xl font-semibold tracking-tight">
						Learn the part that feels confusing, one lab at a time.
					</h2>
					<Button
						asChild
						size="lg"
						className="mt-8 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
					>
						{isSignedIn ? (
							<Link to="/dashboard">
								Go to dashboard <ArrowRight />
							</Link>
						) : (
							<Link to="/signup">
								Start learning <ArrowRight />
							</Link>
						)}
					</Button>
				</div>
			</section>
		</main>
	);
}
