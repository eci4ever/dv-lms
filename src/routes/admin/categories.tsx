import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import {
	listAdminCategories,
	movePlatformCategory,
	savePlatformCategory,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/admin/categories")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (
			!dashboard.session.user.role?.split(",").includes("admin") ||
			dashboard.session.session.impersonatedBy
		)
			throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: () => listAdminCategories(),
	component: AdminCategories,
});
function AdminCategories() {
	const dashboard = Route.useRouteContext();
	const categories = Route.useLoaderData();
	const router = useRouter();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [busy, setBusy] = useState(false);
	async function save() {
		setBusy(true);
		try {
			await savePlatformCategory({
				data: { name, slug, description: "", featured: false, active: true },
			});
			setName("");
			setSlug("");
			toast.success("Category created.");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to save category.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function update(
		item: (typeof categories)[number],
		changes: Partial<{ active: boolean; featured: boolean }>,
	) {
		await savePlatformCategory({
			data: {
				id: item.id,
				name: item.name,
				slug: item.slug,
				description: item.description,
				active: changes.active ?? item.active,
				featured: changes.featured ?? item.featured,
			},
		});
		await router.invalidate({ sync: true });
	}
	async function move(id: string, direction: "up" | "down") {
		await movePlatformCategory({ data: { id, direction } });
		await router.invalidate({ sync: true });
	}
	return (
		<SidebarProvider>
			<AppSidebar
				user={dashboard.session.user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={false}
				activeItem="categories"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Categories</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-5xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold">Marketplace categories</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								Manage course discovery categories and their order.
							</p>
						</div>
						<Card>
							<CardContent className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]">
								<Input
									placeholder="Category name"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
								<Input
									placeholder="category-slug"
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
								/>
								<Button disabled={busy || !name || !slug} onClick={save}>
									Add category
								</Button>
							</CardContent>
						</Card>
						{categories.map((item, index) => (
							<Card key={item.id}>
								<CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
									<div>
										<strong>{item.name}</strong>
										<span className="ml-2 text-sm text-muted-foreground">
											{item.slug}
										</span>
										<div className="mt-2 flex gap-2">
											<Badge variant={item.active ? "default" : "secondary"}>
												{item.active ? "active" : "inactive"}
											</Badge>
											{item.featured ? (
												<Badge variant="outline">featured</Badge>
											) : null}
										</div>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={index === 0}
											onClick={() => move(item.id, "up")}
										>
											Up
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={index === categories.length - 1}
											onClick={() => move(item.id, "down")}
										>
											Down
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => update(item, { featured: !item.featured })}
										>
											{item.featured ? "Unfeature" : "Feature"}
										</Button>
										<Button
											size="sm"
											variant={item.active ? "destructive" : "default"}
											onClick={() => update(item, { active: !item.active })}
										>
											{item.active ? "Deactivate" : "Activate"}
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
