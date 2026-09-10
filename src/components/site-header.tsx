import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
	return (
		<header className="border-b">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
				<Link
					to="/"
					className="rounded-sm text-lg font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					DV LMS
				</Link>
				<nav aria-label="Main navigation" className="flex items-center gap-2">
					<Button
						variant="ghost"
						nativeButton={false}
						render={<Link to="/login" />}
					>
						Log in
					</Button>
					<Button nativeButton={false} render={<Link to="/signup" />}>
						Sign up
					</Button>
				</nav>
			</div>
		</header>
	);
}
