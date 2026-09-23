import { createFileRoute } from "@tanstack/react-router";

import { processBillplzCallback } from "@/lib/payment-processing.server";

export const Route = createFileRoute("/api/payments/billplz/callback")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (
					!request.headers
						.get("content-type")
						?.includes("application/x-www-form-urlencoded")
				)
					return Response.json(
						{ error: "Unsupported content type." },
						{ status: 415 },
					);
				const result = await processBillplzCallback(
					new URLSearchParams(await request.text()),
				);
				if (!result.ok)
					return Response.json(
						{ error: result.error },
						{ status: result.status },
					);
				return Response.json({ received: true });
			},
		},
	},
});
