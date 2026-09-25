import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	Building2Icon,
	CreditCardIcon,
	GaugeIcon,
	LandmarkIcon,
	Layers3Icon,
	LayoutDashboardIcon,
	LibraryIcon,
	MessageSquareMoreIcon,
	ScrollTextIcon,
	Settings2Icon,
	ShieldCheckIcon,
	SlidersHorizontalIcon,
	StoreIcon,
	UsersRoundIcon,
} from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";

import { NavUser } from "@/components/nav-user";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	user: {
		name: string;
		email: string;
		image?: string | null;
		role?: string | null;
	};
	organizations: {
		id: string;
		name: string;
		slug: string;
		logo?: string | null;
	}[];
	activeOrganizationId?: string | null;
	isOrganizationOwner: boolean;
	organizationRole?: string | null;
	isImpersonating: boolean;
	activeItem?:
		| "account"
		| "admin-overview"
		| "admin-settings"
		| "audit-log"
		| "courses"
		| "categories"
		| "content"
		| "creators"
		| "customers"
		| "dashboard"
		| "library"
		| "learning"
		| "memberships"
		| "organizations"
		| "orders"
		| "payouts"
		| "admin-payouts"
		| "purchases"
		| "products"
		| "reviews"
		| "admin-reviews"
		| "sales"
		| "settings"
		| "storefront"
		| "users";
}

export function AppSidebar({
	user,
	organizations,
	activeOrganizationId,
	isOrganizationOwner,
	organizationRole,
	isImpersonating,
	activeItem = "dashboard",
	...props
}: AppSidebarProps) {
	const isAdmin =
		!isImpersonating && (user.role?.split(",").includes("admin") ?? false);

	async function stopImpersonating() {
		const result = await authClient.admin.stopImpersonating();
		if (result.error) {
			toast.error(result.error.message ?? "Unable to end impersonation.");
			return;
		}
		window.location.assign("/dashboard");
	}

	return (
		<>
			<Sidebar collapsible="icon" {...props}>
				<SidebarHeader className="h-16 shrink-0 justify-center">
					<OrganizationSwitcher
						organizations={organizations}
						activeOrganizationId={activeOrganizationId}
						organizationRole={organizationRole}
					/>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Main</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										render={
											<Link to="/dashboard">
												<LayoutDashboardIcon />
												<span>Dashboard</span>
											</Link>
										}
										isActive={activeItem === "dashboard"}
										tooltip="Dashboard"
									/>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										render={
											<Link to="/purchases">
												<CreditCardIcon />
												<span>Purchases</span>
											</Link>
										}
										isActive={activeItem === "purchases"}
										tooltip="Purchases"
									/>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										render={
											<Link to="/library">
												<BookOpenIcon />
												<span>Library</span>
											</Link>
										}
										isActive={
											activeItem === "library" || activeItem === "learning"
										}
										tooltip="Library"
									/>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										render={
											<Link to="/memberships">
												<CreditCardIcon />
												<span>Memberships</span>
											</Link>
										}
										isActive={activeItem === "memberships"}
										tooltip="Memberships"
									/>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										render={
											<Link to="/courses">
												<LibraryIcon />
												<span>Marketplace</span>
											</Link>
										}
										tooltip="Marketplace"
									/>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Workspace</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/payouts">
													<LandmarkIcon />
													<span>Payouts</span>
												</Link>
											}
											isActive={activeItem === "payouts"}
											tooltip="Payouts"
										/>
									</SidebarMenuItem>
								) : null}
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/reviews">
													<MessageSquareMoreIcon />
													<span>Reviews</span>
												</Link>
											}
											isActive={activeItem === "reviews"}
											tooltip="Reviews"
										/>
									</SidebarMenuItem>
								) : null}
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/storefront">
													<StoreIcon />
													<span>Storefront</span>
												</Link>
											}
											isActive={activeItem === "storefront"}
											tooltip="Storefront"
										/>
									</SidebarMenuItem>
								) : null}
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/courses">
													<BookOpenIcon />
													<span>Courses</span>
												</Link>
											}
											isActive={activeItem === "courses"}
											tooltip="Courses"
										/>
									</SidebarMenuItem>
								) : null}
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/products">
													<Layers3Icon />
													<span>Products</span>
												</Link>
											}
											isActive={activeItem === "products"}
											tooltip="Products"
										/>
									</SidebarMenuItem>
								) : null}
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/customers">
													<UsersRoundIcon />
													<span>Customers</span>
												</Link>
											}
											isActive={activeItem === "customers"}
											tooltip="Customers"
										/>
									</SidebarMenuItem>
								) : null}
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/sales">
													<CreditCardIcon />
													<span>Sales</span>
												</Link>
											}
											isActive={activeItem === "sales"}
											tooltip="Sales"
										/>
									</SidebarMenuItem>
								) : null}
								{isOrganizationOwner ? (
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/workspace/settings">
													<Settings2Icon />
													<span>Settings</span>
												</Link>
											}
											isActive={activeItem === "settings"}
											tooltip="Settings"
										/>
									</SidebarMenuItem>
								) : null}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					{isAdmin ? (
						<SidebarGroup>
							<SidebarGroupLabel>Platform Admin</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin" search={{ days: 30 }}>
													<GaugeIcon />
													<span>Overview</span>
												</Link>
											}
											isActive={activeItem === "admin-overview"}
											tooltip="Platform overview"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link
													to="/admin/creators"
													search={{ query: "", status: "" }}
												>
													<StoreIcon />
													<span>Creators</span>
												</Link>
											}
											isActive={activeItem === "creators"}
											tooltip="Creator approvals"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/content">
													<Layers3Icon />
													<span>Content</span>
												</Link>
											}
											isActive={activeItem === "content"}
											tooltip="Content moderation"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/categories">
													<LibraryIcon />
													<span>Categories</span>
												</Link>
											}
											isActive={activeItem === "categories"}
											tooltip="Marketplace categories"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/users">
													<UsersRoundIcon />
													<span>Users</span>
												</Link>
											}
											isActive={activeItem === "users"}
											tooltip="Users"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/organizations">
													<Building2Icon />
													<span>Organizations</span>
												</Link>
											}
											isActive={activeItem === "organizations"}
											tooltip="Organizations"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/orders">
													<CreditCardIcon />
													<span>Orders</span>
												</Link>
											}
											isActive={activeItem === "orders"}
											tooltip="Orders"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/payouts">
													<LandmarkIcon />
													<span>Payouts</span>
												</Link>
											}
											isActive={activeItem === "admin-payouts"}
											tooltip="Creator payouts"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/reviews">
													<MessageSquareMoreIcon />
													<span>Reviews</span>
												</Link>
											}
											isActive={activeItem === "admin-reviews"}
											tooltip="Review moderation"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link
													to="/admin/audit-log"
													search={{ query: "", action: "" }}
												>
													<ScrollTextIcon />
													<span>Audit Log</span>
												</Link>
											}
											isActive={activeItem === "audit-log"}
											tooltip="Audit log"
										/>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											render={
												<Link to="/admin/settings">
													<SlidersHorizontalIcon />
													<span>Settings</span>
												</Link>
											}
											isActive={activeItem === "admin-settings"}
											tooltip="Platform settings"
										/>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					) : null}
				</SidebarContent>
				<SidebarFooter>
					<NavUser
						user={user}
						organizationRole={organizationRole}
						isImpersonating={isImpersonating}
					/>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
			{isImpersonating ? (
				<div className="fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-destructive/30 bg-background p-3 shadow-lg">
					<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
						<ShieldCheckIcon className="size-4" />
					</span>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium">
							Impersonating {user.name}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{user.email}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={stopImpersonating}
					>
						Return to admin
					</Button>
				</div>
			) : null}
		</>
	);
}
