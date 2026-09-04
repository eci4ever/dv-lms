import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BookOpenText, Check, Clock3, Eye, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedCourse } from "@/lib/catalogue.functions";

export const Route = createFileRoute("/courses/$courseSlug")({
	loader: async ({ params }) => {
		const data = await getPublishedCourse({
			data: { slug: params.courseSlug },
		});
		if (!data) throw notFound();
		return data;
	},
	component: CourseDetailPage,
});

function formatPrice(priceSen: number) {
	if (priceSen === 0) return "Free";
	return new Intl.NumberFormat("en-MY", {
		style: "currency",
		currency: "MYR",
	}).format(priceSen / 100);
}

function CourseDetailPage() {
	const { course, curriculum, enrollmentTotal, level } = Route.useLoaderData();
	return (
		<main className="dark min-h-screen bg-[#080d1a] text-white">
			<header className="border-b border-slate-800 bg-[#0b1327]/90">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
					<Link className="font-semibold" to="/">
						DevLMS
					</Link>
					<Link
						className="text-sm text-slate-400 hover:text-white"
						to="/courses"
					>
						All courses
					</Link>
				</div>
			</header>
			<section className="border-b border-slate-800 bg-gradient-to-br from-blue-500/15 via-[#080d1a] to-cyan-400/5">
				<div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1fr_320px] lg:py-20">
					<div>
						<Badge>{formatPrice(course.priceSen)}</Badge>
						<h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
							{course.title}
						</h1>
						<p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
							{course.description}
						</p>
						<div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-400">
							<span className="flex items-center gap-2">
								<Clock3 className="size-4" />
								{course.duration}
							</span>
							<span className="flex items-center gap-2">
								<BookOpenText className="size-4" />
								{curriculum.length} lessons
							</span>
							<span className="flex items-center gap-2">
								<Users className="size-4" />
								{enrollmentTotal} learners
							</span>
						</div>
					</div>
					<aside className="rounded-2xl border border-slate-700 bg-slate-900/75 p-6">
						<p className="text-sm text-slate-400">Course level</p>
						<p className="mt-1 text-xl font-semibold">{level}</p>
						<Button
							asChild
							className="mt-6 w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
						>
							<Link
								params={{ courseSlug: course.slug }}
								to="/learn/$courseSlug"
							>
								{course.priceSen === 0
									? "Start free course"
									: "View enrollment"}
							</Link>
						</Button>
						<p className="mt-4 text-center text-xs text-slate-500">
							Progress is saved to your account.
						</p>
					</aside>
				</div>
			</section>
			<section className="mx-auto max-w-6xl px-5 py-14">
				<div className="grid gap-10 lg:grid-cols-[1fr_320px]">
					<div>
						<p className="font-mono text-xs tracking-widest text-cyan-400">
							CURRICULUM
						</p>
						<h2 className="mt-2 text-2xl font-semibold">What you will learn</h2>
						<div className="mt-6 space-y-3">
							{curriculum.map((item) => (
								<article
									className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/35 p-5"
									key={item.id}
								>
									<span className="grid size-8 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-sm text-cyan-300">
										{item.position}
									</span>
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="font-medium">{item.title}</h3>
											{item.isPreview && (
												<Badge variant="outline">
													<Eye className="size-3" /> Preview
												</Badge>
											)}
										</div>
										<p className="mt-1 text-sm leading-6 text-slate-400">
											{item.description}
										</p>
										<p className="mt-2 text-xs capitalize text-slate-500">
											{item.contentType} · {item.duration}
										</p>
									</div>
								</article>
							))}
						</div>
					</div>
					<aside>
						<p className="font-mono text-xs tracking-widest text-cyan-400">
							OUTCOMES
						</p>
						<ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
							<li className="flex gap-2">
								<Check className="mt-1 size-4 shrink-0 text-cyan-400" />
								Complete a structured, practical curriculum.
							</li>
							<li className="flex gap-2">
								<Check className="mt-1 size-4 shrink-0 text-cyan-400" />
								Check your understanding with lesson activities.
							</li>
							<li className="flex gap-2">
								<Check className="mt-1 size-4 shrink-0 text-cyan-400" />
								Resume learning where you last stopped.
							</li>
						</ul>
					</aside>
				</div>
			</section>
		</main>
	);
}
