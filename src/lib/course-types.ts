export const courseCategories = [
	{ value: "it-network", label: "IT & Network" },
	{ value: "system-administration", label: "System Administration" },
	{ value: "programming", label: "Programming" },
] as const;

export const courseLevels = [
	{ value: "all-levels", label: "All levels" },
	{ value: "beginner", label: "Beginner" },
	{ value: "intermediate", label: "Intermediate" },
	{ value: "advanced", label: "Advanced" },
] as const;

export const courseStatuses = ["draft", "published", "archived"] as const;

export type CourseCategory = string;
export type CourseLevel = (typeof courseLevels)[number]["value"];
export type CourseStatus = (typeof courseStatuses)[number];

export interface LessonInput {
	id: string;
	title: string;
	content: string;
	videoUrl: string;
	durationMinutes: number;
}

export interface CourseSectionInput {
	id: string;
	title: string;
	lessons: LessonInput[];
}

export interface CourseEditorInput {
	id: string;
	title: string;
	slug: string;
	summary: string;
	description: string;
	category: CourseCategory;
	level: CourseLevel;
	language: string;
	thumbnailUrl: string;
	priceInSen: number;
	originalPriceInSen: number | null;
	sections: CourseSectionInput[];
}

export function categoryLabel(value: string) {
	return (
		courseCategories.find((category) => category.value === value)?.label ??
		value
	);
}

export function levelLabel(value: string) {
	return courseLevels.find((level) => level.value === value)?.label ?? value;
}

export function formatCoursePrice(priceInSen: number) {
	if (priceInSen === 0) return "Free";
	return new Intl.NumberFormat("en-MY", {
		style: "currency",
		currency: "MYR",
		minimumFractionDigits: priceInSen % 100 === 0 ? 0 : 2,
	}).format(priceInSen / 100);
}
