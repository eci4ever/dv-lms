import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	AlertCircle,
	BookOpenText,
	Check,
	CheckCircle2,
	ChevronLeft,
	Clock3,
	FileDown,
	HelpCircle,
	Play,
	RotateCcw,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	completeLesson,
	enrollInFreeCourse,
	getMyCourse,
	recordLessonAccess,
	submitQuiz,
} from "@/lib/learning.functions";
import { getYouTubeEmbedUrl, parseStudentQuiz } from "@/lib/lesson-content";
import { sessionQueryOptions } from "@/lib/session.query";

export const Route = createFileRoute("/learn/$courseSlug")({
	beforeLoad: async ({ context }) => {
		const session =
			await context.queryClient.ensureQueryData(sessionQueryOptions);
		if (!session) throw redirect({ to: "/login" });
	},
	loader: ({ params }) =>
		getMyCourse({ data: { courseSlug: params.courseSlug } }),
	component: LearnPage,
});

function LearnPage() {
	const courseData = Route.useLoaderData();
	const { courseSlug } = Route.useParams();
	const router = useRouter();
	const initialLessonIndex = Math.max(
		0,
		courseData.lessons.findIndex(
			(lesson) => lesson.id === courseData.resumeLessonId,
		),
	);
	const [activeLessonIndex, setActiveLessonIndex] =
		useState(initialLessonIndex);
	const [isCompleting, setIsCompleting] = useState(false);
	const [isEnrolling, setIsEnrolling] = useState(false);
	const activeLesson = courseData.lessons[activeLessonIndex];

	useEffect(() => {
		if (!activeLesson) return;
		recordLessonAccess({ data: activeLesson.id }).catch(() => undefined);
	}, [activeLesson]);

	async function handleFreeEnrollment() {
		setIsEnrolling(true);
		try {
			await enrollInFreeCourse({ data: { courseSlug } });
			await router.invalidate({ sync: true });
			toast.success("Course added", {
				description: "Your first lesson is ready.",
			});
		} catch (error) {
			toast.error("Unable to start course", {
				description:
					error instanceof Error ? error.message : "Please try again shortly.",
			});
		} finally {
			setIsEnrolling(false);
		}
	}

	if (!courseData.enrolled) {
		return (
			<main className="dark grid min-h-screen place-items-center bg-[#080d1a] p-6 text-white">
				<div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
					<p className="font-mono text-xs tracking-widest text-cyan-400">
						FREE COURSE
					</p>
					<h1 className="mt-3 text-2xl font-semibold">
						Start {courseData.course.title}
					</h1>
					<p className="mt-3 leading-7 text-slate-400">
						Add this course to your learning space and start the first lesson
						now.
					</p>
					<Button
						className="mt-6 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
						disabled={isEnrolling}
						onClick={handleFreeEnrollment}
					>
						{isEnrolling ? "Adding course..." : "Start free course"}
					</Button>
				</div>
			</main>
		);
	}

	const progress = Math.round(
		(courseData.completedLessonIds.length / courseData.lessons.length) * 100,
	);
	const isComplete = courseData.completedLessonIds.includes(activeLesson.id);

	async function handleCompleteLesson() {
		if (isComplete) return;
		setIsCompleting(true);
		try {
			await completeLesson({ data: { lessonId: activeLesson.id } });
			await router.invalidate({ sync: true });
			toast.success("Lesson completed", {
				description: "Your course progress has been saved.",
			});
		} catch (error) {
			toast.error("Unable to save progress", {
				description:
					error instanceof Error ? error.message : "Please try again shortly.",
			});
		} finally {
			setIsCompleting(false);
		}
	}

	return (
		<main className="dark min-h-screen bg-[#080d1a] text-white">
			<header className="border-b border-slate-800 bg-[#0b1327]/90">
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
					<Link
						className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
						to="/dashboard"
					>
						<ChevronLeft className="size-4" /> Back to dashboard
					</Link>
					<div className="hidden items-center gap-3 text-sm sm:flex">
						<span className="text-slate-400">Course progress</span>
						<div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
							<div
								className="h-full rounded-full bg-cyan-400"
								style={{ width: `${progress}%` }}
							/>
						</div>
						<span className="font-medium">{progress}%</span>
					</div>
				</div>
			</header>
			<div className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
				<section>
					<LessonContent
						key={activeLesson.id}
						lesson={activeLesson}
						onQuizPassed={async () => {
							await router.invalidate({ sync: true });
						}}
					/>
					<div className="mt-7">
						<p className="font-mono text-xs tracking-widest text-cyan-400">
							LESSON {activeLesson.position}
						</p>
						<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
							{activeLesson.title}
						</h1>
						<p className="mt-3 max-w-2xl leading-7 text-slate-400">
							{activeLesson.description}
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							{activeLesson.contentType !== "quiz" && (
								<Button
									className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
									disabled={isComplete || isCompleting}
									onClick={handleCompleteLesson}
								>
									<Check className="size-4" />
									{isComplete
										? "Completed"
										: isCompleting
											? "Saving..."
											: "Mark as complete"}
								</Button>
							)}
							{activeLesson.attachmentUrl && (
								<Button
									asChild
									className="border-slate-700 text-slate-200"
									variant="outline"
								>
									<a
										href={activeLesson.attachmentUrl}
										rel="noreferrer"
										target="_blank"
									>
										<FileDown className="size-4" /> Download resource
									</a>
								</Button>
							)}
						</div>
					</div>
				</section>
				<aside className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
					<p className="font-mono text-xs tracking-widest text-cyan-400">
						YOUR COURSE
					</p>
					<h2 className="mt-2 text-lg font-semibold">
						{courseData.course.title}
					</h2>
					<div className="mt-5 space-y-2">
						{courseData.lessons.map((lesson, index) => {
							const completed = courseData.completedLessonIds.includes(
								lesson.id,
							);
							const active = index === activeLessonIndex;
							return (
								<button
									className={`flex w-full gap-3 rounded-xl p-3 text-left transition ${active ? "bg-cyan-400/10 ring-1 ring-cyan-400/40" : "hover:bg-slate-800/80"}`}
									key={lesson.id}
									onClick={() => setActiveLessonIndex(index)}
									type="button"
								>
									<span
										className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${completed ? "bg-cyan-400 text-slate-950" : "border border-slate-600 text-slate-400"}`}
									>
										{completed ? (
											<Check className="size-3.5" />
										) : (
											lesson.position
										)}
									</span>
									<span className="min-w-0">
										<span className="block text-sm font-medium text-slate-100">
											{lesson.title}
										</span>
										<span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
											<Clock3 className="size-3" /> {lesson.duration}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				</aside>
			</div>
		</main>
	);
}

type LearningLesson = ReturnType<typeof Route.useLoaderData>["lessons"][number];

function LessonContent({
	lesson,
	onQuizPassed,
}: {
	lesson: LearningLesson;
	onQuizPassed: () => Promise<void>;
}) {
	if (lesson.contentType === "quiz") {
		return (
			<QuizPlayer
				content={lesson.content}
				lessonId={lesson.id}
				onPassed={onQuizPassed}
			/>
		);
	}

	if (lesson.contentType === "article") {
		return <ArticleContent content={lesson.content} />;
	}

	const embedUrl = getYouTubeEmbedUrl(lesson.videoUrl);
	return (
		<div className="space-y-5">
			<div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/30">
				{embedUrl ? (
					<iframe
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
						className="aspect-video w-full"
						referrerPolicy="strict-origin-when-cross-origin"
						src={embedUrl}
						title={lesson.title}
					/>
				) : (
					<div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,.2),transparent_40%),linear-gradient(135deg,#0b1730,#090d18)] p-6 text-center">
						<div>
							<span className="mx-auto grid size-14 place-items-center rounded-full bg-cyan-400/10 text-cyan-300">
								<Play className="size-6" />
							</span>
							<p className="mt-4 font-medium">No video for this lesson</p>
							<p className="mt-1 text-sm text-slate-500">
								Use the notes and downloadable resources below.
							</p>
						</div>
					</div>
				)}
			</div>
			{lesson.content && <ArticleContent content={lesson.content} compact />}
		</div>
	);
}

function ArticleContent({
	compact = false,
	content,
}: {
	compact?: boolean;
	content: string | null;
}) {
	const paragraphs = content
		?.split(/\n\s*\n/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);

	return (
		<article
			className={`rounded-2xl border border-slate-800 bg-slate-900/45 ${compact ? "p-5" : "p-6 md:p-8"}`}
		>
			<div className="flex items-center gap-2 text-cyan-300">
				<BookOpenText className="size-4" />
				<p className="font-mono text-xs tracking-widest">LESSON NOTES</p>
			</div>
			{paragraphs?.length ? (
				<div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-300">
					{paragraphs.map((paragraph) => (
						<p className="whitespace-pre-wrap" key={paragraph}>
							{paragraph}
						</p>
					))}
				</div>
			) : (
				<p className="mt-4 text-sm text-slate-500">
					Lesson notes have not been added yet.
				</p>
			)}
		</article>
	);
}

type QuizResult = Awaited<ReturnType<typeof submitQuiz>>;

function QuizPlayer({
	content,
	lessonId,
	onPassed,
}: {
	content: string | null;
	lessonId: string;
	onPassed: () => Promise<void>;
}) {
	const quiz = parseStudentQuiz(content);
	const submitQuizFn = useServerFn(submitQuiz);
	const [answers, setAnswers] = useState<Record<string, number>>({});
	const [result, setResult] = useState<QuizResult | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const resultByQuestion = new Map(
		result?.results.map((item) => [item.questionId, item]),
	);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		try {
			const nextResult = await submitQuizFn({
				data: {
					lessonId,
					answers: Object.entries(answers).map(([questionId, optionIndex]) => ({
						questionId,
						optionIndex,
					})),
				},
			});
			setResult(nextResult);
			if (nextResult.passed) {
				await onPassed();
				toast.success("Quiz passed", {
					description: `You scored ${nextResult.score}%.`,
				});
			} else {
				toast.error("Keep practising", {
					description: `You need ${nextResult.passingScore}% to pass.`,
				});
			}
		} catch (error) {
			toast.error("Unable to submit quiz", {
				description:
					error instanceof Error ? error.message : "Please try again shortly.",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	if (quiz.questions.length === 0) {
		return (
			<div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-amber-100">
				<div className="flex items-center gap-2 font-medium">
					<AlertCircle className="size-5" /> Quiz unavailable
				</div>
				<p className="mt-2 text-sm text-amber-100/70">
					The questions for this lesson have not been configured yet.
				</p>
			</div>
		);
	}

	return (
		<form
			className="rounded-2xl border border-violet-400/20 bg-slate-900/55 p-5 md:p-7"
			onSubmit={handleSubmit}
		>
			<div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2 text-violet-300">
						<HelpCircle className="size-4" />
						<p className="font-mono text-xs tracking-widest">KNOWLEDGE CHECK</p>
					</div>
					<p className="mt-2 text-sm text-slate-400">
						Answer every question. Passing score: {quiz.passingScore}%.
					</p>
				</div>
				{result && (
					<Badge
						className={
							result.passed
								? "bg-emerald-400/15 text-emerald-300"
								: "bg-red-400/15 text-red-300"
						}
					>
						{result.score}% · {result.passed ? "Passed" : "Try again"}
					</Badge>
				)}
			</div>

			<div className="mt-6 space-y-7">
				{quiz.questions.map((question, questionIndex) => {
					const questionResult = resultByQuestion.get(question.id);
					return (
						<fieldset key={question.id}>
							<legend className="font-medium leading-6">
								<span className="mr-2 text-violet-300">
									{questionIndex + 1}.
								</span>
								{question.prompt}
							</legend>
							<div className="mt-3 grid gap-2">
								{question.options.map((option, optionIndex) => {
									const isSelected = answers[question.id] === optionIndex;
									const isCorrectAnswer =
										questionResult?.correctOptionIndex === optionIndex;
									const isWrongSelection =
										Boolean(questionResult) &&
										isSelected &&
										!questionResult?.correct;
									return (
										<label
											className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
												isCorrectAnswer
													? "border-emerald-400/40 bg-emerald-400/10"
													: isWrongSelection
														? "border-red-400/40 bg-red-400/10"
														: isSelected
															? "border-violet-400/50 bg-violet-400/10"
															: "border-slate-800 hover:border-slate-700"
											}`}
											// biome-ignore lint/suspicious/noArrayIndexKey: option position is part of the grading contract
											key={`${question.id}-${optionIndex}`}
										>
											<input
												checked={isSelected}
												className="mt-0.5"
												disabled={Boolean(result)}
												name={question.id}
												onChange={() =>
													setAnswers((current) => ({
														...current,
														[question.id]: optionIndex,
													}))
												}
												type="radio"
											/>
											<span className="flex-1">{option}</span>
											{isCorrectAnswer && (
												<CheckCircle2 className="size-4 text-emerald-300" />
											)}
											{isWrongSelection && (
												<XCircle className="size-4 text-red-300" />
											)}
										</label>
									);
								})}
							</div>
							{questionResult?.explanation && (
								<p className="mt-3 rounded-lg bg-slate-950/60 p-3 text-sm leading-6 text-slate-400">
									{questionResult.explanation}
								</p>
							)}
						</fieldset>
					);
				})}
			</div>

			<div className="mt-7 flex justify-end border-t border-slate-800 pt-5">
				{result ? (
					<Button
						onClick={() => {
							setAnswers({});
							setResult(null);
						}}
						type="button"
						variant="outline"
					>
						<RotateCcw /> Retake quiz
					</Button>
				) : (
					<Button
						className="bg-violet-500 text-white hover:bg-violet-400"
						disabled={
							isSubmitting ||
							Object.keys(answers).length !== quiz.questions.length
						}
						type="submit"
					>
						{isSubmitting ? "Checking..." : "Submit answers"}
					</Button>
				)}
			</div>
		</form>
	);
}
