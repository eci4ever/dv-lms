import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth.functions", () => ({ getSession }));

import { sessionQueryOptions } from "./session.query";

describe("session query", () => {
	beforeEach(() => {
		getSession.mockReset();
	});

	it("shares a fresh session between route guards", async () => {
		const session = { user: { id: "user-1", name: "Test User" } };
		getSession.mockResolvedValue(session);
		const queryClient = new QueryClient();

		const first = await queryClient.ensureQueryData(sessionQueryOptions);
		const second = await queryClient.ensureQueryData(sessionQueryOptions);

		expect(first).toBe(session);
		expect(second).toBe(session);
		expect(getSession).toHaveBeenCalledTimes(1);
	});
});
