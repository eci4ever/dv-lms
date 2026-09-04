import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenText, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedCourses } from "@/lib/catalogue.functions";

export const Route = createFileRoute("/courses")({
	loader: () => getPublishedCourses(),
	component: CoursesPage,
});

function formatPrice(priceSen: number) {
	if (priceSen === 0) return "Free";
	return new Intl.NumberFormat("en-MY", {
		style: "currency",
		currency: "MYR",
	}).format(priceSen / 100);
}

function CoursesPage() {
	const courses = Route.useLoaderData();
	return (
		<main className="dark min-h-screen bg-[#080d1a] text-white">
			<header className="border-b border-slate-800 bg-[#0b1327]/90">
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
					<Link className="font-semibold" to="/">
						DevLMS
					</Link>
					<Button asChild size="sm" variant="outline">
						<Link to="/dashboard">My learning</Link>
					</Button>
				</div>
			</header>
			<section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
				<p className="font-mono text-xs tracking-widest text-cyan-400">
					COURSE CATALOGUE
				</p>
				<h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
					Practical skills for your next technical role.
				</h1>
				<p className="mt-4 max-w-2xl leading-7 text-slate-400">
					Choose a focused course, learn at your pace, and keep your progress
					across every session.
				</p>
				<div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{courses.map((item) => (
						<article
							className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/45"
							key={item.id}
						>
							{item.thumbnailUrl ? (
								<img
									alt=""
									className="aspect-video w-full object-cover"
									src={item.thumbnailUrl}
								/>
							) : (
								<div className="grid aspect-video place-items-center bg-gradient-to-br from-blue-500/20 to-cyan-400/5">
									<BookOpenText className="size-10 text-cyan-300" />
								</div>
							)}
							<div className="p-6">
								<div className="flex items-center justify-between gap-3">
									<Badge>{formatPrice(item.priceSen)}</Badge>
									<span className="flex items-center gap-1 text-xs text-slate-500">
										<Clock3 className="size-3" /> {item.duration}
									</span>
								</div>
								<h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
								<p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
									{item.description}
								</p>
								<p className="mt-4 text-xs text-slate-500">
									Beginner · {item.lessonCount} lessons
								</p>
								<Button asChild className="mt-5 w-full">
									<Link
										params={{ courseSlug: item.slug }}
										to="/courses/$courseSlug"
									>
										View course <ArrowRight className="size-4" />
									</Link>
								</Button>
							</div>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}
