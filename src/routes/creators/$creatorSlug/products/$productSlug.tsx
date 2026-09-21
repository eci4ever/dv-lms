import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	CheckIcon,
	LoaderCircleIcon,
	StarIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AnalyticsView } from "@/components/analytics-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCheckout } from "@/lib/commerce.functions";
import { formatCoursePrice } from "@/lib/course-types";
import { getPublicProduct } from "@/lib/creator-commerce.functions";
import { billingLabel, productTypeLabel } from "@/lib/creator-commerce-types";

export const Route = createFileRoute(
	"/creators/$creatorSlug/products/$productSlug",
)({
	loader: ({ params }) => getPublicProduct({ data: params }),
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData ? `${loaderData.name} | DV LMS` : "Product | DV LMS",
			},
		],
	}),
	component: PublicProduct,
});
function PublicProduct() {
	const product = Route.useLoaderData();
	const navigate = useNavigate();
	const [busy, setBusy] = useState<string | null>(null);
	async function checkout(offerId: string) {
		setBusy(offerId);
		try {
			const result = await createCheckout({ data: { offerId } });
			await navigate({
				to: "/checkout/$orderId",
				params: { orderId: result.orderId },
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to start checkout.";
			if (message === "Authentication required.") {
				await navigate({ to: "/login" });
				return;
			}
			toast.error(message);
		} finally {
			setBusy(null);
		}
	}
	return (
		<main className="min-h-svh bg-muted/20">
			<AnalyticsView
				eventType="product_view"
				slug={product.slug}
				creatorSlug={product.organizationSlug}
			/>
			<header className="border-b bg-background">
				<div className="mx-auto flex h-16 max-w-7xl items-center px-5">
					<Button
						variant="ghost"
						render={
							<Link
								to="/creators/$slug"
								params={{ slug: product.organizationSlug }}
							/>
						}
					>
						<ArrowLeftIcon />
						{product.organizationName}
					</Button>
				</div>
			</header>
			<div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1fr_380px]">
				<article>
					<div className="flex gap-2">
						<Badge>{productTypeLabel(product.type)}</Badge>
						{product.featured ? (
							<Badge variant="secondary">Featured</Badge>
						) : null}
					</div>
					<h1 className="mt-5 text-4xl font-semibold tracking-tight">
						{product.name}
					</h1>
					<p className="mt-4 text-xl text-muted-foreground">
						{product.summary}
					</p>
					{product.imageUrl ? (
						<img
							src={product.imageUrl}
							alt=""
							className="mt-8 aspect-video w-full rounded-2xl object-cover"
						/>
					) : null}
					<div className="mt-8 whitespace-pre-line leading-7 text-muted-foreground">
						{product.description}
					</div>
					<h2 className="mt-10 text-2xl font-semibold">Included courses</h2>
					<div className="mt-4 space-y-3">
						{product.courses.map((course) => (
							<div
								key={course.id}
								className="flex gap-3 rounded-xl border bg-background p-4"
							>
								<CheckIcon className="mt-0.5 size-5 text-primary" />
								<div>
									<p className="font-medium">{course.title}</p>
									<p className="mt-1 text-sm text-muted-foreground">
										{course.summary}
									</p>
									<p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
										<StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
										<span className="font-medium text-foreground">
											{Number(course.averageRating).toFixed(1)}
										</span>
										<span>({Number(course.reviewCount)} reviews)</span>
									</p>
								</div>
							</div>
						))}
					</div>
				</article>
				<aside>
					<Card className="sticky top-6">
						<CardContent className="space-y-4 p-6">
							<h2 className="text-lg font-semibold">Choose your offer</h2>
							{product.offers.map((offer) => (
								<div key={offer.id} className="rounded-xl border p-4">
									<p className="font-medium">{offer.name}</p>
									<p className="mt-2 text-2xl font-semibold">
										{formatCoursePrice(offer.priceInSen)}
										{offer.billingType === "recurring" ? (
											<span className="text-sm font-normal text-muted-foreground">
												{" "}
												/{" "}
												{billingLabel(offer.billingType, offer.billingInterval)}
											</span>
										) : null}
									</p>
									<Button
										className="mt-4 w-full"
										disabled={Boolean(busy)}
										onClick={() => checkout(offer.id)}
									>
										{busy === offer.id ? (
											<LoaderCircleIcon className="animate-spin" />
										) : null}
										{offer.billingType === "recurring"
											? "Join membership"
											: "Buy now"}
									</Button>
								</div>
							))}
						</CardContent>
					</Card>
				</aside>
			</div>
		</main>
	);
}
