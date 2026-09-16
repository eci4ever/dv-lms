import { useEffect } from "react";

export function AnalyticsView(props: {
	eventType: "storefront_view" | "product_view";
	slug: string;
	creatorSlug?: string;
}) {
	const { eventType, slug, creatorSlug } = props;
	useEffect(() => {
		void fetch("/api/analytics", {
			method: "POST",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ eventType, slug, creatorSlug }),
			keepalive: true,
		});
	}, [eventType, slug, creatorSlug]);
	return null;
}
