import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	LoaderCircleIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
	getWorkspaceProduct,
	saveProduct,
	setProductStatus,
} from "@/lib/creator-commerce.functions";
import {
	type ProductType,
	productTypeLabel,
} from "@/lib/creator-commerce-types";

export const Route = createFileRoute("/workspace/products/$productId")({
	beforeLoad: async ({ params }) => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (!dashboard.isOrganizationOwner) throw redirect({ to: "/dashboard" });
		const product = await getWorkspaceProduct({
			data: { id: params.productId },
		});
		return { ...dashboard, product };
	},
	head: () => ({ meta: [{ title: "Edit Product | DV LMS" }] }),
	component: ProductEditor,
});

function ProductEditor() {
	const context = Route.useRouteContext();
	const initial = context.product;
	const router = useRouter();
	const [form, setForm] = useState({
		type: initial.type as ProductType,
		slug: initial.slug,
		name: initial.name,
		summary: initial.summary,
		description: initial.description,
		imageUrl: initial.imageUrl ?? "",
		featured: initial.featured,
		courseIds: initial.courseIds,
		offers: initial.offers.map((offer) => ({
			id: offer.id,
			name: offer.name,
			price: (offer.priceInSen / 100).toFixed(offer.priceInSen % 100 ? 2 : 0),
			billingType: offer.billingType as "one_time" | "recurring",
			billingInterval: offer.billingInterval as "month" | "year" | null,
			status: offer.status as "active" | "inactive",
		})),
	});
	const [busy, setBusy] = useState<string | null>(null);
	function updateType(type: ProductType) {
		setForm({
			...form,
			type,
			offers: form.offers.map((offer) => ({
				...offer,
				billingType:
					type === "membership"
						? ("recurring" as const)
						: ("one_time" as const),
				billingInterval:
					type === "membership" ? (offer.billingInterval ?? "month") : null,
			})),
		});
	}
	function addOffer() {
		setForm({
			...form,
			offers: [
				...form.offers,
				{
					id: crypto.randomUUID(),
					name:
						form.type === "membership" ? "Monthly access" : "One-time access",
					price: "",
					billingType: form.type === "membership" ? "recurring" : "one_time",
					billingInterval: form.type === "membership" ? "month" : null,
					status: "active",
				},
			],
		});
	}
	async function save(showToast = true) {
		setBusy("save");
		try {
			const result = await saveProduct({
				data: {
					...form,
					priceInSen: undefined,
					offers: form.offers.map((offer) => ({
						...offer,
						priceInSen: Math.round(Number(offer.price) * 100),
					})),
				},
			});
			setForm((current) => ({ ...current, slug: result.slug }));
			if (showToast) toast.success("Product saved.");
			await router.invalidate({ sync: true });
			return true;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to save product.",
			);
			return false;
		} finally {
			setBusy(null);
		}
	}
	async function transition(status: "draft" | "published" | "archived") {
		if (status === "published" && !(await save(false))) return;
		setBusy(status);
		try {
			await setProductStatus({ data: { id: initial.id, status } });
			toast.success(`Product moved to ${status}.`);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update product.",
			);
		} finally {
			setBusy(null);
		}
	}
	return (
		<SidebarProvider>
			<AppSidebar
				user={context.session.user}
				organizations={context.organizations}
				activeOrganizationId={context.activeOrganizationId}
				isOrganizationOwner={context.isOrganizationOwner}
				organizationRole={context.organizationRole}
				isImpersonating={Boolean(context.session.session.impersonatedBy)}
				activeItem="products"
			/>
			<SidebarInset>
				<header className="flex h-16 items-center gap-2 border-b px-4">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-4" />
					<Button
						size="sm"
						variant="ghost"
						render={<Link to="/workspace/products" />}
					>
						<ArrowLeftIcon />
						Products
					</Button>
				</header>
				<main className="p-4 sm:p-6 lg:p-8">
					<div className="mx-auto max-w-5xl space-y-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h1 className="text-2xl font-semibold">{form.name}</h1>
								<p className="text-sm text-muted-foreground">
									Configure content and ways customers can buy access.
								</p>
							</div>
							<div className="flex gap-2">
								<Badge>{initial.status}</Badge>
								{initial.status === "draft" ? (
									<Button
										variant="outline"
										onClick={() => transition("published")}
										disabled={Boolean(busy)}
									>
										Publish
									</Button>
								) : initial.status === "published" ? (
									<Button
										variant="outline"
										onClick={() => transition("archived")}
										disabled={Boolean(busy)}
									>
										Archive
									</Button>
								) : (
									<Button
										variant="outline"
										onClick={() => transition("draft")}
										disabled={Boolean(busy)}
									>
										Restore to draft
									</Button>
								)}
								<Button onClick={() => save()} disabled={Boolean(busy)}>
									{busy === "save" ? (
										<LoaderCircleIcon className="animate-spin" />
									) : null}
									Save
								</Button>
							</div>
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Product details</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-5 sm:grid-cols-2">
								<div className="space-y-2">
									<Label>Name</Label>
									<Input
										value={form.name}
										onChange={(e) => setForm({ ...form, name: e.target.value })}
									/>
								</div>
								<div className="space-y-2">
									<Label>URL slug</Label>
									<Input
										value={form.slug}
										onChange={(e) => setForm({ ...form, slug: e.target.value })}
									/>
								</div>
								<div className="space-y-2">
									<Label>Type</Label>
									<Select
										value={form.type}
										onValueChange={(v) => v && updateType(v as ProductType)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{["course", "bundle", "membership"].map((v) => (
												<SelectItem key={v} value={v}>
													{productTypeLabel(v)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Image URL</Label>
									<Input
										value={form.imageUrl}
										onChange={(e) =>
											setForm({ ...form, imageUrl: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2 sm:col-span-2">
									<Label>Summary</Label>
									<Input
										value={form.summary}
										onChange={(e) =>
											setForm({ ...form, summary: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2 sm:col-span-2">
									<Label>Description</Label>
									<textarea
										rows={6}
										value={form.description}
										onChange={(e) =>
											setForm({ ...form, description: e.target.value })
										}
										className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
									/>
								</div>
								<label className="flex items-center gap-2 text-sm sm:col-span-2">
									<input
										type="checkbox"
										checked={form.featured}
										onChange={(e) =>
											setForm({ ...form, featured: e.target.checked })
										}
									/>
									Feature this product on the storefront
								</label>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Included courses</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-3 sm:grid-cols-2">
								{initial.courses.map((course) => (
									<label
										key={course.id}
										className="flex items-start gap-3 rounded-lg border p-3"
									>
										<input
											type={form.type === "course" ? "radio" : "checkbox"}
											name="course"
											checked={form.courseIds.includes(course.id)}
											onChange={(e) =>
												setForm({
													...form,
													courseIds:
														form.type === "course"
															? [course.id]
															: e.target.checked
																? [...form.courseIds, course.id]
																: form.courseIds.filter(
																		(id) => id !== course.id,
																	),
												})
											}
										/>
										<span>
											<span className="block text-sm font-medium">
												{course.title}
											</span>
											<span className="text-xs text-muted-foreground">
												{course.status}
											</span>
										</span>
									</label>
								))}
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex-row items-center justify-between">
								<CardTitle>Offers</CardTitle>
								<Button size="sm" variant="outline" onClick={addOffer}>
									<PlusIcon />
									Add offer
								</Button>
							</CardHeader>
							<CardContent className="space-y-4">
								{form.offers.map((offer, index) => (
									<div
										key={offer.id}
										className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_160px_150px_auto]"
									>
										<div className="space-y-2">
											<Label>Name</Label>
											<Input
												value={offer.name}
												onChange={(e) =>
													setForm({
														...form,
														offers: form.offers.map((item, i) =>
															i === index
																? { ...item, name: e.target.value }
																: item,
														),
													})
												}
											/>
										</div>
										<div className="space-y-2">
											<Label>Price (RM)</Label>
											<Input
												type="number"
												min="0.01"
												step="0.01"
												value={offer.price}
												onChange={(e) =>
													setForm({
														...form,
														offers: form.offers.map((item, i) =>
															i === index
																? { ...item, price: e.target.value }
																: item,
														),
													})
												}
											/>
										</div>
										{form.type === "membership" ? (
											<div className="space-y-2">
												<Label>Interval</Label>
												<Select
													value={offer.billingInterval ?? "month"}
													onValueChange={(v) =>
														v &&
														setForm({
															...form,
															offers: form.offers.map((item, i) =>
																i === index
																	? {
																			...item,
																			billingInterval: v as "month" | "year",
																		}
																	: item,
															),
														})
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="month">Monthly</SelectItem>
														<SelectItem value="year">Yearly</SelectItem>
													</SelectContent>
												</Select>
											</div>
										) : (
											<div className="flex items-end pb-2 text-sm text-muted-foreground">
												One-time
											</div>
										)}
										<div className="flex items-end">
											<Button
												size="icon"
												variant="ghost"
												aria-label="Remove offer"
												onClick={() =>
													setForm({
														...form,
														offers: form.offers.filter((_, i) => i !== index),
													})
												}
											>
												<Trash2Icon />
											</Button>
										</div>
									</div>
								))}
								{!form.offers.length ? (
									<p className="text-sm text-muted-foreground">
										Add at least one offer before publishing.
									</p>
								) : null}
							</CardContent>
						</Card>
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
