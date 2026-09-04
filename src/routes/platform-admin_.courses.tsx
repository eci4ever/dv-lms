import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	BookOpenText,
	CircleMinus,
	GripVertical,
	Pencil,
	Plus,
	Save,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import {
	type CourseInput,
	createCourse,
	createLesson,
	deleteCourse,
	deleteLesson,
	getCourseAdminOverview,
	type LessonContentType,
	type LessonInput,
	reorderLessons,
	updateCourse,
	updateLesson,
} from "@/lib/course-admin.functions";
import {
	type QuizDefinition,
	serializeQuizDefinition,
} from "@/lib/lesson-content";
import { sessionQueryKey, sessionQueryOptions } from "@/lib/session.query";

export const Route = createFileRoute("/platform-admin_/courses")({
	beforeLoad: async ({ context }) => {
		const session =
			await context.queryClient.ensureQueryData(sessionQueryOptions);
		if (!session) throw redirect({ to: "/login" });
		if (!session.user.role?.split(",").includes("admin")) {
			throw redirect({ to: "/dashboard" });
		}
		return { user: session.user };
	},
	loader: () => getCourseAdminOverview(),
	component: CourseAdminPage,
});

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Please try again shortly.";
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function CourseAdminPage() {
	const { user } = Route.useRouteContext();
	const courses = Route.useLoaderData();
	const router = useRouter();
	const queryClient = useQueryClient();
	const createCourseFn = useServerFn(createCourse);
	const updateCourseFn = useServerFn(updateCourse);
	const deleteCourseFn = useServerFn(deleteCourse);
	const [selectedCourseId, setSelectedCourseId] = useState<string | "new">(
		courses[0]?.id ?? "new",
	);
	const [isSaving, setIsSaving] = useState(false);
	const selectedCourse = courses.find((item) => item.id === selectedCourseId);

	async function handleSignOut() {
		await authClient.signOut();
		queryClient.removeQueries({ queryKey: sessionQueryKey });
		window.location.assign("/login");
	}

	async function saveCourse(input: CourseInput) {
		setIsSaving(true);
		try {
			if (input.id) {
				await updateCourseFn({ data: input });
				toast.success("Course updated");
			} else {
				const result = await createCourseFn({ data: input });
				setSelectedCourseId(result.id);
				toast.success("Draft course created", {
					description: "Add at least one lesson before publishing it.",
				});
			}
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error("Unable to save course", {
				description: errorMessage(error),
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function removeCourse() {
		if (!selectedCourse) return;
		if (
			!window.confirm(
				`Delete ${selectedCourse.title} and all of its lessons and enrollments? This cannot be undone.`,
			)
		) {
			return;
		}
		setIsSaving(true);
		try {
			await deleteCourseFn({ data: selectedCourse.id });
			setSelectedCourseId(
				courses.find((item) => item.id !== selectedCourse.id)?.id ?? "new",
			);
			await router.invalidate({ sync: true });
			toast.success("Course deleted");
		} catch (error) {
			toast.error("Unable to delete course", {
				description: errorMessage(error),
			});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="dark min-h-screen bg-background text-foreground">
			<TooltipProvider>
				<SidebarProvider>
					<AppSidebar onSignOut={handleSignOut} user={user} />
					<SidebarInset className="bg-[#080d1a]">
						<header className="flex h-16 shrink-0 items-center border-b border-slate-800/80">
							<div className="flex items-center gap-2 px-4">
								<SidebarTrigger />
								<Separator
									className="data-[orientation=vertical]:h-4"
									orientation="vertical"
								/>
								<p className="text-sm font-medium">Course management</p>
							</div>
						</header>

						<main className="p-4 md:p-6 lg:p-8">
							<section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<p className="font-mono text-xs tracking-widest text-cyan-400">
										COURSE STUDIO
									</p>
									<h1 className="mt-2 text-3xl font-semibold tracking-tight">
										Build and publish courses
									</h1>
									<p className="mt-2 text-sm text-slate-400">
										Manage your catalogue, lesson content, access, and pricing.
									</p>
								</div>
								<Button
									className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
									onClick={() => setSelectedCourseId("new")}
								>
									<Plus /> New course
								</Button>
							</section>

							<div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
								<aside className="self-start rounded-xl border border-slate-800 bg-slate-900/40 p-3 xl:sticky xl:top-6">
									<p className="px-2 pb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
										{courses.length} courses
									</p>
									<div className="space-y-2">
										{courses.map((item) => (
											<button
												className={`w-full rounded-lg border p-3 text-left transition ${
													selectedCourseId === item.id
														? "border-cyan-400/40 bg-cyan-400/10"
														: "border-transparent bg-slate-900/60 hover:border-slate-700"
												}`}
												key={item.id}
												onClick={() => setSelectedCourseId(item.id)}
												type="button"
											>
												<div className="flex items-start justify-between gap-3">
													<p className="font-medium leading-5">{item.title}</p>
													<Badge
														className={
															item.status === "published"
																? "bg-emerald-400/15 text-emerald-300"
																: "bg-amber-400/15 text-amber-300"
														}
													>
														{item.status}
													</Badge>
												</div>
												<p className="mt-2 flex gap-3 text-xs text-slate-500">
													<span>{item.lessons.length} lessons</span>
													<span>{item.enrollmentCount} students</span>
												</p>
											</button>
										))}
										{courses.length === 0 && (
											<p className="rounded-lg border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
												No courses yet.
											</p>
										)}
									</div>
								</aside>

								<div className="min-w-0 space-y-6">
									<CourseForm
										course={selectedCourse}
										isSaving={isSaving}
										key={selectedCourse?.id ?? "new"}
										onDelete={removeCourse}
										onSave={saveCourse}
									/>
									{selectedCourse && (
										<LessonManager
											courseId={selectedCourse.id}
											courseTitle={selectedCourse.title}
											key={`${selectedCourse.id}:${selectedCourse.lessons.map((item) => `${item.id}-${item.position}-${item.updatedAt?.getTime() ?? 0}`).join(",")}`}
											lessons={selectedCourse.lessons}
										/>
									)}
								</div>
							</div>
						</main>
					</SidebarInset>
				</SidebarProvider>
			</TooltipProvider>
		</div>
	);
}

type AdminCourse = ReturnType<typeof Route.useLoaderData>[number];

function CourseForm({
	course,
	isSaving,
	onDelete,
	onSave,
}: {
	course?: AdminCourse;
	isSaving: boolean;
	onDelete: () => void;
	onSave: (input: CourseInput) => Promise<void>;
}) {
	const [title, setTitle] = useState(course?.title ?? "");
	const [slug, setSlug] = useState(course?.slug ?? "");
	const [description, setDescription] = useState(course?.description ?? "");
	const [duration, setDuration] = useState(course?.duration ?? "");
	const [price, setPrice] = useState(
		course ? (course.priceSen / 100).toFixed(2) : "0.00",
	);
	const [status, setStatus] = useState<"draft" | "published">(
		course?.status ?? "draft",
	);
	const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnailUrl ?? "");

	function changeTitle(value: string) {
		setTitle(value);
		if (!course) setSlug(slugify(value));
	}

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await onSave({
			id: course?.id,
			title,
			slug,
			description,
			duration,
			priceSen: Math.round(Number(price) * 100),
			status,
			thumbnailUrl,
		});
	}

	return (
		<form
			className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:p-6"
			onSubmit={submit}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="font-mono text-xs tracking-widest text-blue-400">
						{course ? "COURSE SETTINGS" : "NEW DRAFT"}
					</p>
					<h2 className="mt-1 text-xl font-semibold">
						{course ? course.title : "Create a course"}
					</h2>
				</div>
				{course && (
					<div className="flex items-center gap-4 text-xs text-slate-500">
						<span className="inline-flex items-center gap-1.5">
							<BookOpenText className="size-3.5" /> {course.lessons.length}{" "}
							lessons
						</span>
						<span className="inline-flex items-center gap-1.5">
							<Users className="size-3.5" /> {course.enrollmentCount} students
						</span>
					</div>
				)}
			</div>

			<div className="mt-6 grid gap-5 md:grid-cols-2">
				<Field label="Course title">
					<Input
						onChange={(event) => changeTitle(event.target.value)}
						placeholder="Network Administration Essentials"
						required
						value={title}
					/>
				</Field>
				<Field label="URL slug">
					<Input
						onChange={(event) => setSlug(event.target.value)}
						pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
						placeholder="network-administration-essentials"
						required
						value={slug}
					/>
				</Field>
				<div className="grid gap-2 md:col-span-2">
					<Label>Description</Label>
					<textarea
						className="min-h-28 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						onChange={(event) => setDescription(event.target.value)}
						required
						value={description}
					/>
				</div>
				<Field label="Duration">
					<Input
						onChange={(event) => setDuration(event.target.value)}
						placeholder="2 weeks"
						required
						value={duration}
					/>
				</Field>
				<Field label="Price (MYR)">
					<Input
						min="0"
						onChange={(event) => setPrice(event.target.value)}
						required
						step="0.01"
						type="number"
						value={price}
					/>
				</Field>
				<Field label="Thumbnail URL">
					<Input
						onChange={(event) => setThumbnailUrl(event.target.value)}
						placeholder="https://..."
						type="url"
						value={thumbnailUrl}
					/>
				</Field>
				<Field label="Visibility">
					<select
						className="h-8 rounded-lg border border-input bg-slate-950 px-2.5 text-sm"
						disabled={!course}
						onChange={(event) =>
							setStatus(event.target.value as "draft" | "published")
						}
						value={status}
					>
						<option value="draft">Draft</option>
						<option value="published">Published</option>
					</select>
				</Field>
			</div>

			<div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-slate-800 pt-5">
				<div>
					{course && (
						<Button
							disabled={isSaving}
							onClick={onDelete}
							type="button"
							variant="destructive"
						>
							<Trash2 /> Delete course
						</Button>
					)}
				</div>
				<Button
					className="bg-blue-500 text-white hover:bg-blue-400"
					disabled={isSaving}
					type="submit"
				>
					<Save /> {isSaving ? "Saving..." : "Save course"}
				</Button>
			</div>
		</form>
	);
}

function Field({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			{children}
		</div>
	);
}

type AdminLesson = AdminCourse["lessons"][number];

const blankLesson = (courseId: string): LessonInput => ({
	courseId,
	title: "",
	description: "",
	duration: "",
	contentType: "video",
	videoUrl: "",
	content: "",
	attachmentUrl: "",
	isPreview: false,
});

function LessonManager({
	courseId,
	courseTitle,
	lessons,
}: {
	courseId: string;
	courseTitle: string;
	lessons: AdminLesson[];
}) {
	const router = useRouter();
	const createLessonFn = useServerFn(createLesson);
	const updateLessonFn = useServerFn(updateLesson);
	const deleteLessonFn = useServerFn(deleteLesson);
	const reorderLessonsFn = useServerFn(reorderLessons);
	const [orderedLessons, setOrderedLessons] = useState(lessons);
	const [lessonDraft, setLessonDraft] = useState<LessonInput>(
		blankLesson(courseId),
	);
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	function editLesson(item: AdminLesson) {
		setLessonDraft({
			id: item.id,
			courseId: item.courseId,
			title: item.title,
			description: item.description,
			duration: item.duration,
			contentType: item.contentType,
			videoUrl: item.videoUrl ?? "",
			content: item.content ?? "",
			attachmentUrl: item.attachmentUrl ?? "",
			isPreview: item.isPreview,
		});
	}

	async function saveLesson(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		try {
			if (lessonDraft.id) {
				await updateLessonFn({ data: lessonDraft });
				toast.success("Lesson updated");
			} else {
				await createLessonFn({ data: lessonDraft });
				toast.success("Lesson added");
			}
			setLessonDraft(blankLesson(courseId));
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error("Unable to save lesson", {
				description: errorMessage(error),
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function removeLesson(item: AdminLesson) {
		if (!window.confirm(`Delete lesson “${item.title}”?`)) return;
		setIsSaving(true);
		try {
			await deleteLessonFn({ data: item.id });
			if (lessonDraft.id === item.id) {
				setLessonDraft(blankLesson(courseId));
			}
			await router.invalidate({ sync: true });
			toast.success("Lesson deleted");
		} catch (error) {
			toast.error("Unable to delete lesson", {
				description: errorMessage(error),
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function dropLesson(targetId: string) {
		if (!draggedId || draggedId === targetId) return;
		const previous = orderedLessons;
		const next = [...orderedLessons];
		const sourceIndex = next.findIndex((item) => item.id === draggedId);
		const targetIndex = next.findIndex((item) => item.id === targetId);
		const [moved] = next.splice(sourceIndex, 1);
		next.splice(targetIndex, 0, moved);
		setOrderedLessons(next);
		setDraggedId(null);
		try {
			await reorderLessonsFn({
				data: { courseId, lessonIds: next.map((item) => item.id) },
			});
			await router.invalidate({ sync: true });
			toast.success("Lesson order saved");
		} catch (error) {
			setOrderedLessons(previous);
			toast.error("Unable to reorder lessons", {
				description: errorMessage(error),
			});
		}
	}

	function updateDraft<Key extends keyof LessonInput>(
		key: Key,
		value: LessonInput[Key],
	) {
		setLessonDraft((current) => ({ ...current, [key]: value }));
	}

	function changeContentType(contentType: LessonContentType) {
		setLessonDraft((current) => ({
			...current,
			contentType,
			content:
				contentType === "quiz" &&
				!getQuizForEditor(current.content).questions.length
					? serializeQuizDefinition({
							version: 1,
							passingScore: 80,
							questions: [createQuizQuestion()],
						})
					: current.content,
		}));
	}

	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:p-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="font-mono text-xs tracking-widest text-violet-400">
						CURRICULUM
					</p>
					<h2 className="mt-1 text-xl font-semibold">Lessons</h2>
					<p className="mt-1 text-sm text-slate-500">
						Drag lessons to reorder the curriculum for {courseTitle}.
					</p>
				</div>
				<Button
					onClick={() => setLessonDraft(blankLesson(courseId))}
					type="button"
					variant="outline"
				>
					<Plus /> Add lesson
				</Button>
			</div>

			<div className="mt-6 space-y-2">
				{orderedLessons.map((item, index) => (
					<div
						className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0b1327] p-3"
						key={item.id}
					>
						<button
							aria-label={`Drag lesson ${index + 1} to reorder`}
							className="shrink-0 cursor-grab text-slate-600"
							draggable
							onDragOver={(event) => event.preventDefault()}
							onDragStart={() => setDraggedId(item.id)}
							onDrop={() => dropLesson(item.id)}
							type="button"
						>
							<GripVertical className="size-4" />
						</button>
						<span className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-700 text-xs text-slate-400">
							{index + 1}
						</span>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<p className="truncate text-sm font-medium">{item.title}</p>
								<Badge variant="outline">{item.contentType}</Badge>
								{item.isPreview && (
									<Badge className="bg-cyan-400/15 text-cyan-300">
										Preview
									</Badge>
								)}
							</div>
							<p className="mt-1 text-xs text-slate-500">{item.duration}</p>
						</div>
						<Button
							onClick={() => editLesson(item)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<Pencil /> <span className="sr-only">Edit lesson</span>
						</Button>
						<Button
							disabled={isSaving}
							onClick={() => removeLesson(item)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<Trash2 className="text-red-400" />
							<span className="sr-only">Delete lesson</span>
						</Button>
					</div>
				))}
				{orderedLessons.length === 0 && (
					<p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
						Add the first lesson to make this course publishable.
					</p>
				)}
			</div>

			<form
				className="mt-6 rounded-xl border border-slate-700 bg-slate-950/40 p-4 md:p-5"
				onSubmit={saveLesson}
			>
				<div className="flex items-center justify-between gap-3">
					<h3 className="font-semibold">
						{lessonDraft.id ? "Edit lesson" : "Add a lesson"}
					</h3>
					{lessonDraft.id && (
						<Button
							onClick={() => setLessonDraft(blankLesson(courseId))}
							type="button"
							variant="ghost"
						>
							Cancel editing
						</Button>
					)}
				</div>
				<div className="mt-5 grid gap-5 md:grid-cols-2">
					<Field label="Lesson title">
						<Input
							onChange={(event) => updateDraft("title", event.target.value)}
							required
							value={lessonDraft.title}
						/>
					</Field>
					<Field label="Duration">
						<Input
							onChange={(event) => updateDraft("duration", event.target.value)}
							placeholder="20 min"
							required
							value={lessonDraft.duration}
						/>
					</Field>
					<div className="grid gap-2 md:col-span-2">
						<Label>Description</Label>
						<textarea
							className="min-h-20 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							onChange={(event) =>
								updateDraft("description", event.target.value)
							}
							required
							value={lessonDraft.description}
						/>
					</div>
					<Field label="Content type">
						<select
							className="h-8 rounded-lg border border-input bg-slate-950 px-2.5 text-sm"
							onChange={(event) =>
								changeContentType(event.target.value as LessonContentType)
							}
							value={lessonDraft.contentType}
						>
							<option value="video">Video</option>
							<option value="article">Article</option>
							<option value="quiz">Quiz</option>
						</select>
					</Field>
					<label className="flex items-end gap-3 pb-1 text-sm">
						<input
							checked={lessonDraft.isPreview}
							className="size-4"
							onChange={(event) =>
								updateDraft("isPreview", event.target.checked)
							}
							type="checkbox"
						/>
						Allow as a free preview
					</label>
					{lessonDraft.contentType === "video" && (
						<Field label="YouTube URL (optional)">
							<Input
								onChange={(event) =>
									updateDraft("videoUrl", event.target.value)
								}
								placeholder="https://www.youtube.com/watch?v=..."
								type="url"
								value={lessonDraft.videoUrl}
							/>
						</Field>
					)}
					<Field label="Download URL (optional)">
						<Input
							onChange={(event) =>
								updateDraft("attachmentUrl", event.target.value)
							}
							placeholder="https://..."
							type="url"
							value={lessonDraft.attachmentUrl}
						/>
					</Field>
					{lessonDraft.contentType === "quiz" ? (
						<div className="md:col-span-2">
							<QuizEditor
								onChange={(content) => updateDraft("content", content)}
								value={lessonDraft.content}
							/>
						</div>
					) : (
						<div className="grid gap-2 md:col-span-2">
							<Label>
								{lessonDraft.contentType === "article"
									? "Article content"
									: "Lesson notes (optional)"}
							</Label>
							<textarea
								className="min-h-36 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								onChange={(event) => updateDraft("content", event.target.value)}
								required={lessonDraft.contentType === "article"}
								value={lessonDraft.content}
							/>
						</div>
					)}
				</div>
				<div className="mt-5 flex justify-end">
					<Button
						className="bg-violet-500 text-white hover:bg-violet-400"
						disabled={isSaving}
						type="submit"
					>
						<Save /> {isSaving ? "Saving..." : "Save lesson"}
					</Button>
				</div>
			</form>
		</section>
	);
}

function createQuizQuestion() {
	return {
		id: crypto.randomUUID(),
		prompt: "",
		options: ["", "", "", ""],
		correctOptionIndex: 0,
		explanation: "",
	};
}

function getQuizForEditor(content: string): QuizDefinition {
	try {
		const parsed: unknown = JSON.parse(content);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			!("passingScore" in parsed) ||
			typeof parsed.passingScore !== "number" ||
			!("questions" in parsed) ||
			!Array.isArray(parsed.questions)
		) {
			throw new Error("Invalid quiz draft");
		}
		const questions: QuizDefinition["questions"] = [];
		for (const question of parsed.questions) {
			if (
				typeof question !== "object" ||
				question === null ||
				!("id" in question) ||
				typeof question.id !== "string" ||
				!("prompt" in question) ||
				typeof question.prompt !== "string" ||
				!("options" in question) ||
				!Array.isArray(question.options) ||
				!question.options.every(
					(option: unknown): option is string => typeof option === "string",
				) ||
				!("correctOptionIndex" in question) ||
				typeof question.correctOptionIndex !== "number"
			) {
				throw new Error("Invalid quiz question draft");
			}
			questions.push({
				id: question.id,
				prompt: question.prompt,
				options: question.options,
				correctOptionIndex: question.correctOptionIndex,
				explanation:
					"explanation" in question && typeof question.explanation === "string"
						? question.explanation
						: "",
			});
		}
		return { version: 1, passingScore: parsed.passingScore, questions };
	} catch {
		return { version: 1, passingScore: 80, questions: [] };
	}
}

function QuizEditor({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	const quiz = getQuizForEditor(value);

	function commit(next: QuizDefinition) {
		onChange(serializeQuizDefinition(next));
	}

	function updateQuestion(
		questionIndex: number,
		update: Partial<QuizDefinition["questions"][number]>,
	) {
		commit({
			...quiz,
			questions: quiz.questions.map((question, index) =>
				index === questionIndex ? { ...question, ...update } : question,
			),
		});
	}

	return (
		<div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 md:p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<Field label="Passing score (%)">
					<Input
						className="w-32"
						max="100"
						min="1"
						onChange={(event) =>
							commit({
								...quiz,
								passingScore: Number(event.target.value),
							})
						}
						type="number"
						value={quiz.passingScore}
					/>
				</Field>
				<Button
					onClick={() =>
						commit({
							...quiz,
							questions: [...quiz.questions, createQuizQuestion()],
						})
					}
					type="button"
					variant="outline"
				>
					<Plus /> Add question
				</Button>
			</div>

			<div className="mt-5 space-y-4">
				{quiz.questions.map((question, questionIndex) => (
					<fieldset
						className="rounded-lg border border-slate-700 bg-slate-950/50 p-4"
						key={question.id}
					>
						<div className="flex items-center justify-between gap-3">
							<legend className="font-medium">
								Question {questionIndex + 1}
							</legend>
							<Button
								disabled={quiz.questions.length === 1}
								onClick={() =>
									commit({
										...quiz,
										questions: quiz.questions.filter(
											(_, index) => index !== questionIndex,
										),
									})
								}
								size="sm"
								type="button"
								variant="ghost"
							>
								<Trash2 className="text-red-400" /> Remove
							</Button>
						</div>
						<div className="mt-4 grid gap-4">
							<Field label="Question">
								<Input
									onChange={(event) =>
										updateQuestion(questionIndex, {
											prompt: event.target.value,
										})
									}
									required
									value={question.prompt}
								/>
							</Field>
							<div className="grid gap-3 md:grid-cols-2">
								{question.options.map((option, optionIndex) => (
									<div
										className="flex items-end gap-2"
										// biome-ignore lint/suspicious/noArrayIndexKey: option position is part of the quiz model
										key={`${question.id}-${optionIndex}`}
									>
										<div className="grid flex-1 gap-2">
											<Label>Option {optionIndex + 1}</Label>
											<Input
												onChange={(event) =>
													updateQuestion(questionIndex, {
														options: question.options.map((item, index) =>
															index === optionIndex ? event.target.value : item,
														),
													})
												}
												required
												value={option}
											/>
										</div>
										<Button
											aria-label={`Remove option ${optionIndex + 1}`}
											disabled={question.options.length <= 2}
											onClick={() => {
												const options = question.options.filter(
													(_, index) => index !== optionIndex,
												);
												updateQuestion(questionIndex, {
													options,
													correctOptionIndex:
														question.correctOptionIndex === optionIndex
															? 0
															: optionIndex < question.correctOptionIndex
																? question.correctOptionIndex - 1
																: question.correctOptionIndex,
												});
											}}
											size="icon"
											type="button"
											variant="ghost"
										>
											<CircleMinus />
										</Button>
									</div>
								))}
							</div>
							<div className="flex flex-wrap items-end gap-3">
								<Field label="Correct answer">
									<select
										className="h-8 rounded-lg border border-input bg-slate-950 px-2.5 text-sm"
										onChange={(event) =>
											updateQuestion(questionIndex, {
												correctOptionIndex: Number(event.target.value),
											})
										}
										value={question.correctOptionIndex}
									>
										{question.options.map((_, optionIndex) => (
											<option
												// biome-ignore lint/suspicious/noArrayIndexKey: select values intentionally use option positions
												key={`${question.id}-correct-${optionIndex}`}
												value={optionIndex}
											>
												Option {optionIndex + 1}
											</option>
										))}
									</select>
								</Field>
								{question.options.length < 6 && (
									<Button
										onClick={() =>
											updateQuestion(questionIndex, {
												options: [...question.options, ""],
											})
										}
										type="button"
										variant="outline"
									>
										<Plus /> Add option
									</Button>
								)}
							</div>
							<Field label="Explanation shown after submission (optional)">
								<Input
									onChange={(event) =>
										updateQuestion(questionIndex, {
											explanation: event.target.value,
										})
									}
									value={question.explanation}
								/>
							</Field>
						</div>
					</fieldset>
				))}
			</div>
		</div>
	);
}
