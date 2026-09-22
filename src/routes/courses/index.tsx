import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheckIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { CourseCard } from "@/components/course-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { courseLevels } from "@/lib/course-types";
import { listPublicCourses } from "@/lib/courses.functions";
import { listActiveCategories } from "@/lib/platform.functions";

interface CatalogSearch {
	category?: string;
	level?: string;
	price?: string;
	query?: string;
}

export const Route = createFileRoute("/courses/")({
	head: () => ({
		meta: [
			{ title: "Course Catalog | DV LMS" },
			{
				name: "description",
				content:
					"Browse free and paid practical courses from DV LMS instructors.",
			},
		],
	}),
	validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
		query: typeof search.query === "string" ? search.query : undefined,
		category: typeof search.category === "string" ? search.category : undefined,
		level: typeof search.level === "string" ? search.level : undefined,
		price: typeof search.price === "string" ? search.price : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [courses, categories] = await Promise.all([
			listPublicCourses({
				data: {
					query: deps.query ?? "",
					category: deps.category ?? "",
					level: deps.level ?? "",
					price: deps.price ?? "",
				},
			}),
			listActiveCategories(),
		]);
		return { courses, categories };
	},
	component: CourseCatalog,
});

function CourseCatalog() {
	const { courses, categories } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [query, setQuery] = useState(search.query ?? "");

	function submitSearch(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void navigate({
			search: (previous) => ({ ...previous, query: query || undefined }),
		});
	}

	return (
		<main className="min-h-svh bg-background">
			<header className="border-b bg-background">
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
					<nav className="ml-auto flex items-center gap-2">
						<Link to="/login" className={buttonVariants({ variant: "ghost" })}>
							Sign in
						</Link>
						<Link to="/signup" className={buttonVariants()}>
							Get started
						</Link>
					</nav>
				</div>
			</header>

			<section className="border-b bg-muted/30">
				<div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
					<p className="text-sm font-medium text-muted-foreground">
						Course catalog
					</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
						Find your next skill
					</h1>
					<p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
						Explore practical courses from independent learning organizations.
						Start free or choose a paid course.
					</p>
				</div>
			</section>

			<div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
				<div className="grid gap-6 lg:grid-cols-[240px_1fr]">
					<aside className="space-y-5 rounded-xl border bg-card p-4 lg:sticky lg:top-4 lg:self-start">
						<form className="space-y-2" onSubmit={submitSearch}>
							<label htmlFor="catalog-search" className="text-sm font-medium">
								Search
							</label>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="catalog-search"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									className="pl-8"
									placeholder="Course or organization"
								/>
							</div>
							<Button type="submit" variant="outline" className="w-full">
								Search
							</Button>
						</form>
						<div className="space-y-2">
							<p className="text-sm font-medium">Category</p>
							<Select
								value={search.category ?? "all"}
								onValueChange={(value) =>
									void navigate({
										search: (previous) => ({
											...previous,
											category: !value || value === "all" ? undefined : value,
										}),
									})
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All categories</SelectItem>
									{categories.map((category) => (
										<SelectItem key={category.slug} value={category.slug}>
											{category.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium">Level</p>
							<Select
								value={search.level ?? "all"}
								onValueChange={(value) =>
									void navigate({
										search: (previous) => ({
											...previous,
											level: !value || value === "all" ? undefined : value,
										}),
									})
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All levels</SelectItem>
									{courseLevels.map((level) => (
										<SelectItem key={level.value} value={level.value}>
											{level.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-medium">Price</p>
							<Select
								value={search.price ?? "all"}
								onValueChange={(value) =>
									void navigate({
										search: (previous) => ({
											...previous,
											price: !value || value === "all" ? undefined : value,
										}),
									})
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All prices</SelectItem>
									<SelectItem value="free">Free</SelectItem>
									<SelectItem value="paid">Paid</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{search.query || search.category || search.level || search.price ? (
							<Button
								type="button"
								variant="ghost"
								className="w-full"
								onClick={() => {
									setQuery("");
									void navigate({ search: {} });
								}}
							>
								Clear filters
							</Button>
						) : null}
					</aside>

					<section>
						<div className="mb-5 flex items-center justify-between gap-4">
							<h2 className="text-lg font-semibold">
								{courses.length} {courses.length === 1 ? "course" : "courses"}
							</h2>
						</div>
						{courses.length ? (
							<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
								{courses.map((course) => (
									<CourseCard key={course.id} course={course} />
								))}
							</div>
						) : (
							<div className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
								<div>
									<BookOpenCheckIcon className="mx-auto size-9 text-muted-foreground" />
									<h2 className="mt-4 font-medium">
										No published courses found
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										Try changing your search or filters.
									</p>
								</div>
							</div>
						)}
					</section>
				</div>
			</div>
		</main>
	);
}
