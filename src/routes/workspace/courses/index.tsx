import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	ArchiveIcon,
	BookOpenIcon,
	ExternalLinkIcon,
	FilePenLineIcon,
	LoaderCircleIcon,
	PlusIcon,
	RotateCcwIcon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { getDashboardSession } from "@/lib/auth.functions";
import { categoryLabel, formatCoursePrice } from "@/lib/course-types";
import {
	archiveCourse,
	createCourse,
	deleteDraftCourse,
	listWorkspaceCourses,
	restoreCourse,
} from "@/lib/courses.functions";

export const Route = createFileRoute("/workspace/courses/")({
	head: () => ({ meta: [{ title: "Course Setup | DV LMS" }] }),
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		const courses = await listWorkspaceCourses();
		return { ...dashboard, initialCourses: courses };
	},
	component: WorkspaceCourses,
});

type WorkspaceCourse = Awaited<ReturnType<typeof listWorkspaceCourses>>[number];

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}

function statusVariant(status: string) {
	if (status === "published") return "default" as const;
	if (status === "archived") return "outline" as const;
	return "secondary" as const;
}

function WorkspaceCourses() {
	const dashboard = Route.useRouteContext();
	const router = useRouter();
	const navigate = Route.useNavigate();
	const [courses, setCourses] = useState(dashboard.initialCourses);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("all");
	const [createOpen, setCreateOpen] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [busy, setBusy] = useState<string | null>(null);
	const [riskCourse, setRiskCourse] = useState<WorkspaceCourse | null>(null);

	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return courses.filter(
			(course) =>
				(status === "all" || course.status === status) &&
				(!normalized ||
					course.title.toLowerCase().includes(normalized) ||
					course.summary.toLowerCase().includes(normalized)),
		);
	}, [courses, query, status]);

	async function refresh() {
		const nextCourses = await listWorkspaceCourses();
		setCourses(nextCourses);
		await router.invalidate();
	}

	async function create(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy("create");
		try {
			const result = await createCourse({ data: { title: newTitle } });
			setCreateOpen(false);
			setNewTitle("");
			toast.success("Course draft created.");
			await navigate({
				to: "/workspace/courses/$courseId",
				params: { courseId: result.id },
			});
		} catch (error) {
			toast.error(errorMessage(error, "Unable to create the course."));
		} finally {
			setBusy(null);
		}
	}

	async function archive(course: WorkspaceCourse) {
		setBusy(course.id);
		try {
			await archiveCourse({ data: { id: course.id } });
			toast.success("Course archived.");
			await refresh();
		} catch (error) {
			toast.error(errorMessage(error, "Unable to archive the course."));
		} finally {
			setBusy(null);
		}
	}

	async function restore(course: WorkspaceCourse) {
		setBusy(course.id);
		try {
			await restoreCourse({ data: { id: course.id } });
			toast.success("Course restored as a draft.");
			await refresh();
		} catch (error) {
			toast.error(errorMessage(error, "Unable to restore the course."));
		} finally {
			setBusy(null);
		}
	}

	async function removeDraft() {
		if (!riskCourse) return;
		setBusy(riskCourse.id);
		try {
			await deleteDraftCourse({ data: { id: riskCourse.id } });
			toast.success("Draft course deleted.");
			setRiskCourse(null);
			await refresh();
		} catch (error) {
			toast.error(errorMessage(error, "Unable to delete the draft."));
		} finally {
			setBusy(null);
		}
	}

	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={Boolean(dashboard.session.session.impersonatedBy)}
				activeItem="courses"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Course Setup</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-6xl space-y-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="text-sm text-muted-foreground">
									{dashboard.organization?.name}
								</p>
								<h1 className="mt-1 text-2xl font-semibold tracking-tight">
									Courses
								</h1>
								<p className="mt-2 text-sm text-muted-foreground">
									Create free or paid courses and publish them to the public
									catalog.
								</p>
							</div>
							<Button onClick={() => setCreateOpen(true)}>
								<PlusIcon />
								New course
							</Button>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<div className="relative flex-1">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Search courses"
									className="pl-8"
								/>
							</div>
							<Select
								value={status}
								onValueChange={(value) => setStatus(value ?? "all")}
							>
								<SelectTrigger className="w-full sm:w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="published">Published</SelectItem>
									<SelectItem value="archived">Archived</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{filtered.length ? (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{filtered.map((course) => (
									<Card key={course.id} className="gap-3">
										<CardHeader>
											<div className="flex items-start justify-between gap-3">
												<Badge variant={statusVariant(course.status)}>
													{course.status}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{course.lessonCount} lessons
												</span>
											</div>
											<CardTitle className="line-clamp-2 pt-2">
												{course.title}
											</CardTitle>
										</CardHeader>
										<CardContent className="mt-auto space-y-4">
											<div className="text-sm text-muted-foreground">
												<p>{categoryLabel(course.category)}</p>
												<p className="mt-1 font-medium text-foreground">
													{formatCoursePrice(course.priceInSen)}
												</p>
											</div>
											<div className="flex flex-wrap gap-2">
												<Button
													render={
														<Link
															to="/workspace/courses/$courseId"
															params={{ courseId: course.id }}
														/>
													}
													size="sm"
												>
													<FilePenLineIcon />
													Edit
												</Button>
												{course.status === "published" ? (
													<Button
														size="sm"
														variant="outline"
														disabled={busy === course.id}
														onClick={() => archive(course)}
													>
														<ArchiveIcon />
														Archive
													</Button>
												) : null}
												{course.status === "archived" ? (
													<Button
														size="sm"
														variant="outline"
														disabled={busy === course.id}
														onClick={() => restore(course)}
													>
														<RotateCcwIcon />
														Restore
													</Button>
												) : null}
												{course.status === "draft" ? (
													<Button
														size="sm"
														variant="destructive"
														disabled={busy === course.id}
														onClick={() => setRiskCourse(course)}
													>
														<Trash2Icon />
														Delete
													</Button>
												) : null}
												{course.status === "published" ? (
													<Button
														render={
															<Link
																to="/courses/$slug"
																params={{ slug: course.slug }}
																target="_blank"
															/>
														}
														size="sm"
														variant="ghost"
													>
														<ExternalLinkIcon />
														View
													</Button>
												) : null}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						) : (
							<div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
								<div>
									<BookOpenIcon className="mx-auto size-9 text-muted-foreground" />
									<h2 className="mt-4 font-medium">No courses found</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										Create your first course or change the current filters.
									</p>
								</div>
							</div>
						)}
					</div>
				</main>
			</SidebarInset>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<form onSubmit={create} className="contents">
						<DialogHeader>
							<DialogTitle>Create course</DialogTitle>
							<DialogDescription>
								Start with a title. You can complete the details in the editor.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-2">
							<Label htmlFor="new-course-title">Course title</Label>
							<Input
								id="new-course-title"
								value={newTitle}
								onChange={(event) => setNewTitle(event.target.value)}
								maxLength={120}
								autoFocus
								required
							/>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={busy === "create"}>
								{busy === "create" ? (
									<LoaderCircleIcon className="animate-spin" />
								) : (
									<PlusIcon />
								)}
								Create course
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={Boolean(riskCourse)}
				onOpenChange={(open) => {
					if (!open) setRiskCourse(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this draft?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes “{riskCourse?.title}” and its curriculum.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={removeDraft}>
							Delete draft
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	);
}
