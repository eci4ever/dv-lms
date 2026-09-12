import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	Building2Icon,
	ChartNoAxesColumnIncreasingIcon,
	ClipboardCheckIcon,
	CreditCardIcon,
	GaugeIcon,
	LayoutDashboardIcon,
	LibraryIcon,
	type LucideIcon,
	MailPlusIcon,
	MegaphoneIcon,
	PanelsTopLeftIcon,
	ScrollTextIcon,
	Settings2Icon,
	ShieldCheckIcon,
	SlidersHorizontalIcon,
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
	activeItem?: "dashboard" | "organizations" | "settings" | "users";
}

interface MockSidebarItemProps {
	icon: LucideIcon;
	label: string;
	tooltip?: string;
}

function MockSidebarItem({
	icon: Icon,
	label,
	tooltip = label,
}: MockSidebarItemProps) {
	return (
		<SidebarMenuItem>
			<SidebarMenuButton type="button" tooltip={tooltip}>
				<Icon />
				<span>{label}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
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
	const organizationRoles = organizationRole?.split(",") ?? [];
	const canManageOrganization = organizationRoles.some((role) =>
		["owner", "admin"].includes(role),
	);
	const canManageCourses = organizationRoles.some((role) =>
		["owner", "admin", "instructor", "course_manager"].includes(role),
	);

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
								<MockSidebarItem icon={BookOpenIcon} label="My Courses" />
								<MockSidebarItem
									icon={ClipboardCheckIcon}
									label="Assignments"
								/>
								<MockSidebarItem
									icon={ChartNoAxesColumnIncreasingIcon}
									label="Progress"
								/>
								<MockSidebarItem icon={LibraryIcon} label="Course Catalog" />
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Workspace</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<MockSidebarItem icon={PanelsTopLeftIcon} label="Overview" />
								<MockSidebarItem icon={UsersRoundIcon} label="Members" />
								<MockSidebarItem icon={MegaphoneIcon} label="Announcements" />
								{canManageOrganization ? (
									<MockSidebarItem icon={MailPlusIcon} label="Invitations" />
								) : null}
								{canManageCourses ? (
									<MockSidebarItem icon={BookOpenIcon} label="Course Setup" />
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
									<MockSidebarItem
										icon={GaugeIcon}
										label="Overview"
										tooltip="Platform overview"
									/>
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
									<MockSidebarItem
										icon={CreditCardIcon}
										label="Plans & Billing"
									/>
									<MockSidebarItem icon={ScrollTextIcon} label="Audit Log" />
									<MockSidebarItem
										icon={SlidersHorizontalIcon}
										label="System Settings"
									/>
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
