export type QuizQuestion = {
	id: string;
	prompt: string;
	options: string[];
	correctOptionIndex: number;
	explanation: string;
};

export type QuizDefinition = {
	version: 1;
	passingScore: number;
	questions: QuizQuestion[];
};

export type StudentQuizQuestion = Pick<
	QuizQuestion,
	"id" | "prompt" | "options"
>;

export type StudentQuiz = {
	passingScore: number;
	questions: StudentQuizQuestion[];
};

export type QuizAnswer = {
	questionId: string;
	optionIndex: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string, maxLength: number) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`${label} is required`);
	}
	const result = value.trim();
	if (result.length > maxLength) {
		throw new Error(`${label} must be ${maxLength} characters or fewer`);
	}
	return result;
}

export function parseQuizDefinition(content: string | null): QuizDefinition {
	if (!content?.trim()) throw new Error("Add at least one quiz question");

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error("Quiz content is invalid");
	}
	if (!isRecord(parsed) || !Array.isArray(parsed.questions)) {
		throw new Error("Quiz content is invalid");
	}
	if (parsed.questions.length < 1 || parsed.questions.length > 30) {
		throw new Error("A quiz must contain between 1 and 30 questions");
	}

	const passingScore =
		typeof parsed.passingScore === "number" ? parsed.passingScore : 80;
	if (
		!Number.isInteger(passingScore) ||
		passingScore < 1 ||
		passingScore > 100
	) {
		throw new Error("Passing score must be a whole number from 1 to 100");
	}

	const ids = new Set<string>();
	const questions = parsed.questions.map((question, questionIndex) => {
		if (!isRecord(question) || !Array.isArray(question.options)) {
			throw new Error(`Question ${questionIndex + 1} is invalid`);
		}
		const id = requiredString(question.id, "Question ID", 80);
		if (ids.has(id)) throw new Error("Quiz question IDs must be unique");
		ids.add(id);
		if (question.options.length < 2 || question.options.length > 6) {
			throw new Error(`Question ${questionIndex + 1} needs 2 to 6 options`);
		}
		const options = question.options.map((option, optionIndex) =>
			requiredString(
				option,
				`Question ${questionIndex + 1}, option ${optionIndex + 1}`,
				300,
			),
		);
		if (
			typeof question.correctOptionIndex !== "number" ||
			!Number.isInteger(question.correctOptionIndex) ||
			question.correctOptionIndex < 0 ||
			question.correctOptionIndex >= options.length
		) {
			throw new Error(
				`Choose a correct answer for question ${questionIndex + 1}`,
			);
		}

		return {
			id,
			prompt: requiredString(
				question.prompt,
				`Question ${questionIndex + 1}`,
				1000,
			),
			options,
			correctOptionIndex: question.correctOptionIndex,
			explanation:
				typeof question.explanation === "string"
					? question.explanation.trim().slice(0, 2000)
					: "",
		};
	});

	return { version: 1, passingScore, questions };
}

export function serializeQuizDefinition(definition: QuizDefinition) {
	return JSON.stringify(definition);
}

export function getStudentQuiz(definition: QuizDefinition) {
	return {
		passingScore: definition.passingScore,
		questions: definition.questions.map(({ id, prompt, options }) => ({
			id,
			prompt,
			options,
		})),
	};
}

export function parseStudentQuiz(content: string | null): StudentQuiz {
	if (!content) return { passingScore: 80, questions: [] };
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return { passingScore: 80, questions: [] };
	}
	if (
		!isRecord(parsed) ||
		typeof parsed.passingScore !== "number" ||
		!Array.isArray(parsed.questions)
	) {
		return { passingScore: 80, questions: [] };
	}

	const questions: StudentQuizQuestion[] = [];
	for (const question of parsed.questions) {
		if (
			!isRecord(question) ||
			typeof question.id !== "string" ||
			typeof question.prompt !== "string" ||
			!Array.isArray(question.options) ||
			!question.options.every((option) => typeof option === "string")
		) {
			return { passingScore: 80, questions: [] };
		}
		questions.push({
			id: question.id,
			prompt: question.prompt,
			options: question.options,
		});
	}
	return { passingScore: parsed.passingScore, questions };
}

export function gradeQuiz(definition: QuizDefinition, answers: QuizAnswer[]) {
	const answerMap = new Map(
		answers.map((answer) => [answer.questionId, answer.optionIndex]),
	);
	const results = definition.questions.map((question) => ({
		questionId: question.id,
		correct: answerMap.get(question.id) === question.correctOptionIndex,
		correctOptionIndex: question.correctOptionIndex,
		explanation: question.explanation,
	}));
	const correct = results.filter((result) => result.correct).length;
	const score = Math.round((correct / definition.questions.length) * 100);

	return {
		score,
		correct,
		total: definition.questions.length,
		passed: score >= definition.passingScore,
		passingScore: definition.passingScore,
		results,
	};
}

export function getYouTubeEmbedUrl(value: string | null) {
	if (!value) return null;
	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase().replace(/^www\./, "");
		let videoId: string | null = null;
		if (host === "youtu.be") {
			videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
		} else if (
			host === "youtube.com" ||
			host === "m.youtube.com" ||
			host === "youtube-nocookie.com"
		) {
			if (url.pathname === "/watch") videoId = url.searchParams.get("v");
			else {
				const [kind, id] = url.pathname.split("/").filter(Boolean);
				if (["embed", "shorts", "live"].includes(kind)) videoId = id ?? null;
			}
		}
		if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
		return `https://www.youtube-nocookie.com/embed/${videoId}`;
	} catch {
		return null;
	}
}
