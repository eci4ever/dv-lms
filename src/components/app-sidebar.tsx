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
	SlidersHorizontalIcon,
	UsersRoundIcon,
} from "lucide-react";
import type * as React from "react";

import { NavUser } from "@/components/nav-user";
import { OrganizationSwitcher } from "@/components/organization-switcher";
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
	activeItem?: "dashboard" | "settings" | "users";
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
	const isAdmin = user.role?.split(",").includes("admin") ?? false;
	const organizationRoles = organizationRole?.split(",") ?? [];
	const canManageOrganization = organizationRoles.some((role) =>
		["owner", "admin"].includes(role),
	);
	const canManageCourses = organizationRoles.some((role) =>
		["owner", "admin", "instructor", "course_manager"].includes(role),
	);

	return (
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
							<MockSidebarItem icon={ClipboardCheckIcon} label="Assignments" />
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
								<MockSidebarItem icon={Building2Icon} label="Organizations" />
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
	);
}
