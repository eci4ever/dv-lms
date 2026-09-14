import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, StoreIcon } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { getPublicStorefront } from "@/lib/creator-commerce.functions";

export const Route = createFileRoute("/creators/$slug")({
	loader: ({ params }) => getPublicStorefront({ data: { slug: params.slug } }),
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `${loaderData.profile.displayName} | DV LMS`
					: "Creator | DV LMS",
			},
		],
	}),
	component: CreatorStorefront,
});
function CreatorStorefront() {
	const { profile, products } = Route.useLoaderData();
	return (
		<main className="min-h-svh bg-background">
			<header className="border-b">
				<div className="mx-auto flex h-16 max-w-7xl items-center px-5">
					<Button variant="ghost" render={<Link to="/courses" />}>
						<ArrowLeftIcon />
						Marketplace
					</Button>
					<span className="ml-auto font-semibold">DV LMS</span>
				</div>
			</header>
			<section className="border-b bg-muted/30">
				<div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:grid-cols-[1fr_360px] md:items-center">
					{" "}
					<div>
						<div className="flex items-center gap-3">
							{profile.logo ? (
								<img
									src={profile.logo}
									alt=""
									className="size-12 rounded-xl object-cover"
								/>
							) : (
								<div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
									<StoreIcon />
								</div>
							)}
							<p className="font-medium">{profile.displayName}</p>
						</div>
						<h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
							{profile.headline}
						</h1>
						<p className="mt-5 max-w-2xl whitespace-pre-line leading-7 text-muted-foreground">
							{profile.bio}
						</p>
						<div className="mt-6 flex flex-wrap gap-4 text-sm">
							{[
								["Website", profile.websiteUrl],
								["YouTube", profile.youtubeUrl],
								["GitHub", profile.githubUrl],
								["X", profile.twitterUrl],
							]
								.filter(([, url]) => url)
								.map(([label, url]) => (
									<a
										key={label}
										href={url ?? "#"}
										target="_blank"
										rel="noreferrer"
										className="font-medium underline-offset-4 hover:underline"
									>
										{label}
									</a>
								))}
						</div>
					</div>
					{profile.heroUrl ? (
						<img
							src={profile.heroUrl}
							alt=""
							className="aspect-video w-full rounded-2xl object-cover shadow-sm"
						/>
					) : null}
				</div>
			</section>
			<section className="mx-auto max-w-7xl px-5 py-12">
				<h2 className="text-2xl font-semibold">Products</h2>
				<p className="mt-2 text-muted-foreground">
					Courses, bundles and memberships from {profile.displayName}.
				</p>
				{products.length ? (
					<div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
						{products.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>
				) : (
					<div className="mt-8 rounded-xl border border-dashed p-12 text-center text-muted-foreground">
						No published products yet.
					</div>
				)}
			</section>
		</main>
	);
}
