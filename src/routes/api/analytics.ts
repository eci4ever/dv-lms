import { createFileRoute } from "@tanstack/react-router";
import {
	analyticsCookieMaxAge,
	analyticsCookieName,
	cookieValue,
	publishedTrackingTarget,
	recordAnalyticsEvent,
} from "@/lib/analytics.server";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/analytics")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return Response.json({ error: "Invalid request." }, { status: 400 });
				}
				if (!body || typeof body !== "object" || Array.isArray(body))
					return Response.json({ error: "Invalid request." }, { status: 400 });
				const values = body as Record<string, unknown>;
				const eventType = values.eventType;
				if (eventType !== "storefront_view" && eventType !== "product_view")
					return Response.json({ error: "Invalid event." }, { status: 400 });
				const slug = typeof values.slug === "string" ? values.slug.trim() : "";
				const creatorSlug =
					typeof values.creatorSlug === "string"
						? values.creatorSlug.trim()
						: undefined;
				if (!slug)
					return Response.json({ error: "Invalid resource." }, { status: 400 });
				const target = await publishedTrackingTarget(
					eventType,
					slug,
					creatorSlug,
				);
				if (!target)
					return Response.json(
						{ error: "Resource not found." },
						{ status: 404 },
					);
				const existing = cookieValue(
					request.headers.get("cookie"),
					analyticsCookieName,
				);
				const visitorId =
					existing && /^[a-zA-Z0-9-]{16,80}$/.test(existing)
						? existing
						: crypto.randomUUID();
				const session = await auth.api.getSession({ headers: request.headers });
				await recordAnalyticsEvent({
					...target,
					eventType,
					visitorId,
					userId: session?.user.id ?? null,
					source: eventType === "storefront_view" ? "storefront" : "product",
				});
				const headers = new Headers({ "Cache-Control": "no-store" });
				if (!existing)
					headers.append(
						"Set-Cookie",
						`${analyticsCookieName}=${visitorId}; Max-Age=${analyticsCookieMaxAge}; Path=/; HttpOnly; SameSite=Lax; Secure`,
					);
				return Response.json({ tracked: true }, { headers });
			},
		},
	},
});
