import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	BadgeCheckIcon,
	BarChart3Icon,
	BookOpenCheckIcon,
	BriefcaseBusinessIcon,
	CheckCircle2Icon,
	ChevronRightIcon,
	Code2Icon,
	Globe2Icon,
	GraduationCapIcon,
	HeartPulseIcon,
	LanguagesIcon,
	Laptop2Icon,
	PaletteIcon,
	PlayIcon,
	SearchIcon,
	ShieldCheckIcon,
	SparklesIcon,
	StarIcon,
	TrendingUpIcon,
	Users2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "DV LMS — Learn skills that move you forward" },
			{
				name: "description",
				content:
					"Discover practical online courses from expert instructors, including free courses to help you start learning today.",
			},
		],
	}),
	component: Home,
});

const courses = [
	{
		title: "Complete Web Development Bootcamp",
		instructor: "Amir Hakim",
		category: "Development",
		rating: "4.9",
		students: "12,480",
		price: "RM89",
		oldPrice: "RM249",
		badge: "Bestseller",
		icon: Code2Icon,
		lessons: "42 lessons",
	},
	{
		title: "UI/UX Design from Zero to Portfolio",
		instructor: "Sarah Lim",
		category: "Design",
		rating: "4.8",
		students: "8,920",
		price: "RM69",
		oldPrice: "RM199",
		badge: "Popular",
		icon: PaletteIcon,
		lessons: "31 lessons",
	},
	{
		title: "Excel Essentials for the Workplace",
		instructor: "Nadia Rahman",
		category: "Business",
		rating: "4.7",
		students: "16,205",
		price: "Free",
		oldPrice: null,
		badge: "Free course",
		icon: BarChart3Icon,
		lessons: "18 lessons",
	},
	{
		title: "Speak English with Confidence",
		instructor: "Daniel Wong",
		category: "Language",
		rating: "4.9",
		students: "6,740",
		price: "RM49",
		oldPrice: "RM129",
		badge: "New",
		icon: LanguagesIcon,
		lessons: "26 lessons",
	},
];

const categories: Array<{
	name: string;
	description: string;
	icon: LucideIcon;
}> = [
	{ name: "Development", description: "1,240 courses", icon: Code2Icon },
	{ name: "Design", description: "860 courses", icon: PaletteIcon },
	{
		name: "Business",
		description: "980 courses",
		icon: BriefcaseBusinessIcon,
	},
	{
		name: "Data & Analytics",
		description: "620 courses",
		icon: BarChart3Icon,
	},
	{
		name: "IT & Software",
		description: "740 courses",
		icon: Laptop2Icon,
	},
	{
		name: "Health & Wellness",
		description: "430 courses",
		icon: HeartPulseIcon,
	},
	{ name: "Languages", description: "510 courses", icon: LanguagesIcon },
	{
		name: "Personal Growth",
		description: "390 courses",
		icon: TrendingUpIcon,
	},
];

function Logo() {
	return (
		<a
			className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight"
			href="#top"
			aria-label="DV LMS home"
		>
			<span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
				<BookOpenCheckIcon className="size-4.5" aria-hidden="true" />
			</span>
			<span>DV LMS</span>
		</a>
	);
}

function SectionHeading({
	eyebrow,
	title,
	description,
}: {
	eyebrow: string;
	title: string;
	description: string;
}) {
	return (
		<div className="max-w-2xl">
			<p className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
				{eyebrow}
			</p>
			<h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
				{title}
			</h2>
			<p className="mt-3 text-pretty leading-7 text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function Rating({ value }: { value: string }) {
	return (
		<div className="flex items-center gap-1.5 text-xs">
			<span className="font-semibold">{value}</span>
			<span className="flex gap-0.5" aria-hidden="true">
				{["star-1", "star-2", "star-3", "star-4", "star-5"].map((star) => (
					<StarIcon key={star} className="size-3 fill-current" />
				))}
			</span>
		</div>
	);
}

function CourseCard({ course }: { course: (typeof courses)[number] }) {
	const Icon = course.icon;

	return (
		<Card className="group h-full gap-0 py-0 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
			<div className="relative aspect-[16/10] overflow-hidden border-b bg-muted">
				<div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_48%,var(--border)_48%,var(--border)_52%,transparent_52%,transparent_100%)] bg-[length:22px_22px] opacity-60" />
				<div className="absolute inset-5 flex items-end justify-between rounded-lg border bg-background/90 p-4 shadow-sm backdrop-blur-sm">
					<div>
						<p className="text-xs font-medium text-muted-foreground">
							{course.category}
						</p>
						<p className="mt-1 text-lg font-semibold">Learn by doing</p>
					</div>
					<span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
						<Icon className="size-5" aria-hidden="true" />
					</span>
				</div>
				<Badge className="absolute top-3 left-3" variant="secondary">
					{course.badge}
				</Badge>
			</div>
			<CardHeader className="gap-2 pt-4">
				<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
					<span>{course.category}</span>
					<span>{course.lessons}</span>
				</div>
				<CardTitle className="line-clamp-2 text-base font-semibold">
					{course.title}
				</CardTitle>
				<CardDescription>{course.instructor}</CardDescription>
			</CardHeader>
			<CardContent className="mt-auto pb-4">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Rating value={course.rating} />
					<span className="text-xs">({course.students})</span>
				</div>
			</CardContent>
			<CardFooter className="justify-between border-t px-4 py-3">
				<div className="flex items-baseline gap-2">
					<span className="text-base font-semibold">{course.price}</span>
					{course.oldPrice ? (
						<span className="text-xs text-muted-foreground line-through">
							{course.oldPrice}
						</span>
					) : null}
				</div>
				<span className="flex items-center gap-1 text-xs font-medium">
					View course
					<ChevronRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
				</span>
			</CardFooter>
		</Card>
	);
}

function Home() {
	return (
		<main
			id="top"
			className="min-h-svh overflow-hidden bg-background text-foreground"
		>
			<div className="border-b bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground sm:text-sm">
				<span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
					<SparklesIcon className="size-3.5" aria-hidden="true" />
					Start learning today with hundreds of free courses.
					<a className="underline underline-offset-4" href="#courses">
						Explore now
					</a>
				</span>
			</div>

			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
				<div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8">
					<Logo />
					<nav
						className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex"
						aria-label="Primary navigation"
					>
						<a
							className="transition-colors hover:text-foreground"
							href="#courses"
						>
							Courses
						</a>
						<a
							className="transition-colors hover:text-foreground"
							href="#categories"
						>
							Categories
						</a>
						<a
							className="transition-colors hover:text-foreground"
							href="#free-courses"
						>
							Free courses
						</a>
						<a
							className="transition-colors hover:text-foreground"
							href="#teach"
						>
							Teach on DV
						</a>
					</nav>

					<div className="relative ml-auto hidden max-w-xs flex-1 md:block xl:max-w-sm">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="h-10 rounded-full pr-4 pl-9"
							placeholder="What do you want to learn?"
							aria-label="Search courses"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Link
							className={buttonVariants({
								variant: "ghost",
								className: "hidden sm:inline-flex",
							})}
							to="/login"
							preload="intent"
						>
							Sign in
						</Link>
						<Link
							className={buttonVariants({ className: "h-10 px-4" })}
							to="/signup"
							preload="intent"
						>
							Join for free
						</Link>
					</div>
				</div>
			</header>

			<section className="relative border-b bg-muted/30">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
				<div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
					<div className="min-w-0">
						<Badge variant="outline" className="mb-5 h-7 bg-background px-3">
							<BadgeCheckIcon data-icon="inline-start" />
							Learn at your pace. Grow on your terms.
						</Badge>
						<h1 className="max-w-3xl text-balance text-5xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">
							Skills that move your life forward.
						</h1>
						<p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
							Learn practical skills from trusted instructors. Choose from
							career-building programs, bite-sized lessons, and free courses
							made for curious minds.
						</p>

						<form
							className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl border bg-background p-2 shadow-sm sm:flex-row"
							action="#courses"
						>
							<div className="relative min-w-0 flex-1">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									name="q"
									className="h-11 border-transparent pl-9 shadow-none focus-visible:border-transparent focus-visible:ring-0"
									placeholder="Search web development, design, business..."
									aria-label="Search all courses"
								/>
							</div>
							<button
								type="submit"
								className={buttonVariants({
									size: "lg",
									className: "h-11 px-5",
								})}
							>
								Search courses
							</button>
						</form>

						<div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
							{[
								"Learn anytime",
								"Expert instructors",
								"Free courses available",
							].map((item) => (
								<span key={item} className="flex items-center gap-2">
									<CheckCircle2Icon className="size-4 text-foreground" />
									{item}
								</span>
							))}
						</div>
					</div>

					<div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:justify-self-end">
						<div className="absolute -inset-3 rounded-[1.75rem] border bg-background/40" />
						<Card className="relative gap-0 overflow-hidden rounded-2xl py-0 shadow-xl">
							<div className="flex items-center justify-between border-b px-5 py-4">
								<div className="flex items-center gap-3">
									<div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
										<Code2Icon className="size-4" />
									</div>
									<div>
										<p className="text-sm font-semibold">
											Web Development Path
										</p>
										<p className="text-xs text-muted-foreground">
											Module 4 of 12
										</p>
									</div>
								</div>
								<Badge variant="secondary">In progress</Badge>
							</div>

							<div className="relative m-4 aspect-video overflow-hidden rounded-xl bg-primary text-primary-foreground sm:m-5">
								<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--color-muted-foreground)_0,transparent_35%),radial-gradient(circle_at_80%_80%,var(--color-muted-foreground)_0,transparent_30%)] opacity-30" />
								<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
									<span className="grid size-14 place-items-center rounded-full bg-primary-foreground text-primary shadow-lg">
										<PlayIcon className="ml-0.5 size-5 fill-current" />
									</span>
									<p className="text-sm font-medium">
										Build your first application
									</p>
								</div>
								<span className="absolute right-3 bottom-3 rounded-md bg-background/15 px-2 py-1 text-xs backdrop-blur-sm">
									12:48
								</span>
							</div>

							<div className="space-y-3 px-4 pb-5 sm:px-5">
								<div className="flex items-center justify-between text-sm">
									<span className="font-medium">Course progress</span>
									<span className="text-muted-foreground">38%</span>
								</div>
								<div className="h-2 overflow-hidden rounded-full bg-muted">
									<div className="h-full w-[38%] rounded-full bg-primary" />
								</div>
								<div className="grid grid-cols-2 gap-3 pt-2">
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground">Completed</p>
										<p className="mt-1 font-semibold">18 lessons</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground">
											Learning time
										</p>
										<p className="mt-1 font-semibold">7h 24m</p>
									</div>
								</div>
							</div>
						</Card>

						<div className="absolute -right-3 -bottom-7 flex items-center gap-3 rounded-xl border bg-background p-3 shadow-lg sm:-right-6">
							<span className="grid size-10 place-items-center rounded-full bg-muted">
								<GraduationCapIcon className="size-5" />
							</span>
							<div>
								<p className="text-xs text-muted-foreground">New achievement</p>
								<p className="text-sm font-semibold">Course milestone</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="border-b">
				<div className="mx-auto grid max-w-7xl grid-cols-2 divide-x px-5 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
					{[
						["50K+", "Active learners"],
						["4,000+", "Expert-led courses"],
						["120+", "Learning partners"],
						["4.8/5", "Average rating"],
					].map(([value, label], index) => (
						<div
							key={label}
							className={`px-4 py-3 text-center ${index === 2 ? "max-md:border-t max-md:border-l-0" : ""} ${index === 3 ? "max-md:border-t" : ""}`}
						>
							<p className="text-2xl font-semibold tracking-tight sm:text-3xl">
								{value}
							</p>
							<p className="mt-1 text-xs text-muted-foreground sm:text-sm">
								{label}
							</p>
						</div>
					))}
				</div>
			</section>

			<section
				id="courses"
				className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28"
			>
				<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<SectionHeading
						eyebrow="Featured learning"
						title="Courses learners love"
						description="Build job-ready skills with highly rated courses from experienced instructors. Start with a free course or invest in a complete learning path."
					/>
					<a
						className="group flex shrink-0 items-center gap-1 text-sm font-semibold"
						href="#categories"
					>
						Browse all courses
						<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
					</a>
				</div>

				<div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
					{courses.map((course) => (
						<CourseCard key={course.title} course={course} />
					))}
				</div>
			</section>

			<section id="categories" className="border-y bg-muted/40">
				<div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
					<SectionHeading
						eyebrow="Explore your interests"
						title="A course for every ambition"
						description="Explore practical topics across technology, business, creativity, language, and personal development."
					/>

					<div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{categories.map((category) => {
							const Icon = category.icon;
							return (
								<a
									key={category.name}
									href="#courses"
									className="group flex items-center gap-4 rounded-xl border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md"
								>
									<span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
										<Icon className="size-5" aria-hidden="true" />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold">
											{category.name}
										</span>
										<span className="mt-0.5 block text-xs text-muted-foreground">
											{category.description}
										</span>
									</span>
									<ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
								</a>
							);
						})}
					</div>
				</div>
			</section>

			<section
				id="free-courses"
				className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28"
			>
				<div className="grid overflow-hidden rounded-2xl bg-primary text-primary-foreground lg:grid-cols-[0.9fr_1.1fr]">
					<div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
						<Badge className="mb-5 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
							Free learning library
						</Badge>
						<h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
							Start building a new skill at no cost.
						</h2>
						<p className="mt-4 max-w-xl text-pretty leading-7 text-primary-foreground/70">
							Explore beginner-friendly lessons, short courses, and community
							resources. Learn first, then choose the path that fits your goals.
						</p>
						<div className="mt-7">
							<Link
								to="/signup"
								preload="intent"
								className={buttonVariants({
									variant: "secondary",
									size: "lg",
									className: "h-11 px-5",
								})}
							>
								Explore free courses
								<ArrowRightIcon />
							</Link>
						</div>
					</div>

					<div className="grid gap-px bg-primary-foreground/15 sm:grid-cols-2">
						{[
							{
								icon: PlayIcon,
								title: "Short, focused lessons",
								copy: "Make progress in 15 minutes a day.",
							},
							{
								icon: ShieldCheckIcon,
								title: "No payment required",
								copy: "Join and start learning without a card.",
							},
							{
								icon: TrendingUpIcon,
								title: "Track your progress",
								copy: "Pick up exactly where you left off.",
							},
							{
								icon: Users2Icon,
								title: "Learn with community",
								copy: "Grow alongside motivated learners.",
							},
						].map((item) => {
							const Icon = item.icon;
							return (
								<div key={item.title} className="bg-primary p-7 sm:p-8">
									<span className="grid size-10 place-items-center rounded-lg bg-primary-foreground/10">
										<Icon className="size-5" />
									</span>
									<p className="mt-8 font-semibold">{item.title}</p>
									<p className="mt-1 text-sm leading-6 text-primary-foreground/65">
										{item.copy}
									</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			<section className="border-y bg-muted/30">
				<div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
					<div className="mx-auto max-w-3xl text-center">
						<Globe2Icon className="mx-auto size-8" />
						<blockquote className="mt-6 text-balance text-2xl leading-snug font-medium tracking-tight sm:text-3xl">
							“DV LMS made it simple to turn learning into a daily habit. I
							completed my first course and applied the skills at work the very
							next week.”
						</blockquote>
						<div className="mt-6">
							<p className="font-semibold">Aisyah Karim</p>
							<p className="text-sm text-muted-foreground">
								Digital Marketing Executive
							</p>
						</div>
					</div>
				</div>
			</section>

			<section
				id="teach"
				className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28"
			>
				<div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
					<div className="relative min-h-80 overflow-hidden rounded-2xl border bg-muted p-6 sm:p-8">
						<div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
						<Card className="relative ml-auto max-w-sm shadow-xl">
							<CardHeader>
								<div className="flex items-center justify-between">
									<span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
										<BarChart3Icon className="size-5" />
									</span>
									<Badge variant="secondary">This month</Badge>
								</div>
								<CardDescription className="pt-4">
									Course revenue
								</CardDescription>
								<CardTitle className="text-3xl font-semibold">
									RM 12,840
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex h-28 items-end gap-2">
									{[35, 52, 42, 74, 63, 88, 100, 78, 92].map((height) => (
										<div
											key={height}
											className="flex-1 rounded-t-sm bg-primary/20 last:bg-primary"
											style={{ height: `${height}%` }}
										/>
									))}
								</div>
							</CardContent>
						</Card>
						<div className="absolute bottom-5 left-5 rounded-xl border bg-background px-4 py-3 shadow-lg sm:bottom-7 sm:left-7">
							<p className="text-xs text-muted-foreground">Learners enrolled</p>
							<p className="mt-1 text-lg font-semibold">2,418</p>
						</div>
					</div>

					<div>
						<SectionHeading
							eyebrow="Teach on DV LMS"
							title="Turn your expertise into impact and income."
							description="Create courses, grow your learning community, and manage everything from one workspace. We give you the tools to focus on teaching."
						/>
						<ul className="mt-7 grid gap-3 text-sm">
							{[
								"Create and publish paid or free courses",
								"Manage learners, enrollments, and organizations",
								"Track performance with clear analytics",
							].map((feature) => (
								<li key={feature} className="flex items-center gap-3">
									<CheckCircle2Icon className="size-4 shrink-0" />
									{feature}
								</li>
							))}
						</ul>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link
								to="/signup"
								preload="intent"
								className={buttonVariants({
									size: "lg",
									className: "h-11 px-5",
								})}
							>
								Start teaching
								<ArrowRightIcon />
							</Link>
							<Link
								to="/login"
								preload="intent"
								className={buttonVariants({
									variant: "outline",
									size: "lg",
									className: "h-11 px-5",
								})}
							>
								Instructor sign in
							</Link>
						</div>
					</div>
				</div>
			</section>

			<section className="border-t">
				<div className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
					<div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
						<GraduationCapIcon className="size-6" />
					</div>
					<h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
						Your next skill starts here.
					</h2>
					<p className="mx-auto mt-3 max-w-xl text-pretty leading-7 text-muted-foreground">
						Join thousands of learners building practical skills and creating
						new opportunities.
					</p>
					<div className="mt-7 flex flex-wrap justify-center gap-3">
						<Link
							to="/signup"
							preload="intent"
							className={buttonVariants({ size: "lg", className: "h-11 px-5" })}
						>
							Create your free account
							<ArrowRightIcon />
						</Link>
						<a
							href="#courses"
							className={buttonVariants({
								variant: "outline",
								size: "lg",
								className: "h-11 px-5",
							})}
						>
							Browse courses
						</a>
					</div>
				</div>
			</section>

			<footer className="border-t bg-muted/30">
				<div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
					<div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
						<div className="max-w-xs">
							<Logo />
							<p className="mt-4 text-sm leading-6 text-muted-foreground">
								Practical learning for every ambition.
							</p>
						</div>
						<div className="grid grid-cols-2 gap-x-12 gap-y-8 text-sm sm:grid-cols-3">
							<div className="grid content-start gap-3">
								<p className="font-semibold">Learn</p>
								<a
									className="text-muted-foreground hover:text-foreground"
									href="#courses"
								>
									Courses
								</a>
								<a
									className="text-muted-foreground hover:text-foreground"
									href="#categories"
								>
									Categories
								</a>
								<a
									className="text-muted-foreground hover:text-foreground"
									href="#free-courses"
								>
									Free courses
								</a>
							</div>
							<div className="grid content-start gap-3">
								<p className="font-semibold">Teach</p>
								<a
									className="text-muted-foreground hover:text-foreground"
									href="#teach"
								>
									Become an instructor
								</a>
								<a
									className="text-muted-foreground hover:text-foreground"
									href="#teach"
								>
									Instructor resources
								</a>
							</div>
							<div className="grid content-start gap-3">
								<p className="font-semibold">Account</p>
								<Link
									className="text-muted-foreground hover:text-foreground"
									to="/login"
								>
									Sign in
								</Link>
								<Link
									className="text-muted-foreground hover:text-foreground"
									to="/signup"
								>
									Create account
								</Link>
							</div>
						</div>
					</div>
					<Separator className="my-8" />
					<div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
						<p>© 2026 DV LMS. All rights reserved.</p>
						<p>Learn anywhere. Build what matters.</p>
					</div>
				</div>
			</footer>
		</main>
	);
}
