import { Badge } from "@/components/ui/badge";

export function orderStatusLabel(status: string) {
	return status.replace(/^./, (character) => character.toUpperCase());
}

export function OrderStatusBadge({ status }: { status: string }) {
	const variant =
		status === "paid" || status === "approved"
			? "default"
			: status === "pending"
				? "secondary"
				: "outline";
	return <Badge variant={variant}>{orderStatusLabel(status)}</Badge>;
}
