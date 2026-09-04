import { describe, expect, it } from "vitest";

import {
	getStudentQuiz,
	getYouTubeEmbedUrl,
	gradeQuiz,
	parseQuizDefinition,
	parseStudentQuiz,
	serializeQuizDefinition,
} from "./lesson-content";

const quiz = {
	version: 1 as const,
	passingScore: 50,
	questions: [
		{
			id: "q1",
			prompt: "Which device routes traffic between networks?",
			options: ["Switch", "Router", "Access point"],
			correctOptionIndex: 1,
			explanation: "A router forwards packets between networks.",
		},
		{
			id: "q2",
			prompt: "Which protocol assigns IP addresses automatically?",
			options: ["DNS", "HTTP", "DHCP"],
			correctOptionIndex: 2,
			explanation: "DHCP leases network configuration to clients.",
		},
	],
};

describe("quiz content", () => {
	it("parses, redacts answers for students, and grades on the server", () => {
		const parsed = parseQuizDefinition(serializeQuizDefinition(quiz));
		const studentQuiz = getStudentQuiz(parsed);
		expect(studentQuiz.questions[0]).not.toHaveProperty("correctOptionIndex");
		expect(
			parseStudentQuiz(JSON.stringify(studentQuiz)).questions,
		).toHaveLength(2);

		const result = gradeQuiz(parsed, [
			{ questionId: "q1", optionIndex: 1 },
			{ questionId: "q2", optionIndex: 0 },
		]);
		expect(result).toMatchObject({
			correct: 1,
			total: 2,
			score: 50,
			passed: true,
		});
	});

	it("rejects malformed quizzes", () => {
		expect(() => parseQuizDefinition("not json")).toThrow("invalid");
		expect(() => parseQuizDefinition('{"version":1,"questions":[]}')).toThrow(
			"between 1 and 30",
		);
	});
});

describe("YouTube URLs", () => {
	it.each([
		["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
		["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
		["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
	])("converts %s to a privacy-enhanced embed", (input, id) => {
		expect(getYouTubeEmbedUrl(input)).toBe(
			`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1`,
		);
	});

	it("rejects non-YouTube and invalid URLs", () => {
		expect(getYouTubeEmbedUrl("https://example.com/video")).toBeNull();
		expect(getYouTubeEmbedUrl("not-a-url")).toBeNull();
	});
});
