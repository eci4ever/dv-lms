import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	CreditCardIcon,
	LoaderCircleIcon,
	ReceiptTextIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { listPurchases, requestRefund } from "@/lib/commerce.functions";
import { formatCoursePrice } from "@/lib/course-types";

export const Route = createFileRoute("/purchases")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		return dashboard;
	},
	loader: () => listPurchases(),
	head: () => ({ meta: [{ title: "Purchases | DV LMS" }] }),
	component: PurchasesPage,
});

type Purchase = Awaited<ReturnType<typeof listPurchases>>[number];

function PurchasesPage() {
	const dashboard = Route.useRouteContext();
	const purchases = Route.useLoaderData();
	const router = useRouter();
	const [selected, setSelected] = useState<Purchase | null>(null);
	const [reason, setReason] = useState("");
	const [accountHolderName, setAccountHolderName] = useState("");
	const [bankName, setBankName] = useState("");
	const [bankAccountNumber, setBankAccountNumber] = useState("");
	const [busy, setBusy] = useState(false);

	async function submitRefund(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selected) return;
		setBusy(true);
		try {
			await requestRefund({
				data: {
					orderId: selected.id,
					reason,
					accountHolderName,
					bankName,
					bankAccountNumber,
				},
			});
			toast.success("Refund request submitted for admin review.");
			setSelected(null);
			setReason("");
			setAccountHolderName("");
			setBankName("");
			setBankAccountNumber("");
			await router.invalidate({ sync: true });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to request refund.",
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
				activeItem="purchases"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Purchases</p>
				</header>
				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto w-full max-w-5xl space-y-6">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								Purchase history
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								View paid courses, pending checkouts and refund decisions.
							</p>
						</div>
						{purchases.length ? (
							<div className="space-y-4">
								{purchases.map((purchase) => {
									const refundEligible =
										purchase.status === "paid" &&
										purchase.paidAt &&
										Date.now() - purchase.paidAt.getTime() <=
											14 * 24 * 60 * 60 * 1_000 &&
										!purchase.refundId;
									return (
										<Card key={purchase.id}>
											<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
												<div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
													{purchase.thumbnailUrl ? (
														<img
															src={purchase.thumbnailUrl}
															alt=""
															className="size-full object-cover"
														/>
													) : (
														<div className="grid size-full place-items-center">
															<ReceiptTextIcon className="size-7 text-muted-foreground" />
														</div>
													)}
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														<OrderStatusBadge status={purchase.status} />
														{purchase.refundStatus ? (
															<>
																<span className="text-xs text-muted-foreground">
																	Refund
																</span>
																<OrderStatusBadge
																	status={purchase.refundStatus}
																/>
															</>
														) : null}
													</div>
													<h2 className="mt-2 truncate font-medium">
														{purchase.courseTitle}
													</h2>
													<p className="mt-1 text-sm text-muted-foreground">
														{purchase.organizationName} ·{" "}
														{new Intl.DateTimeFormat("en-MY", {
															dateStyle: "medium",
														}).format(purchase.createdAt)}
													</p>
													<p className="mt-2 font-semibold">
														{formatCoursePrice(purchase.grossInSen)}
													</p>
												</div>
												<div className="flex shrink-0 flex-wrap gap-2">
													{purchase.status === "pending" ? (
														<Button
															render={
																<Link
																	to="/checkout/$orderId"
																	params={{ orderId: purchase.id }}
																/>
															}
															size="sm"
														>
															Complete checkout
														</Button>
													) : null}
													{purchase.status === "paid" ? (
														<Button
															render={<Link to="/library" />}
															size="sm"
															variant="outline"
														>
															My Learning
														</Button>
													) : null}
													{refundEligible ? (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => setSelected(purchase)}
														>
															Request refund
														</Button>
													) : null}
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>
						) : (
							<div className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
								<div>
									<CreditCardIcon className="mx-auto size-10 text-muted-foreground" />
									<h2 className="mt-4 font-medium">No purchases yet</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										Paid course orders will appear here.
									</p>
									<Button render={<Link to="/courses" />} className="mt-5">
										Browse courses
									</Button>
								</div>
							</div>
						)}
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
					<form onSubmit={submitRefund} className="contents">
						<DialogHeader>
							<DialogTitle>Request a refund</DialogTitle>
							<DialogDescription>
								Requests are reviewed by a platform admin. The{" "}
								{selected?.refundWindowDays ?? 14}-day refund window applies.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="refund-holder">Account holder</Label>
								<Input
									id="refund-holder"
									value={accountHolderName}
									onChange={(event) => setAccountHolderName(event.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="refund-bank">Bank</Label>
								<Input
									id="refund-bank"
									value={bankName}
									onChange={(event) => setBankName(event.target.value)}
									required
								/>
							</div>
							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="refund-account">Bank account number</Label>
								<Input
									id="refund-account"
									inputMode="numeric"
									value={bankAccountNumber}
									onChange={(event) => setBankAccountNumber(event.target.value)}
									required
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="refund-reason">Reason</Label>
							<textarea
								id="refund-reason"
								value={reason}
								onChange={(event) => setReason(event.target.value)}
								required
								maxLength={1000}
								rows={5}
								className="w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={busy}>
								{busy ? <LoaderCircleIcon className="animate-spin" /> : null}
								Submit request
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	);
}
