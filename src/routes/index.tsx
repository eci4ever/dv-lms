import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Code2,
	GitBranch,
	Layers3,
	Terminal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({ component: Home });

const courses = [
	{
		title: "React Fundamentals",
		level: "Beginner",
		duration: "8 weeks",
		price: "$49",
		tags: ["React", "JavaScript"],
		color: "from-blue-500/30 to-cyan-400/10",
	},
	{
		title: "Node.js APIs",
		level: "Intermediate",
		duration: "6 weeks",
		price: "$59",
		tags: ["Node.js", "Express"],
		color: "from-violet-500/30 to-fuchsia-400/10",
	},
	{
		title: "Full-stack SaaS",
		level: "Advanced",
		duration: "12 weeks",
		price: "$89",
		tags: ["React", "Node.js", "PostgreSQL"],
		color: "from-emerald-500/30 to-teal-400/10",
	},
];

function Home() {
	return (
		<main className="dark min-h-screen overflow-hidden bg-[#080d1a] text-white selection:bg-blue-500/40">
			<div className="mx-auto max-w-6xl px-5 sm:px-8">
				<header className="flex h-20 items-center justify-between">
					<a
						className="flex items-center gap-2.5 font-semibold tracking-tight"
						href="#top"
					>
						<span className="grid size-8 place-items-center rounded-lg bg-blue-500 font-mono text-xs shadow-lg shadow-blue-500/30">
							&lt;/&gt;
						</span>
						DevLMS
					</a>
					<nav
						className="hidden items-center gap-7 text-sm text-slate-400 md:flex"
						aria-label="Main navigation"
					>
						<a className="transition hover:text-white" href="#courses">
							Courses
						</a>
						<a className="transition hover:text-white" href="#paths">
							Learning paths
						</a>
						<a className="transition hover:text-white" href="#about">
							About
						</a>
					</nav>
					<Button asChild variant="ghost" className="text-slate-200">
						<a href="/login">
							Sign in <ArrowRight />
						</a>
					</Button>
				</header>

				<section
					className="grid items-center gap-14 py-18 lg:grid-cols-[1fr_.95fr] lg:py-28"
					id="top"
				>
					<div>
						<Badge className="border-blue-400/20 bg-blue-400/10 px-3 py-1 text-blue-200 hover:bg-blue-400/10">
							<span className="mr-2 size-1.5 rounded-full bg-emerald-400" />
							PRACTICAL PROGRAMMING EDUCATION
						</Badge>
						<h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-[-.06em] text-balance sm:text-6xl lg:text-7xl">
							Build things that{" "}
							<span className="text-blue-400">get you hired.</span>
						</h1>
						<p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
							Learn modern web development by building the projects your
							portfolio has been missing.
						</p>
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<Button
								asChild
								size="lg"
								className="h-11 bg-blue-500 px-5 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400"
							>
								<a href="#courses">
									View the full-stack course <ArrowRight />
								</a>
							</Button>
							<Button
								asChild
								variant="link"
								className="text-slate-300 hover:text-white"
							>
								<a href="#paths">
									Explore learning paths <ArrowRight />
								</a>
							</Button>
						</div>
						<div className="mt-10 flex items-center gap-3 text-xs text-slate-500">
							<div className="flex -space-x-2">
								<TechMark label="JS" color="bg-amber-300 text-slate-900" />
								<TechMark label="R" color="bg-sky-400 text-slate-950" />
								<TechMark label="DB" color="bg-indigo-400" />
							</div>
							Learn with the stack used by real teams
						</div>
					</div>

					<div className="relative mx-auto w-full max-w-xl">
						<div className="absolute -inset-12 rounded-full bg-blue-500/15 blur-3xl" />
						<Card className="relative overflow-hidden border-slate-700/80 bg-slate-900/90 shadow-2xl shadow-black/50">
							<CardHeader className="border-b border-slate-700/70 bg-slate-950/40 p-3">
								<div className="flex items-center gap-1.5">
									<i className="size-2 rounded-full bg-rose-400" />
									<i className="size-2 rounded-full bg-amber-300" />
									<i className="size-2 rounded-full bg-emerald-400" />
									<span className="ml-5 rounded bg-slate-800 px-3 py-1 font-mono text-[10px] text-slate-400">
										app.taskflow.dev / projects
									</span>
								</div>
							</CardHeader>
							<CardContent className="grid min-h-75 grid-cols-[52px_1fr] p-0">
								<aside className="flex flex-col items-center gap-5 border-r border-slate-700/70 bg-slate-950/40 py-5">
									<Code2 className="size-4 text-blue-400" />
									<span className="size-4 rounded bg-blue-500" />
									<span className="size-4 rounded bg-slate-700" />
									<span className="size-4 rounded bg-slate-700" />
									<span className="mt-auto grid size-6 place-items-center rounded-full bg-orange-300 text-[7px] font-bold text-slate-900">
										AM
									</span>
								</aside>
								<div className="p-5">
									<div className="flex items-start justify-between">
										<div>
											<p className="font-mono text-[9px] tracking-widest text-slate-500">
												PROJECT
											</p>
											<h2 className="mt-1 text-sm font-semibold">
												Website redesign
											</h2>
										</div>
										<Button size="xs">+ New task</Button>
									</div>
									<div className="mt-5 h-1 rounded-full bg-slate-800">
										<div className="h-full w-[62%] rounded-full bg-blue-400" />
									</div>
									<div className="mt-5 grid gap-3 sm:grid-cols-3">
										<TaskColumn
											title="Planning"
											color="bg-cyan-400"
											tasks={["Define scope", "Create brief"]}
										/>
										<TaskColumn
											title="In progress"
											color="bg-violet-400"
											tasks={["Homepage", "Design system"]}
										/>
										<TaskColumn
											title="Review"
											color="bg-amber-400"
											tasks={["Mobile layout", "Copy review"]}
										/>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card className="absolute -bottom-7 -left-3 border-slate-700 bg-slate-900 p-3 shadow-xl sm:-left-8">
							<div className="flex items-center gap-3">
								<span className="grid size-9 place-items-center rounded-md bg-blue-500">
									<Layers3 className="size-4" />
								</span>
								<div>
									<p className="font-mono text-[9px] tracking-wider text-slate-500">
										FLAGSHIP PROJECT
									</p>
									<p className="mt-1 text-xs font-semibold">
										Project-management SaaS
									</p>
								</div>
							</div>
						</Card>
					</div>
				</section>
			</div>

			<section className="border-y border-slate-800 bg-slate-950/50">
				<div className="mx-auto grid max-w-6xl md:grid-cols-3">
					{[
						"Real projects, not filler exercises",
						"Modern tools used by working developers",
						"Clear skills you can put to work",
					].map((item, index) => (
						<div
							className="flex items-center gap-3 border-slate-800 px-6 py-5 text-sm text-slate-400 not-last:border-b md:border-r md:not-last:border-b-0"
							key={item}
						>
							<span className="font-mono text-xs text-blue-400">
								0{index + 1}
							</span>
							{item}
						</div>
					))}
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-5 py-24 sm:px-8" id="courses">
				<div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
					<div>
						<p className="font-mono text-xs tracking-widest text-blue-400">
							START BUILDING
						</p>
						<h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
							Courses that leave you with more than a certificate.
						</h2>
					</div>
					<Button asChild variant="link" className="text-slate-300">
						<a href="#paths">
							View all courses <ArrowRight />
						</a>
					</Button>
				</div>
				<div className="grid gap-5 md:grid-cols-3">
					{courses.map((course) => (
						<Card
							className="overflow-hidden border-slate-800 bg-slate-900/65 transition hover:-translate-y-1 hover:border-blue-500/50"
							key={course.title}
						>
							<div className={`h-38 bg-linear-to-br ${course.color} p-5`}>
								<div className="flex h-full items-end rounded-md border border-white/10 bg-slate-950/25 p-3 font-mono text-sm text-blue-100/90">
									<Terminal className="mr-2 size-4 text-blue-300" />
									&lt;build /&gt;
								</div>
							</div>
							<CardHeader>
								<div className="flex gap-2 text-xs text-slate-400">
									<span>{course.level}</span>
									<span>•</span>
									<span>{course.duration}</span>
								</div>
								<CardTitle className="mt-3 text-xl">{course.title}</CardTitle>
								<CardDescription>
									Build a useful project while mastering the tools teams rely
									on.
								</CardDescription>
							</CardHeader>
							<CardFooter className="justify-between">
								<div className="flex flex-wrap gap-1">
									{course.tags.map((tag) => (
										<Badge
											key={tag}
											variant="secondary"
											className="bg-slate-800 text-[10px] text-blue-200"
										>
											{tag}
										</Badge>
									))}
								</div>
								<span className="font-semibold">{course.price}</span>
							</CardFooter>
						</Card>
					))}
				</div>
			</section>

			<section className="border-t border-slate-800 bg-slate-950/30" id="paths">
				<div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.8fr_1.2fr]">
					<div>
						<p className="font-mono text-xs tracking-widest text-blue-400">
							FIND YOUR WAY IN
						</p>
						<h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
							Start where you are.
							<br />
							<span className="text-blue-400">Keep moving forward.</span>
						</h2>
						<p className="mt-6 max-w-sm leading-7 text-slate-400">
							Follow a focused path, or browse the catalogue when curiosity
							takes the wheel.
						</p>
					</div>
					<div>
						{[
							["01", "Starting from zero", "HTML, CSS & JavaScript"],
							["02", "Building interfaces", "React & modern frontend"],
							["03", "Going full-stack", "Node.js, APIs & databases"],
						].map(([number, name, detail], index) => (
							<a
								className={`group grid grid-cols-[42px_1fr_auto] items-center gap-3 border-t border-slate-800 py-6 transition ${index === 2 ? "border-l-2 border-l-blue-500 bg-blue-500/5 pl-4" : ""}`}
								href="#courses"
								key={number}
							>
								<span className="font-mono text-xs text-blue-400">
									{number}
								</span>
								<div>
									<h3 className="font-semibold">{name}</h3>
									<p className="mt-1 text-sm text-slate-500">{detail}</p>
								</div>
								<ArrowRight className="size-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-blue-400" />
							</a>
						))}
					</div>
				</div>
			</section>

			<section
				className="relative overflow-hidden border-t border-slate-800 px-5 py-24 text-center sm:px-8"
				id="about"
			>
				<div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,.08)_1px,transparent_1px)] bg-size-[48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
				<div className="relative mx-auto max-w-xl">
					<p className="font-mono text-xs tracking-widest text-blue-400">
						YOUR NEXT PROJECT STARTS HERE
					</p>
					<h2 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
						Write code.
						<br />
						<span className="text-blue-400">Make it real.</span>
					</h2>
					<Button
						asChild
						size="lg"
						className="mt-8 bg-blue-500 text-white hover:bg-blue-400"
					>
						<a href="#courses">
							Browse courses <ArrowRight />
						</a>
					</Button>
				</div>
			</section>

			<footer className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
				<a
					className="flex items-center gap-2 font-semibold text-slate-200"
					href="#top"
				>
					<Code2 className="size-4 text-blue-400" />
					DevLMS
				</a>
				<span>© 2026 DevLMS. Learn by building.</span>
				<div className="flex gap-4">
					<a href="#privacy">Privacy</a>
					<a href="#terms">Terms</a>
					<GitBranch className="size-4" />
				</div>
			</footer>
		</main>
	);
}

function TechMark({ label, color }: { label: string; color: string }) {
	return (
		<span
			className={`grid size-7 place-items-center rounded-md border-2 border-[#080d1a] text-[9px] font-bold ${color}`}
		>
			{label}
		</span>
	);
}
function TaskColumn({
	title,
	color,
	tasks,
}: {
	title: string;
	color: string;
	tasks: string[];
}) {
	return (
		<div>
			<p className="mb-2 flex items-center gap-1.5 text-[9px] text-slate-400">
				<i className={`size-1.5 rounded-full ${color}`} />
				{title}
			</p>
			{tasks.map((task) => (
				<div
					className="mb-2 rounded bg-slate-800/80 p-2 text-[9px] text-slate-300"
					key={task}
				>
					<Check className="mr-1 inline size-2.5 text-emerald-400" />
					{task}
				</div>
			))}
		</div>
	);
}
