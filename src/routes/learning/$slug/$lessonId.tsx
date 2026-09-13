import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	CheckCircle2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	Clock3Icon,
	LoaderCircleIcon,
	PlayCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	getLearningCourse,
	updateLessonProgress,
} from "@/lib/learning.functions";

export const Route = createFileRoute("/learning/$slug/$lessonId")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		return dashboard;
	},
	loader: ({ params }) =>
		getLearningCourse({
			data: { slug: params.slug, lessonId: params.lessonId },
		}),
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `${loaderData.selectedLesson.title} | DV LMS`
					: "Course lesson | DV LMS",
			},
		],
	}),
	component: LessonPlayer,
});

function errorMessage(error: unknown) {
	return error instanceof Error && error.message
		? error.message
		: "Unable to update lesson progress.";
}

function LessonPlayer() {
	const course = Route.useLoaderData();
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [positionSeconds, setPositionSeconds] = useState(
		course.selectedLesson.positionSeconds ?? 0,
	);
	const lessons = useMemo(
		() => course.sections.flatMap((section) => section.lessons),
		[course.sections],
	);
	const currentIndex = lessons.findIndex(
		(lesson) => lesson.id === course.selectedLesson.id,
	);
	const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
	const nextLesson =
		currentIndex >= 0 && currentIndex < lessons.length - 1
			? lessons[currentIndex + 1]
			: null;
	const completed = Boolean(course.selectedLesson.completedAt);

	async function updateProgress(nextCompleted: boolean) {
		setBusy(true);
		try {
			await updateLessonProgress({
				data: {
					lessonId: course.selectedLesson.id,
					completed: nextCompleted,
					positionSeconds: Math.floor(positionSeconds),
				},
			});
			toast.success(
				nextCompleted ? "Lesson marked complete." : "Lesson progress updated.",
			);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(errorMessage(error));
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="min-h-svh bg-muted/30">
			<header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
				<div className="flex h-16 items-center gap-3 px-4 sm:px-6">
					<Button
						render={<Link to="/learning" />}
						variant="ghost"
						size="icon"
						aria-label="Back to My Learning"
					>
						<ArrowLeftIcon />
					</Button>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium">{course.title}</p>
						<p className="truncate text-xs text-muted-foreground">
							{course.organizationName}
						</p>
					</div>
					<Badge className="ml-auto" variant="secondary">
						{lessons.filter((lesson) => lesson.completedAt).length}/
						{lessons.length} complete
					</Badge>
				</div>
			</header>

			<div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1fr)_340px]">
				<div className="min-w-0 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-5xl space-y-6">
						<div className="overflow-hidden rounded-xl border bg-black shadow-sm">
							{course.selectedLesson.videoUrl ? (
								<video
									key={course.selectedLesson.id}
									className="aspect-video w-full"
									controls
									src={course.selectedLesson.videoUrl}
									onLoadedMetadata={(event) => {
										if (positionSeconds > 0) {
											event.currentTarget.currentTime = positionSeconds;
										}
									}}
									onTimeUpdate={(event) =>
										setPositionSeconds(event.currentTarget.currentTime)
									}
								>
									<track kind="captions" />
								</video>
							) : (
								<div className="grid aspect-video place-items-center text-center text-white">
									<div>
										<PlayCircleIcon className="mx-auto size-12 opacity-70" />
										<p className="mt-3 text-sm text-white/70">
											This lesson has no video.
										</p>
									</div>
								</div>
							)}
						</div>

						<Card>
							<CardHeader className="gap-3">
								<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<Clock3Icon className="size-3.5" />
									{course.selectedLesson.durationMinutes} minutes
									{completed ? (
										<Badge variant="secondary">Completed</Badge>
									) : null}
								</div>
								<CardTitle className="text-2xl">
									{course.selectedLesson.title}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{course.selectedLesson.content ? (
									<div className="space-y-4 leading-7 text-muted-foreground">
										{course.selectedLesson.content
											.split(/\n{2,}/)
											.map((paragraph) => (
												<p key={paragraph}>{paragraph}</p>
											))}
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										No lesson notes have been added.
									</p>
								)}
								<Separator />
								<div className="flex flex-wrap items-center gap-2">
									<Button
										variant={completed ? "outline" : "default"}
										disabled={busy}
										onClick={() => updateProgress(!completed)}
									>
										{busy ? (
											<LoaderCircleIcon className="animate-spin" />
										) : completed ? (
											<CircleIcon />
										) : (
											<CheckCircle2Icon />
										)}
										{completed ? "Mark incomplete" : "Mark complete"}
									</Button>
									{course.selectedLesson.videoUrl ? (
										<Button
											variant="ghost"
											disabled={busy}
											onClick={() => updateProgress(completed)}
										>
											Save video position
										</Button>
									) : null}
									<div className="ml-auto flex gap-2">
										<Button
											render={
												previousLesson ? (
													<Link
														to="/learning/$slug/$lessonId"
														params={{
															slug: course.slug,
															lessonId: previousLesson.id,
														}}
													/>
												) : undefined
											}
											variant="outline"
											disabled={!previousLesson}
										>
											<ChevronLeftIcon /> Previous
										</Button>
										<Button
											render={
												nextLesson ? (
													<Link
														to="/learning/$slug/$lessonId"
														params={{
															slug: course.slug,
															lessonId: nextLesson.id,
														}}
													/>
												) : undefined
											}
											disabled={!nextLesson}
										>
											Next <ChevronRightIcon />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

				<aside className="border-t bg-background lg:border-t-0 lg:border-l">
					<div className="sticky top-16 max-h-[calc(100svh-4rem)] overflow-y-auto p-4">
						<h2 className="font-semibold">Course content</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							{lessons.length} lessons
						</p>
						<div className="mt-4 space-y-4">
							{course.sections.map((section) => (
								<section key={section.id}>
									<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{section.title}
									</p>
									<div className="space-y-1">
										{section.lessons.map((lesson) => (
											<Link
												key={lesson.id}
												to="/learning/$slug/$lessonId"
												params={{ slug: course.slug, lessonId: lesson.id }}
												className={`flex gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted ${
													lesson.id === course.selectedLesson.id
														? "bg-muted font-medium"
														: ""
												}`}
											>
												{lesson.completedAt ? (
													<CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
												) : (
													<CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
												)}
												<span>{lesson.title}</span>
											</Link>
										))}
									</div>
								</section>
							))}
						</div>
					</div>
				</aside>
			</div>
		</main>
	);
}
