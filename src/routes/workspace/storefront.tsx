import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { ExternalLinkIcon, LoaderCircleIcon, StoreIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	getStorefrontSettings,
	saveStorefront,
	setStorefrontStatus,
} from "@/lib/creator-commerce.functions";
import {
	getCreatorApplication,
	submitCreatorApplication,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/workspace/storefront")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: async () => {
		const [storefront, creatorApplication] = await Promise.all([
			getStorefrontSettings(),
			getCreatorApplication(),
		]);
		return { ...storefront, creatorApplication };
	},
	head: () => ({ meta: [{ title: "Storefront | DV LMS" }] }),
	component: StorefrontSettings,
});

function StorefrontSettings() {
	const dashboard = Route.useRouteContext();
	const initial = Route.useLoaderData();
	const router = useRouter();
	const [form, setForm] = useState({
		displayName: initial.profile.displayName,
		headline: initial.profile.headline,
		bio: initial.profile.bio,
		heroUrl: initial.profile.heroUrl ?? "",
		websiteUrl: initial.profile.websiteUrl ?? "",
		youtubeUrl: initial.profile.youtubeUrl ?? "",
		githubUrl: initial.profile.githubUrl ?? "",
		twitterUrl: initial.profile.twitterUrl ?? "",
	});
	const [busy, setBusy] = useState(false);
	const [applicationNote, setApplicationNote] = useState("");
	async function applyForCreator() {
		setBusy(true);
		try {
			await submitCreatorApplication({ data: { note: applicationNote } });
			toast.success("Creator application submitted.");
			setApplicationNote("");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to submit application.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function save(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		try {
			await saveStorefront({ data: form });
			toast.success("Storefront saved.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to save storefront.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function toggleStatus() {
		setBusy(true);
		try {
			const status =
				initial.profile.status === "published" ? "draft" : "published";
			await setStorefrontStatus({ data: { status } });
			toast.success(
				status === "published"
					? "Storefront published."
					: "Storefront unpublished.",
			);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update storefront.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={Boolean(dashboard.session.session.impersonatedBy)}
				activeItem="storefront"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Storefront</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-4xl space-y-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h1 className="text-2xl font-semibold">Creator storefront</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									Build the public home for your creator brand.
								</p>
							</div>
							<div className="flex gap-2">
								<Badge
									variant={
										initial.profile.status === "published"
											? "default"
											: "secondary"
									}
								>
									{initial.profile.status}
								</Badge>
								{initial.profile.status === "published" ? (
									<Button
										variant="outline"
										render={
											<Link
												to="/creators/$slug"
												params={{ slug: initial.organizationSlug }}
											/>
										}
									>
										<ExternalLinkIcon /> View
									</Button>
								) : null}
							</div>
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Creator status</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center gap-2">
									<Badge
										variant={
											initial.creatorApplication.application?.status ===
											"approved"
												? "default"
												: initial.creatorApplication.application?.status ===
															"suspended" ||
														initial.creatorApplication.application?.status ===
															"rejected"
													? "destructive"
													: "secondary"
										}
									>
										{initial.creatorApplication.application?.status ??
											"not applied"}
									</Badge>
								</div>
								{initial.creatorApplication.application?.decisionReason ? (
									<p className="rounded-md bg-muted p-3 text-sm">
										{initial.creatorApplication.application.decisionReason}
									</p>
								) : null}
								{(!initial.creatorApplication.application ||
									initial.creatorApplication.application.status ===
										"rejected") &&
								initial.creatorApplication.applicationsOpen ? (
									<div className="space-y-3">
										<Label htmlFor="application-note">Application note</Label>
										<textarea
											id="application-note"
											rows={4}
											value={applicationNote}
											onChange={(event) =>
												setApplicationNote(event.target.value)
											}
											className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
											placeholder="Tell us about your audience and the courses you plan to publish."
										/>
										<Button
											disabled={busy || !applicationNote.trim()}
											onClick={applyForCreator}
										>
											Apply as creator
										</Button>
									</div>
								) : null}
							</CardContent>
						</Card>
						<form onSubmit={save}>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<StoreIcon className="size-5" />
										Brand profile
									</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-5 sm:grid-cols-2">
									{(
										[
											["displayName", "Display name"],
											["headline", "Headline"],
											["heroUrl", "Hero image URL"],
											["websiteUrl", "Website URL"],
											["youtubeUrl", "YouTube URL"],
											["githubUrl", "GitHub URL"],
											["twitterUrl", "X URL"],
										] as const
									).map(([key, label]) => (
										<div
											key={key}
											className={
												key === "headline"
													? "sm:col-span-2 space-y-2"
													: "space-y-2"
											}
										>
											<Label htmlFor={key}>{label}</Label>
											<Input
												id={key}
												value={form[key]}
												onChange={(event) =>
													setForm({ ...form, [key]: event.target.value })
												}
											/>
										</div>
									))}
									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="bio">Bio</Label>
										<textarea
											id="bio"
											rows={7}
											value={form.bio}
											onChange={(event) =>
												setForm({ ...form, bio: event.target.value })
											}
											className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
										/>
									</div>
									<div className="flex flex-wrap gap-2 sm:col-span-2">
										<Button type="submit" disabled={busy}>
											{busy ? (
												<LoaderCircleIcon className="animate-spin" />
											) : null}
											Save storefront
										</Button>
										<Button
											type="button"
											variant="outline"
											disabled={busy}
											onClick={toggleStatus}
										>
											{initial.profile.status === "published"
												? "Unpublish"
												: "Publish storefront"}
										</Button>
									</div>
								</CardContent>
							</Card>
						</form>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
