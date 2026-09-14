import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { LoaderCircleIcon, ReceiptTextIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { listAdminOrders, resolveRefund } from "@/lib/commerce.functions";
import { formatCoursePrice } from "@/lib/course-types";

export const Route = createFileRoute("/admin/orders")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		if (
			dashboard.session.session.impersonatedBy ||
			!dashboard.session.user.role?.split(",").includes("admin")
		) {
			throw redirect({ to: "/dashboard" });
		}
		return dashboard;
	},
	loader: () => listAdminOrders(),
	head: () => ({ meta: [{ title: "Orders | DV LMS" }] }),
	component: AdminOrders,
});

type AdminOrder = Awaited<ReturnType<typeof listAdminOrders>>[number];
type Decision = "approved" | "rejected";

function AdminOrders() {
	const dashboard = Route.useRouteContext();
	const orders = Route.useLoaderData();
	const router = useRouter();
	const [selected, setSelected] = useState<AdminOrder | null>(null);
	const [decision, setDecision] = useState<Decision>("approved");
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);

	function openResolution(order: AdminOrder, nextDecision: Decision) {
		setSelected(order);
		setDecision(nextDecision);
		setNote("");
	}

	async function resolve(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selected?.refundId) return;
		setBusy(true);
		try {
			await resolveRefund({
				data: { refundId: selected.refundId, decision, note },
			});
			toast.success(
				decision === "approved"
					? "Refund approved and course access revoked."
					: "Refund request rejected.",
			);
			setSelected(null);
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to resolve refund.",
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
				activeItem="orders"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Platform Orders</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-7xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								Orders and refunds
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Review all marketplace orders and resolve refund requests.
							</p>
						</div>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<ReceiptTextIcon className="size-5" />
									All orders
								</CardTitle>
							</CardHeader>
							<CardContent>
								{orders.length ? (
									<div className="overflow-x-auto">
										<table className="w-full text-left text-sm">
											<thead className="border-b text-muted-foreground">
												<tr>
													<th className="px-3 py-3 font-medium">Order</th>
													<th className="px-3 py-3 font-medium">
														Course / organization
													</th>
													<th className="px-3 py-3 font-medium">Buyer</th>
													<th className="px-3 py-3 font-medium">Amount</th>
													<th className="px-3 py-3 font-medium">Status</th>
													<th className="px-3 py-3 font-medium">Refund</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{orders.map((order) => (
													<tr key={order.id}>
														<td className="px-3 py-3">
															<p className="font-mono text-xs">
																{order.id.slice(0, 8)}
															</p>
															<p className="mt-1 text-xs text-muted-foreground">
																{new Intl.DateTimeFormat("en-MY", {
																	dateStyle: "medium",
																}).format(order.createdAt)}
															</p>
														</td>
														<td className="px-3 py-3">
															<p className="font-medium">{order.courseTitle}</p>
															<p className="text-xs text-muted-foreground">
																{order.organizationName}
															</p>
														</td>
														<td className="px-3 py-3">
															<p>{order.buyerName}</p>
															<p className="text-xs text-muted-foreground">
																{order.buyerEmail}
															</p>
														</td>
														<td className="px-3 py-3 font-medium">
															{formatCoursePrice(order.grossInSen)}
														</td>
														<td className="px-3 py-3">
															<OrderStatusBadge status={order.status} />
														</td>
														<td className="px-3 py-3">
															{order.refundStatus ? (
																<div className="space-y-2">
																	<OrderStatusBadge
																		status={order.refundStatus}
																	/>
																	{order.refundStatus === "pending" ? (
																		<div className="flex gap-1">
																			<Button
																				size="sm"
																				onClick={() =>
																					openResolution(order, "approved")
																				}
																			>
																				Approve
																			</Button>
																			<Button
																				size="sm"
																				variant="outline"
																				onClick={() =>
																					openResolution(order, "rejected")
																				}
																			>
																				Reject
																			</Button>
																		</div>
																	) : null}
																</div>
															) : (
																<span className="text-muted-foreground">—</span>
															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className="py-12 text-center text-sm text-muted-foreground">
										No marketplace orders yet.
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</main>
			</SidebarInset>

			<Dialog
				open={Boolean(selected)}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
			>
				<DialogContent>
					<form onSubmit={resolve} className="contents">
						<DialogHeader>
							<DialogTitle>
								{decision === "approved" ? "Approve refund" : "Reject refund"}
							</DialogTitle>
							<DialogDescription>
								{decision === "approved"
									? "This marks the order refunded and immediately revokes course access."
									: "The purchase remains paid and the learner keeps course access."}
							</DialogDescription>
						</DialogHeader>
						{selected ? (
							<div className="rounded-lg border bg-muted/30 p-3 text-sm">
								<p className="font-medium">{selected.courseTitle}</p>
								<p className="mt-1 text-muted-foreground">
									Reason: {selected.refundReason}
								</p>
							</div>
						) : null}
						<div className="space-y-2">
							<Label htmlFor="resolution-note">
								Resolution note (optional)
							</Label>
							<textarea
								id="resolution-note"
								value={note}
								onChange={(event) => setNote(event.target.value)}
								maxLength={1000}
								rows={4}
								className="w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
						</div>
						<DialogFooter>
							<Button
								type="submit"
								variant={decision === "rejected" ? "outline" : "default"}
								disabled={busy}
							>
								{busy ? <LoaderCircleIcon className="animate-spin" /> : null}
								{decision === "approved" ? "Approve refund" : "Reject refund"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	);
}
