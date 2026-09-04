import { queryOptions } from "@tanstack/react-query";

import { getSession } from "@/lib/auth.functions";

export const sessionQueryKey = ["auth", "session"] as const;

export const sessionQueryOptions = queryOptions({
	queryKey: sessionQueryKey,
	queryFn: () => getSession(),
	staleTime: 60_000,
	gcTime: 10 * 60_000,
});
