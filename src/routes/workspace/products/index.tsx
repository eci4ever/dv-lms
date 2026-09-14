import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { Layers3Icon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { formatCoursePrice } from "@/lib/course-types";
import {
	createProduct,
	listWorkspaceProducts,
} from "@/lib/creator-commerce.functions";
import {
	type ProductType,
	productTypeLabel,
} from "@/lib/creator-commerce-types";

export const Route = createFileRoute("/workspace/products/")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		return dashboard;
	},
	loader: () => listWorkspaceProducts(),
	head: () => ({ meta: [{ title: "Products | DV LMS" }] }),
	component: Products,
});

function Products() {
	const dashboard = Route.useRouteContext();
	const products = Route.useLoaderData();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [type, setType] = useState<ProductType>("course");
	const [busy, setBusy] = useState(false);
	async function create(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		try {
			const result = await createProduct({ data: { name, type } });
			setOpen(false);
			await router.navigate({
				to: "/workspace/products/$productId",
				params: { productId: result.id },
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to create product.",
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
				activeItem="products"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<span className="text-sm font-medium">Products</span>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-6xl space-y-6">
						<div className="flex items-center justify-between gap-4">
							<div>
								<h1 className="text-2xl font-semibold">Products and offers</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									Sell one course, a bundle, or recurring membership access.
								</p>
							</div>
							<Button onClick={() => setOpen(true)}>
								<PlusIcon />
								New product
							</Button>
						</div>
						{products.length ? (
							<div className="grid gap-4 md:grid-cols-2">
								{products.map((product) => (
									<Card key={product.id}>
										<CardContent className="flex items-start gap-4 p-5">
											<div className="grid size-11 place-items-center rounded-lg bg-muted">
												<Layers3Icon className="size-5" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap gap-2">
													<h2 className="font-semibold">{product.name}</h2>
													<Badge variant="secondary">
														{productTypeLabel(product.type)}
													</Badge>
													<Badge
														variant={
															product.status === "published"
																? "default"
																: "outline"
														}
													>
														{product.status}
													</Badge>
												</div>
												<p className="mt-2 text-sm text-muted-foreground">
													{Number(product.courseCount)} courses ·{" "}
													{Number(product.offerCount)} offers ·{" "}
													{product.minimumPriceInSen === null
														? "No active price"
														: `From ${formatCoursePrice(product.minimumPriceInSen)}`}
												</p>
											</div>
											<Button
												variant="outline"
												render={
													<Link
														to="/workspace/products/$productId"
														params={{ productId: product.id }}
													/>
												}
											>
												Edit
											</Button>
										</CardContent>
									</Card>
								))}
							</div>
						) : (
							<div className="grid min-h-64 place-items-center rounded-xl border border-dashed text-center text-muted-foreground">
								Create your first sellable product.
							</div>
						)}
					</div>
				</main>
			</SidebarInset>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<form onSubmit={create} className="contents">
						<DialogHeader>
							<DialogTitle>Create product</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Name</Label>
								<Input
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label>Type</Label>
								<Select
									value={type}
									onValueChange={(value) =>
										value && setType(value as ProductType)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{["course", "bundle", "membership"].map((value) => (
											<SelectItem key={value} value={value}>
												{productTypeLabel(value)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<DialogFooter>
							<Button disabled={busy}>Create</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	);
}
