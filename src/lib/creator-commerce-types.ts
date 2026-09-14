export const productTypes = ["course", "bundle", "membership"] as const;
export type ProductType = (typeof productTypes)[number];

export const billingTypes = ["one_time", "recurring"] as const;
export type BillingType = (typeof billingTypes)[number];
export type BillingInterval = "month" | "year" | null;

export interface OfferEditorInput {
	id: string;
	name: string;
	priceInSen: number;
	billingType: BillingType;
	billingInterval: BillingInterval;
	status: "active" | "inactive";
}

export interface ProductEditorInput {
	id: string;
	type: ProductType;
	slug: string;
	name: string;
	summary: string;
	description: string;
	imageUrl: string;
	featured: boolean;
	courseIds: string[];
	offers: OfferEditorInput[];
}

export function productTypeLabel(type: string) {
	if (type === "membership") return "Membership";
	if (type === "bundle") return "Bundle";
	return "Course";
}

export function billingLabel(type: string, interval?: string | null) {
	if (type === "recurring") return interval === "year" ? "year" : "month";
	return "one-time";
}
