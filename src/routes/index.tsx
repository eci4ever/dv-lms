import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="min-h-svh bg-background">
			<SiteHeader />
			<main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl items-center justify-center px-6 py-24">
				<section className="max-w-3xl text-center" aria-labelledby="hero-title">
					<p className="mb-6 text-sm font-medium text-muted-foreground">
						Your next chapter starts here
					</p>
					<h1
						id="hero-title"
						className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl"
					>
						Make room for
						<br className="hidden sm:block" /> what’s next.
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
						Build new skills, explore practical lessons, and learn at your own
						pace. Bring your curiosity. We’ll help you take the next step.
					</p>
					<div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
						<Button
							size="lg"
							nativeButton={false}
							render={<Link to="/signup" />}
						>
							Start learning
						</Button>
						<Button
							size="lg"
							variant="outline"
							nativeButton={false}
							render={<Link to="/login" />}
						>
							Log in
						</Button>
					</div>
				</section>
			</main>
		</div>
	);
}
