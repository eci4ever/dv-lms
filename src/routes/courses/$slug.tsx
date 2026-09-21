import {
	createFileRoute,
	Link,
	notFound,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import {
	BookOpenCheckIcon,
	BookOpenIcon,
	Clock3Icon,
	Globe2Icon,
	GraduationCapIcon,
	Layers3Icon,
	LoaderCircleIcon,
	PlayCircleIcon,
	StarIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { createCheckout } from "@/lib/commerce.functions";
import {
	categoryLabel,
	formatCoursePrice,
	levelLabel,
} from "@/lib/course-types";
import { getPublicCourse } from "@/lib/courses.functions";
import {
	enrollInFreeCourse,
	getEnrollmentState,
} from "@/lib/learning.functions";
import {
	deleteCourseReview,
	getMyCourseReview,
	getPublicCourseReviews,
	saveCourseReview,
} from "@/lib/review.functions";

export const Route = createFileRoute("/courses/$slug")({
	loader: async ({ params }) => {
		const course = await getPublicCourse({ data: { slug: params.slug } });
		if (!course) throw notFound();
		const [enrollmentState, reviewData, myReview] = await Promise.all([
			getEnrollmentState({ data: { slug: params.slug } }),
			getPublicCourseReviews({ data: { courseId: course.id } }),
			getMyCourseReview({ data: { courseId: course.id } }),
		]);
		if (!reviewData) throw notFound();
		return { course, enrollmentState, reviewData, myReview };
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `${loaderData.course.title} | DV LMS`
					: "Course | DV LMS",
			},
			{
				name: "description",
				content: loaderData?.course.summary ?? "Explore this DV LMS course.",
			},
		],
	}),
	component: PublicCourseDetail,
});

function PublicCourseDetail() {
	const { course, enrollmentState, reviewData, myReview } =
		Route.useLoaderData();

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
							<Link
								to="/creators/$slug"
								params={{ slug: course.organizationSlug }}
								className="flex items-center gap-2 hover:text-foreground"
							>
								<BookOpenIcon className="size-4" />
								{course.organizationName}
							</Link>
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
									{formatCoursePrice(
										course.defaultOfferPriceInSen ?? course.priceInSen,
									)}
								</span>
								{course.originalPriceInSen ? (
									<span className="text-sm text-muted-foreground line-through">
										{formatCoursePrice(course.originalPriceInSen)}
									</span>
								) : null}
							</div>
							<EnrollmentAction
								slug={course.slug}
								priceInSen={course.priceInSen}
								offerId={course.defaultOfferId}
								state={enrollmentState}
							/>
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
					<CourseReviews
						courseId={course.id}
						data={reviewData}
						myReview={myReview}
					/>
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

function Stars({ rating, size = "size-4" }: { rating: number; size?: string }) {
	return (
		<span
			className="inline-flex gap-0.5"
			role="img"
			aria-label={`${rating} out of 5 stars`}
		>
			{[1, 2, 3, 4, 5].map((star) => (
				<StarIcon
					key={star}
					className={`${size} ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
				/>
			))}
		</span>
	);
}

function CourseReviews({
	courseId,
	data,
	myReview,
}: {
	courseId: string;
	data: NonNullable<Awaited<ReturnType<typeof getPublicCourseReviews>>>;
	myReview: Awaited<ReturnType<typeof getMyCourseReview>>;
}) {
	const router = useRouter();
	const [rating, setRating] = useState(myReview.review?.rating ?? 5);
	const [content, setContent] = useState(myReview.review?.content ?? "");
	const [busy, setBusy] = useState(false);
	async function save(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		try {
			await saveCourseReview({ data: { courseId, rating, content } });
			toast.success(myReview.review ? "Review updated." : "Review published.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to save review.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function remove() {
		if (!myReview.review) return;
		setBusy(true);
		try {
			await deleteCourseReview({ data: { id: myReview.review.id } });
			toast.success("Review deleted.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to delete review.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">Learner reviews</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Reviews from learners with verified course access.
				</p>
			</div>
			<div className="grid gap-6 sm:grid-cols-[180px_1fr]">
				<Card>
					<CardContent className="space-y-3 p-5 text-center">
						<p className="text-4xl font-semibold">{data.average.toFixed(1)}</p>
						<Stars rating={Math.round(data.average)} />
						<p className="text-xs text-muted-foreground">
							{data.count} reviews
						</p>
						<div className="space-y-1.5 pt-2 text-xs">
							{[5, 4, 3, 2, 1].map((star) => (
								<div key={star} className="flex items-center gap-2">
									<span className="w-4">{star}</span>
									<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full bg-amber-400"
											style={{
												width: `${data.count ? (Number(data.distribution[star]) / data.count) * 100 : 0}%`,
											}}
										/>
									</div>
									<span className="w-5 text-right text-muted-foreground">
										{Number(data.distribution[star])}
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
				{myReview.eligible ? (
					<Card>
						<CardHeader>
							<CardTitle>
								{myReview.review ? "Edit your review" : "Write a review"}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form className="space-y-4" onSubmit={save}>
								<div className="flex gap-1">
									{[1, 2, 3, 4, 5].map((star) => (
										<button
											key={star}
											type="button"
											aria-label={`Rate ${star} stars`}
											onClick={() => setRating(star)}
										>
											<StarIcon
												className={`size-6 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
											/>
										</button>
									))}
								</div>
								<textarea
									className="min-h-28 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
									minLength={20}
									maxLength={2000}
									required
									value={content}
									onChange={(event) => setContent(event.target.value)}
									placeholder="Share what you learned and who this course is for."
								/>
								<div className="flex flex-wrap gap-2">
									<Button type="submit" disabled={busy}>
										{myReview.review ? "Update review" : "Publish review"}
									</Button>
									{myReview.review ? (
										<Dialog>
											<DialogTrigger
												render={
													<Button
														type="button"
														variant="outline"
														disabled={busy}
													/>
												}
											>
												<Trash2Icon /> Delete
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Delete your review?</DialogTitle>
													<DialogDescription>
														This permanently removes your rating and review.
													</DialogDescription>
												</DialogHeader>
												<DialogFooter>
													<DialogClose render={<Button variant="outline" />}>
														Cancel
													</DialogClose>
													<Button variant="destructive" onClick={remove}>
														Delete review
													</Button>
												</DialogFooter>
											</DialogContent>
										</Dialog>
									) : null}
								</div>
							</form>
						</CardContent>
					</Card>
				) : null}
			</div>
			<div className="space-y-4">
				{data.reviews.length ? (
					data.reviews.map((review) => (
						<Card key={review.id}>
							<CardContent className="flex gap-4 p-5">
								<Avatar>
									<AvatarImage src={review.userImage ?? undefined} />
									<AvatarFallback>
										{review.userName.slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="font-medium">{review.userName}</p>
										<Badge variant="secondary">Verified learner</Badge>
									</div>
									<div className="mt-1 flex items-center gap-2">
										<Stars rating={review.rating} size="size-3.5" />
										<span className="text-xs text-muted-foreground">
											{new Intl.DateTimeFormat(undefined, {
												dateStyle: "medium",
											}).format(review.updatedAt)}
										</span>
									</div>
									<p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
										{review.content}
									</p>
								</div>
							</CardContent>
						</Card>
					))
				) : (
					<p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
						No reviews yet. Be the first learner to share your experience.
					</p>
				)}
			</div>
		</section>
	);
}

function EnrollmentAction({
	slug,
	priceInSen,
	offerId,
	state,
}: {
	slug: string;
	priceInSen: number;
	offerId: string | null;
	state: Awaited<ReturnType<typeof getEnrollmentState>>;
}) {
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);

	if (!state.signedIn) {
		return (
			<>
				<Link
					to="/login"
					className={buttonVariants({ size: "lg", className: "w-full" })}
				>
					Sign in to enroll
				</Link>
				<p className="text-center text-xs text-muted-foreground">
					Create an account or sign in to start learning.
				</p>
			</>
		);
	}

	if (state.enrollment) {
		return state.enrollment.firstLessonId ? (
			<Button
				render={
					<Link
						to="/learning/$slug/$lessonId"
						params={{
							slug,
							lessonId: state.enrollment.firstLessonId,
						}}
					/>
				}
				size="lg"
				className="w-full"
			>
				Continue learning
			</Button>
		) : (
			<Button size="lg" className="w-full" disabled>
				No lessons available
			</Button>
		);
	}

	async function startCheckout() {
		setBusy(true);
		try {
			if (!offerId)
				throw new Error("No active offer is available for this course.");
			const result = await createCheckout({ data: { offerId } });
			await navigate({
				to: "/checkout/$orderId",
				params: { orderId: result.orderId },
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to start checkout.",
			);
		} finally {
			setBusy(false);
		}
	}

	if (priceInSen > 0) {
		return (
			<>
				<Button
					size="lg"
					className="w-full"
					disabled={busy}
					onClick={startCheckout}
				>
					{busy ? <LoaderCircleIcon className="animate-spin" /> : null}
					Buy now
				</Button>
				<p className="text-center text-xs text-muted-foreground">
					Mock checkout for testing. No money will be charged.
				</p>
			</>
		);
	}

	async function enroll() {
		setBusy(true);
		try {
			const result = await enrollInFreeCourse({ data: { slug } });
			toast.success("You are enrolled in this course.");
			if (result.firstLessonId) {
				await navigate({
					to: "/learning/$slug/$lessonId",
					params: { slug, lessonId: result.firstLessonId },
				});
			} else {
				await navigate({ to: "/library" });
			}
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to enroll in the course.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Button size="lg" className="w-full" disabled={busy} onClick={enroll}>
			{busy ? <LoaderCircleIcon className="animate-spin" /> : null}
			Enroll for free
		</Button>
	);
}
