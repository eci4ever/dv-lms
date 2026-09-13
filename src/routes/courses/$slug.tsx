import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
	BookOpenCheckIcon,
	BookOpenIcon,
	Clock3Icon,
	Globe2Icon,
	GraduationCapIcon,
	Layers3Icon,
	PlayCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	categoryLabel,
	formatCoursePrice,
	levelLabel,
} from "@/lib/course-types";
import { getPublicCourse } from "@/lib/courses.functions";

export const Route = createFileRoute("/courses/$slug")({
	loader: async ({ params }) => {
		const course = await getPublicCourse({ data: { slug: params.slug } });
		if (!course) throw notFound();
		return course;
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData ? `${loaderData.title} | DV LMS` : "Course | DV LMS",
			},
			{
				name: "description",
				content: loaderData?.summary ?? "Explore this DV LMS course.",
			},
		],
	}),
	component: PublicCourseDetail,
});

function PublicCourseDetail() {
	const course = Route.useLoaderData();

	return (
		<main className="min-h-svh bg-background">
			<header className="border-b">
				<div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8">
					<Link
						to="/"
						className="flex items-center gap-2.5 font-semibold tracking-tight"
					>
						<span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
							<BookOpenCheckIcon className="size-4" />
						</span>
						DV LMS
					</Link>
					<Link
						to="/courses"
						className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground"
					>
						Browse courses
					</Link>
				</div>
			</header>

			<section className="border-b bg-muted/30">
				<div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-14">
					<div className="max-w-3xl">
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">
								{categoryLabel(course.category)}
							</Badge>
							<Badge variant="outline">{levelLabel(course.level)}</Badge>
						</div>
						<h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
							{course.title}
						</h1>
						<p className="mt-4 text-lg leading-8 text-muted-foreground">
							{course.summary}
						</p>
						<div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
							<span className="flex items-center gap-2">
								<GraduationCapIcon className="size-4" />
								{course.creatorName}
							</span>
							<span className="flex items-center gap-2">
								<BookOpenIcon className="size-4" />
								{course.organizationName}
							</span>
							<span className="flex items-center gap-2">
								<Globe2Icon className="size-4" />
								{course.language}
							</span>
							<span className="flex items-center gap-2">
								<Clock3Icon className="size-4" />
								{course.durationMinutes} minutes
							</span>
						</div>
					</div>
					<Card className="self-start py-0 shadow-md">
						<div className="aspect-video overflow-hidden rounded-t-xl bg-muted">
							{course.thumbnailUrl ? (
								<img
									src={course.thumbnailUrl}
									alt=""
									className="size-full object-cover"
								/>
							) : (
								<div className="grid size-full place-items-center">
									<BookOpenIcon className="size-10 text-muted-foreground" />
								</div>
							)}
						</div>
						<CardContent className="space-y-4 p-5">
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-semibold">
									{formatCoursePrice(course.priceInSen)}
								</span>
								{course.originalPriceInSen ? (
									<span className="text-sm text-muted-foreground line-through">
										{formatCoursePrice(course.originalPriceInSen)}
									</span>
								) : null}
							</div>
							<Link
								to="/login"
								search={{}}
								className={buttonVariants({ size: "lg", className: "w-full" })}
							>
								{course.priceInSen === 0
									? "Sign in to enroll"
									: "Sign in to continue"}
							</Link>
							<p className="text-center text-xs text-muted-foreground">
								Enrollment and checkout will be available in the next phase.
							</p>
						</CardContent>
					</Card>
				</div>
			</section>

			<div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
				<div className="space-y-10">
					<section>
						<h2 className="text-xl font-semibold">About this course</h2>
						<div className="mt-4 space-y-4 leading-7 text-muted-foreground">
							{course.description.split(/\n{2,}/).map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					</section>
					<section>
						<div className="flex items-end justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold">Course curriculum</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									{course.sections.length} sections · {course.lessonCount}{" "}
									lessons
								</p>
							</div>
						</div>
						<div className="mt-4 overflow-hidden rounded-xl border bg-card">
							{course.sections.map((section, sectionIndex) => (
								<div
									key={section.id}
									className={sectionIndex ? "border-t" : undefined}
								>
									<div className="flex items-center gap-3 bg-muted/40 px-4 py-3">
										<Layers3Icon className="size-4" />
										<p className="font-medium">{section.title}</p>
										<span className="ml-auto text-xs text-muted-foreground">
											{section.lessons.length} lessons
										</span>
									</div>
									<div className="divide-y">
										{section.lessons.map((lesson) => (
											<div
												key={lesson.id}
												className="flex items-center gap-3 px-4 py-3 text-sm"
											>
												<PlayCircleIcon className="size-4 text-muted-foreground" />
												<span>{lesson.title}</span>
												<span className="ml-auto text-xs text-muted-foreground">
													{lesson.durationMinutes} min
												</span>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</section>
				</div>
				<aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
					<Card>
						<CardHeader>
							<CardTitle>Course details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="flex justify-between gap-4">
								<span className="text-muted-foreground">Level</span>
								<span>{levelLabel(course.level)}</span>
							</div>
							<Separator />
							<div className="flex justify-between gap-4">
								<span className="text-muted-foreground">Language</span>
								<span>{course.language}</span>
							</div>
							<Separator />
							<div className="flex justify-between gap-4">
								<span className="text-muted-foreground">Lessons</span>
								<span>{course.lessonCount}</span>
							</div>
						</CardContent>
					</Card>
				</aside>
			</div>
		</main>
	);
}
