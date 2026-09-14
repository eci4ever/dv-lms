import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	Clock3Icon,
	GraduationCapIcon,
	UsersRoundIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	categoryLabel,
	formatCoursePrice,
	levelLabel,
} from "@/lib/course-types";

export interface CourseCardData {
	id: string;
	slug: string;
	title: string;
	summary: string;
	category: string;
	level: string;
	thumbnailUrl: string | null;
	priceInSen: number;
	originalPriceInSen: number | null;
	organizationName: string;
	organizationSlug: string;
	creatorName: string;
	lessonCount: number;
	durationMinutes: number;
}

export function CourseCard({ course }: { course: CourseCardData }) {
	return (
		<Link
			to="/courses/$slug"
			params={{ slug: course.slug }}
			preload="intent"
			className="group block h-full"
		>
			<Card className="h-full gap-0 py-0 transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
				<div className="relative aspect-[16/10] overflow-hidden border-b bg-muted">
					{course.thumbnailUrl ? (
						<img
							src={course.thumbnailUrl}
							alt=""
							className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
						/>
					) : (
						<div className="grid size-full place-items-center bg-muted">
							<BookOpenIcon className="size-10 text-muted-foreground" />
						</div>
					)}
					<Badge className="absolute top-3 left-3" variant="secondary">
						{course.priceInSen === 0
							? "Free course"
							: categoryLabel(course.category)}
					</Badge>
				</div>
				<CardHeader className="gap-2 pt-4">
					<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
						<span>{categoryLabel(course.category)}</span>
						<span>{levelLabel(course.level)}</span>
					</div>
					<CardTitle className="line-clamp-2 text-base font-semibold">
						{course.title}
					</CardTitle>
					<CardDescription className="line-clamp-2">
						{course.summary}
					</CardDescription>
				</CardHeader>
				<CardContent className="mt-auto space-y-2 pb-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<GraduationCapIcon className="size-3.5" />
						<span>{course.creatorName}</span>
					</div>
					<div className="flex flex-wrap gap-x-4 gap-y-1">
						<span className="flex items-center gap-1.5">
							<UsersRoundIcon className="size-3.5" />
							{course.organizationName}
						</span>
						<span className="flex items-center gap-1.5">
							<Clock3Icon className="size-3.5" />
							{course.lessonCount} lessons · {course.durationMinutes} min
						</span>
					</div>
				</CardContent>
				<CardFooter className="justify-between border-t px-4 py-3">
					<div className="flex items-baseline gap-2">
						<span className="text-base font-semibold">
							{formatCoursePrice(course.priceInSen)}
						</span>
						{course.originalPriceInSen ? (
							<span className="text-xs text-muted-foreground line-through">
								{formatCoursePrice(course.originalPriceInSen)}
							</span>
						) : null}
					</div>
					<span className="text-xs font-medium">View course</span>
				</CardFooter>
			</Card>
		</Link>
	);
}
