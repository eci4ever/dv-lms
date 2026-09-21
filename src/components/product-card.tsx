import { Link } from "@tanstack/react-router";
import { Layers3Icon, StarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCoursePrice } from "@/lib/course-types";
import { productTypeLabel } from "@/lib/creator-commerce-types";

interface ProductCardProps {
	product: {
		type: string;
		slug: string;
		name: string;
		summary: string;
		imageUrl: string | null;
		featured: boolean;
		organizationSlug: string;
		minimumPriceInSen: number | null;
		courseCount: number;
		reviewCount: number;
		averageRating: number;
	};
}

export function ProductCard({ product }: ProductCardProps) {
	return (
		<Card className="overflow-hidden py-0">
			<div className="aspect-video bg-muted">
				{product.imageUrl ? (
					<img
						src={product.imageUrl}
						alt=""
						className="size-full object-cover"
					/>
				) : (
					<div className="grid size-full place-items-center">
						<Layers3Icon className="size-10 text-muted-foreground" />
					</div>
				)}
			</div>
			<CardContent className="space-y-4 p-5">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">{productTypeLabel(product.type)}</Badge>
					{product.featured ? <Badge>Featured</Badge> : null}
				</div>
				<div>
					<h3 className="text-lg font-semibold">{product.name}</h3>
					<p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
						{product.summary}
					</p>
					{product.type === "course" ? (
						<p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
							<StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
							<span className="font-medium text-foreground">
								{Number(product.averageRating).toFixed(1)}
							</span>
							<span>({Number(product.reviewCount)})</span>
						</p>
					) : null}
				</div>
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-semibold">
							{product.minimumPriceInSen === null
								? "Unavailable"
								: `From ${formatCoursePrice(product.minimumPriceInSen)}`}
						</p>
						<p className="text-xs text-muted-foreground">
							{Number(product.courseCount)} course
							{Number(product.courseCount) === 1 ? "" : "s"}
						</p>
					</div>
					<Button
						render={
							<Link
								to="/creators/$creatorSlug/products/$productSlug"
								params={{
									creatorSlug: product.organizationSlug,
									productSlug: product.slug,
								}}
							/>
						}
					>
						View product
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
