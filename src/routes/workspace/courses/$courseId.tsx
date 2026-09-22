import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	ArchiveIcon,
	ArrowDownIcon,
	ArrowLeftIcon,
	ArrowUpIcon,
	BookOpenIcon,
	CircleDollarSignIcon,
	ExternalLinkIcon,
	FileTextIcon,
	Globe2Icon,
	GripVerticalIcon,
	Layers3Icon,
	LoaderCircleIcon,
	PlusIcon,
	RotateCcwIcon,
	SaveIcon,
	SendIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	type CourseCategory,
	type CourseLevel,
	type CourseSectionInput,
	courseLevels,
	formatCoursePrice,
} from "@/lib/course-types";
import {
	archiveCourse,
	getWorkspaceCourse,
	publishCourse,
	restoreCourse,
	saveCourse,
} from "@/lib/courses.functions";
import { listActiveCategories } from "@/lib/platform.functions";

export const Route = createFileRoute("/workspace/courses/$courseId")({
	head: () => ({ meta: [{ title: "Edit Course | DV LMS" }] }),
	beforeLoad: async ({ params }) => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		const [course, activeCategories] = await Promise.all([
			getWorkspaceCourse({ data: { id: params.courseId } }),
			listActiveCategories(),
		]);
		return {
			...dashboard,
			initialCourse: course,
			activeCategories: activeCategories.some(
				(category) => category.slug === course.category,
			)
				? activeCategories
				: [
						...activeCategories,
						{
							slug: course.category,
							name: `${course.category} (inactive)`,
							description: "",
							featured: false,
							courseCount: 0,
						},
					],
		};
	},
	component: CourseEditor,
});

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
	const destination = index + direction;
	if (destination < 0 || destination >= items.length) return items;
	const next = [...items];
	[next[index], next[destination]] = [next[destination], next[index]];
	return next;
}

function newLesson() {
	return {
		id: crypto.randomUUID(),
		title: "New lesson",
		content: "",
		videoUrl: "",
		durationMinutes: 0,
	};
}

function CourseEditor() {
	const context = Route.useRouteContext();
	const router = useRouter();
	const course = context.initialCourse;
	const [title, setTitle] = useState(course.title);
	const [slug, setSlug] = useState(course.slug);
	const [summary, setSummary] = useState(course.summary);
	const [description, setDescription] = useState(course.description);
	const [category, setCategory] = useState<CourseCategory>(
		course.category as CourseCategory,
	);
	const [level, setLevel] = useState<CourseLevel>(course.level as CourseLevel);
	const [language, setLanguage] = useState(course.language);
	const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl ?? "");
	const [price, setPrice] = useState(
		(course.priceInSen / 100).toFixed(course.priceInSen % 100 ? 2 : 0),
	);
	const [originalPrice, setOriginalPrice] = useState(
		course.originalPriceInSen
			? (course.originalPriceInSen / 100).toFixed(
					course.originalPriceInSen % 100 ? 2 : 0,
				)
			: "",
	);
	const [sections, setSections] = useState<CourseSectionInput[]>(
		course.sections.map((section) => ({
			id: section.id,
			title: section.title,
			lessons: section.lessons.map((lesson) => ({
				id: lesson.id,
				title: lesson.title,
				content: lesson.content,
				videoUrl: lesson.videoUrl ?? "",
				durationMinutes: lesson.durationMinutes,
			})),
		})),
	);
	const [busy, setBusy] = useState<string | null>(null);

	function editorData() {
		const priceNumber = Number(price || 0);
		const originalPriceNumber = originalPrice ? Number(originalPrice) : null;
		if (!Number.isFinite(priceNumber) || priceNumber < 0)
			throw new Error("Enter a valid price.");
		if (
			originalPriceNumber !== null &&
			(!Number.isFinite(originalPriceNumber) || originalPriceNumber <= 0)
		)
			throw new Error("Enter a valid original price.");
		return {
			id: course.id,
			title,
			slug,
			summary,
			description,
			category,
			level,
			language,
			thumbnailUrl,
			priceInSen: Math.round(priceNumber * 100),
			originalPriceInSen:
				originalPriceNumber === null
					? null
					: Math.round(originalPriceNumber * 100),
			sections,
		};
	}

	async function save(showToast = true) {
		setBusy("save");
		try {
			const result = await saveCourse({ data: editorData() });
			setSlug(result.slug);
			if (showToast) toast.success("Course saved.");
			await router.invalidate();
			return true;
		} catch (error) {
			toast.error(getErrorMessage(error, "Unable to save the course."));
			return false;
		} finally {
			setBusy(null);
		}
	}

	async function publish() {
		if (!(await save(false))) return;
		setBusy("publish");
		try {
			await publishCourse({ data: { id: course.id } });
			toast.success("Course published to the catalog.");
			await router.invalidate();
		} catch (error) {
			toast.error(getErrorMessage(error, "Unable to publish the course."));
		} finally {
			setBusy(null);
		}
	}

	async function archive() {
		setBusy("archive");
		try {
			await archiveCourse({ data: { id: course.id } });
			toast.success("Course archived.");
			await router.invalidate();
		} catch (error) {
			toast.error(getErrorMessage(error, "Unable to archive the course."));
		} finally {
			setBusy(null);
		}
	}

	async function restore() {
		setBusy("restore");
		try {
			await restoreCourse({ data: { id: course.id } });
			toast.success("Course restored as a draft.");
			await router.invalidate();
		} catch (error) {
			toast.error(getErrorMessage(error, "Unable to restore the course."));
		} finally {
			setBusy(null);
		}
	}

	function updateSection(
		sectionIndex: number,
		update: (section: CourseSectionInput) => CourseSectionInput,
	) {
		setSections((current) =>
			current.map((section, index) =>
				index === sectionIndex ? update(section) : section,
			),
		);
	}

	return (
		<SidebarProvider>
			<AppSidebar
				user={context.session.user}
				organizations={context.organizations}
				activeOrganizationId={context.activeOrganizationId}
				isOrganizationOwner={context.isOrganizationOwner}
				organizationRole={context.organizationRole}
				isImpersonating={Boolean(context.session.session.impersonatedBy)}
				activeItem="courses"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<Link
						to="/workspace/courses"
						className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
					>
						<ArrowLeftIcon className="size-4" />
						Courses
					</Link>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-6xl space-y-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<Badge
										variant={
											course.status === "published" ? "default" : "secondary"
										}
									>
										{course.status}
									</Badge>
									<span className="text-xs text-muted-foreground">
										Updated {new Date(course.updatedAt).toLocaleDateString()}
									</span>
								</div>
								<h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">
									{title || "Untitled course"}
								</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									Changes to a published course appear in the catalog
									immediately after saving.
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									disabled={Boolean(busy)}
									onClick={() => void save()}
								>
									{busy === "save" ? (
										<LoaderCircleIcon className="animate-spin" />
									) : (
										<SaveIcon />
									)}
									Save
								</Button>
								{course.status === "draft" ? (
									<Button disabled={Boolean(busy)} onClick={publish}>
										<SendIcon />
										Publish
									</Button>
								) : null}
								{course.status === "published" ? (
									<>
										<Button
											render={
												<Link
													to="/courses/$slug"
													params={{ slug: course.slug }}
													target="_blank"
												/>
											}
											variant="outline"
										>
											<ExternalLinkIcon />
											View live
										</Button>
										<Button
											variant="outline"
											disabled={Boolean(busy)}
											onClick={archive}
										>
											<ArchiveIcon />
											Archive
										</Button>
									</>
								) : null}
								{course.status === "archived" ? (
									<Button disabled={Boolean(busy)} onClick={restore}>
										<RotateCcwIcon />
										Restore to draft
									</Button>
								) : null}
							</div>
						</div>

						<Tabs defaultValue="basic" className="gap-5">
							<TabsList
								variant="line"
								className="w-full justify-start overflow-x-auto"
							>
								<TabsTrigger value="basic">
									<FileTextIcon />
									Basic information
								</TabsTrigger>
								<TabsTrigger value="pricing">
									<CircleDollarSignIcon />
									Pricing
								</TabsTrigger>
								<TabsTrigger value="curriculum">
									<Layers3Icon />
									Curriculum
								</TabsTrigger>
								<TabsTrigger value="publish">
									<Globe2Icon />
									Publish
								</TabsTrigger>
							</TabsList>

							<TabsContent value="basic">
								<Card>
									<CardHeader>
										<CardTitle>Course information</CardTitle>
										<CardDescription>
											Information shown on the catalog and course detail page.
										</CardDescription>
									</CardHeader>
									<CardContent className="grid gap-5">
										<div className="space-y-2">
											<Label htmlFor="course-title">Title</Label>
											<Input
												id="course-title"
												value={title}
												onChange={(event) => setTitle(event.target.value)}
												maxLength={120}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="course-slug">Public URL</Label>
											<div className="flex items-center rounded-lg border border-input bg-muted/30 pl-2.5 text-sm text-muted-foreground">
												<span>/courses/</span>
												<Input
													id="course-slug"
													value={slug}
													onChange={(event) => setSlug(event.target.value)}
													className="border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
												/>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="course-summary">Summary</Label>
											<textarea
												id="course-summary"
												value={summary}
												onChange={(event) => setSummary(event.target.value)}
												maxLength={240}
												rows={3}
												className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
											/>
											<p className="text-right text-xs text-muted-foreground">
												{summary.length}/240
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="course-description">Description</Label>
											<textarea
												id="course-description"
												value={description}
												onChange={(event) => setDescription(event.target.value)}
												rows={9}
												className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
											/>
										</div>
										<div className="grid gap-5 sm:grid-cols-2">
											<div className="space-y-2">
												<Label>Category</Label>
												<Select
													value={category}
													onValueChange={(value) =>
														setCategory(value as CourseCategory)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{context.activeCategories.map((item) => (
															<SelectItem key={item.slug} value={item.slug}>
																{item.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<Label>Level</Label>
												<Select
													value={level}
													onValueChange={(value) =>
														setLevel(value as CourseLevel)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{courseLevels.map((item) => (
															<SelectItem key={item.value} value={item.value}>
																{item.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>
										<div className="grid gap-5 sm:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="course-language">Language</Label>
												<Input
													id="course-language"
													value={language}
													onChange={(event) => setLanguage(event.target.value)}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="course-thumbnail">
													Thumbnail HTTPS URL
												</Label>
												<Input
													id="course-thumbnail"
													type="url"
													value={thumbnailUrl}
													onChange={(event) =>
														setThumbnailUrl(event.target.value)
													}
													placeholder="https://example.com/course.jpg"
												/>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="pricing">
								<Card>
									<CardHeader>
										<CardTitle>Course pricing</CardTitle>
										<CardDescription>
											Use RM 0 for a free course. Checkout will be added in a
											later phase.
										</CardDescription>
									</CardHeader>
									<CardContent className="grid gap-5 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="course-price">Selling price (RM)</Label>
											<Input
												id="course-price"
												type="number"
												min="0"
												step="0.01"
												value={price}
												onChange={(event) => setPrice(event.target.value)}
											/>
											<p className="text-xs text-muted-foreground">
												Catalog display:{" "}
												{formatCoursePrice(
													Math.max(0, Math.round(Number(price || 0) * 100)),
												)}
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="course-original-price">
												Original price (RM, optional)
											</Label>
											<Input
												id="course-original-price"
												type="number"
												min="0"
												step="0.01"
												value={originalPrice}
												onChange={(event) =>
													setOriginalPrice(event.target.value)
												}
											/>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="curriculum">
								<div className="space-y-4">
									<div className="flex items-center justify-between gap-4">
										<div>
											<h2 className="font-medium">Course curriculum</h2>
											<p className="text-sm text-muted-foreground">
												Arrange sections and lessons using the arrow controls.
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												setSections((current) => [
													...current,
													{
														id: crypto.randomUUID(),
														title: `Section ${current.length + 1}`,
														lessons: [],
													},
												])
											}
										>
											<PlusIcon />
											Add section
										</Button>
									</div>
									{sections.length ? (
										sections.map((section, sectionIndex) => (
											<Card key={section.id}>
												<CardHeader>
													<div className="flex items-center gap-2">
														<GripVerticalIcon className="size-4 text-muted-foreground" />
														<Input
															value={section.title}
															onChange={(event) =>
																updateSection(sectionIndex, (current) => ({
																	...current,
																	title: event.target.value,
																}))
															}
															aria-label={`Section ${sectionIndex + 1} title`}
															className="font-medium"
														/>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															disabled={sectionIndex === 0}
															onClick={() =>
																setSections((current) =>
																	moveItem(current, sectionIndex, -1),
																)
															}
														>
															<ArrowUpIcon />
															<span className="sr-only">Move section up</span>
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															disabled={sectionIndex === sections.length - 1}
															onClick={() =>
																setSections((current) =>
																	moveItem(current, sectionIndex, 1),
																)
															}
														>
															<ArrowDownIcon />
															<span className="sr-only">Move section down</span>
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={() =>
																setSections((current) =>
																	current.filter(
																		(_, index) => index !== sectionIndex,
																	),
																)
															}
														>
															<Trash2Icon />
															<span className="sr-only">Remove section</span>
														</Button>
													</div>
												</CardHeader>
												<CardContent className="space-y-3">
													{section.lessons.map((lesson, lessonIndex) => (
														<div
															key={lesson.id}
															className="rounded-lg border p-4"
														>
															<div className="flex items-center gap-2">
																<BookOpenIcon className="size-4 text-muted-foreground" />
																<Input
																	value={lesson.title}
																	onChange={(event) =>
																		updateSection(sectionIndex, (current) => ({
																			...current,
																			lessons: current.lessons.map(
																				(item, index) =>
																					index === lessonIndex
																						? {
																								...item,
																								title: event.target.value,
																							}
																						: item,
																			),
																		}))
																	}
																	aria-label={`Lesson ${lessonIndex + 1} title`}
																/>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon-sm"
																	disabled={lessonIndex === 0}
																	onClick={() =>
																		updateSection(sectionIndex, (current) => ({
																			...current,
																			lessons: moveItem(
																				current.lessons,
																				lessonIndex,
																				-1,
																			),
																		}))
																	}
																>
																	<ArrowUpIcon />
																	<span className="sr-only">
																		Move lesson up
																	</span>
																</Button>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon-sm"
																	disabled={
																		lessonIndex === section.lessons.length - 1
																	}
																	onClick={() =>
																		updateSection(sectionIndex, (current) => ({
																			...current,
																			lessons: moveItem(
																				current.lessons,
																				lessonIndex,
																				1,
																			),
																		}))
																	}
																>
																	<ArrowDownIcon />
																	<span className="sr-only">
																		Move lesson down
																	</span>
																</Button>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon-sm"
																	onClick={() =>
																		updateSection(sectionIndex, (current) => ({
																			...current,
																			lessons: current.lessons.filter(
																				(_, index) => index !== lessonIndex,
																			),
																		}))
																	}
																>
																	<Trash2Icon />
																	<span className="sr-only">Remove lesson</span>
																</Button>
															</div>
															<div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]">
																<div className="space-y-2">
																	<Label htmlFor={`video-${lesson.id}`}>
																		Video HTTPS URL
																	</Label>
																	<Input
																		id={`video-${lesson.id}`}
																		type="url"
																		value={lesson.videoUrl}
																		onChange={(event) =>
																			updateSection(
																				sectionIndex,
																				(current) => ({
																					...current,
																					lessons: current.lessons.map(
																						(item, index) =>
																							index === lessonIndex
																								? {
																										...item,
																										videoUrl:
																											event.target.value,
																									}
																								: item,
																					),
																				}),
																			)
																		}
																	/>
																</div>
																<div className="space-y-2">
																	<Label htmlFor={`duration-${lesson.id}`}>
																		Minutes
																	</Label>
																	<Input
																		id={`duration-${lesson.id}`}
																		type="number"
																		min="0"
																		value={lesson.durationMinutes}
																		onChange={(event) =>
																			updateSection(
																				sectionIndex,
																				(current) => ({
																					...current,
																					lessons: current.lessons.map(
																						(item, index) =>
																							index === lessonIndex
																								? {
																										...item,
																										durationMinutes: Number(
																											event.target.value,
																										),
																									}
																								: item,
																					),
																				}),
																			)
																		}
																	/>
																</div>
															</div>
															<div className="mt-3 space-y-2">
																<Label htmlFor={`content-${lesson.id}`}>
																	Lesson text
																</Label>
																<textarea
																	id={`content-${lesson.id}`}
																	rows={5}
																	value={lesson.content}
																	onChange={(event) =>
																		updateSection(sectionIndex, (current) => ({
																			...current,
																			lessons: current.lessons.map(
																				(item, index) =>
																					index === lessonIndex
																						? {
																								...item,
																								content: event.target.value,
																							}
																						: item,
																			),
																		}))
																	}
																	className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
																/>
															</div>
														</div>
													))}
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															updateSection(sectionIndex, (current) => ({
																...current,
																lessons: [...current.lessons, newLesson()],
															}))
														}
													>
														<PlusIcon />
														Add lesson
													</Button>
												</CardContent>
											</Card>
										))
									) : (
										<div className="grid min-h-48 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
											<div>
												<Layers3Icon className="mx-auto size-8 text-muted-foreground" />
												<p className="mt-3 font-medium">No curriculum yet</p>
												<p className="mt-1 text-sm text-muted-foreground">
													Add a section to start building lessons.
												</p>
											</div>
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent value="publish">
								<Card>
									<CardHeader>
										<CardTitle>Publish controls</CardTitle>
										<CardDescription>
											Only organization owners can publish courses.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-5">
										<div className="rounded-lg border p-4">
											<div className="flex items-center justify-between gap-4">
												<div>
													<p className="font-medium">Current status</p>
													<p className="mt-1 text-sm text-muted-foreground">
														{course.status === "draft"
															? "Complete the course details and add at least one lesson before publishing."
															: course.status === "published"
																? "This course is visible in the public catalog."
																: "This course is hidden and can be restored as a draft."}
													</p>
												</div>
												<Badge>{course.status}</Badge>
											</div>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												variant="outline"
												disabled={Boolean(busy)}
												onClick={() => void save()}
											>
												<SaveIcon />
												Save changes
											</Button>
											{course.status === "draft" ? (
												<Button disabled={Boolean(busy)} onClick={publish}>
													<SendIcon />
													Publish course
												</Button>
											) : null}
											{course.status === "published" ? (
												<Button
													variant="outline"
													disabled={Boolean(busy)}
													onClick={archive}
												>
													<ArchiveIcon />
													Archive course
												</Button>
											) : null}
											{course.status === "archived" ? (
												<Button disabled={Boolean(busy)} onClick={restore}>
													<RotateCcwIcon />
													Restore to draft
												</Button>
											) : null}
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
