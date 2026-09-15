import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	CheckCircle2Icon,
	Clock3Icon,
	LoaderCircleIcon,
	LockKeyholeIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDashboardSession } from "@/lib/auth.functions";
import { confirmMockPayment, getCheckoutOrder } from "@/lib/commerce.functions";
import { formatCoursePrice } from "@/lib/course-types";

export const Route = createFileRoute("/checkout/$orderId")({
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		return dashboard;
	},
	loader: ({ params }) => getCheckoutOrder({ data: { id: params.orderId } }),
	head: () => ({ meta: [{ title: "Checkout | DV LMS" }] }),
	component: CheckoutPage,
});

function CheckoutPage() {
	const order = Route.useLoaderData();
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);

	async function confirmPayment() {
		setBusy(true);
		try {
			const result = await confirmMockPayment({ data: { id: order.id } });
			toast.success("Mock payment confirmed. Course access is ready.");
			if (result.firstLessonId) {
				await navigate({
					to: "/learning/$slug/$lessonId",
					params: {
						slug: result.courseSlug,
						lessonId: result.firstLessonId,
					},
				});
			} else {
				await navigate({ to: "/library" });
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to confirm payment.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="min-h-svh bg-muted/30 px-5 py-8 sm:py-12">
			<div className="mx-auto max-w-3xl">
				<Button
					render={
						order.productSlug ? (
							<Link
								to="/creators/$creatorSlug/products/$productSlug"
								params={{
									creatorSlug: order.organizationSlug,
									productSlug: order.productSlug,
								}}
							/>
						) : (
							<Link
								to="/courses/$slug"
								params={{ slug: order.courseSlug ?? "" }}
							/>
						)
					}
					variant="ghost"
					className="mb-4"
				>
					<ArrowLeftIcon /> Back to product
				</Button>
				<div className="grid gap-6 md:grid-cols-[1fr_280px]">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between gap-4">
								<CardTitle>Mock checkout</CardTitle>
								<OrderStatusBadge status={order.status} />
							</div>
							<p className="text-sm text-muted-foreground">
								Use this checkout to test the complete purchase flow. No money
								will be charged.
							</p>
						</CardHeader>
						<CardContent className="space-y-5">
							<div className="flex gap-4">
								<div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
									{order.thumbnailUrl ? (
										<img
											src={order.thumbnailUrl}
											alt=""
											className="size-full object-cover"
										/>
									) : null}
								</div>
								<div>
									<p className="font-medium">
										{order.productName ?? order.courseTitle}
									</p>
									<p className="mt-1 text-sm text-muted-foreground">
										{order.organizationName}
									</p>
								</div>
							</div>
							<Separator />
							{order.courses.length > 1 ? (
								<div className="space-y-2">
									<p className="text-sm font-medium">Included courses</p>
									{order.courses.map((course) => (
										<div
											key={course.id}
											className="flex justify-between gap-3 text-sm"
										>
											<span>{course.title}</span>
											{course.alreadyOwned ? (
												<span className="text-muted-foreground">
													Already owned
												</span>
											) : null}
										</div>
									))}
									{order.courses.some((course) => course.alreadyOwned) ? (
										<p className="text-xs text-muted-foreground">
											Bundle pricing is fixed and does not deduct courses
											already owned.
										</p>
									) : null}
								</div>
							) : null}
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Offer price</span>
								<span className="font-semibold">
									{formatCoursePrice(order.grossInSen)}
								</span>
							</div>
							{order.status === "pending" ? (
								<Button
									className="w-full"
									size="lg"
									disabled={busy}
									onClick={confirmPayment}
								>
									{busy ? (
										<LoaderCircleIcon className="animate-spin" />
									) : (
										<LockKeyholeIcon />
									)}
									Confirm mock payment
								</Button>
							) : order.status === "paid" ? (
								<Button
									render={<Link to="/library" />}
									className="w-full"
									size="lg"
								>
									<CheckCircle2Icon /> Go to My Learning
								</Button>
							) : (
								<Button className="w-full" size="lg" disabled>
									Checkout unavailable
								</Button>
							)}
						</CardContent>
					</Card>
					<Card className="self-start">
						<CardHeader>
							<CardTitle className="text-base">Order summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Total</span>
								<span>{formatCoursePrice(order.grossInSen)}</span>
							</div>
							<Separator />
							<p className="flex gap-2 text-xs leading-5 text-muted-foreground">
								<Clock3Icon className="mt-0.5 size-3.5 shrink-0" />
								Pending checkout expires after 30 minutes.
							</p>
							<p className="text-xs leading-5 text-muted-foreground">
								Order ID: {order.id}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
