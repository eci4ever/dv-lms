"use client";

import { BookOpenIcon, LayoutDashboardIcon, Settings2Icon } from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";

type Organization = {
	id: string;
	name: string;
	logo?: string | null;
};

type User = {
	name: string;
	email: string;
	image?: string | null;
};

export function AppSidebar({
	user,
	organizations,
	activeOrganizationId,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	user: User;
	organizations: Organization[];
	activeOrganizationId?: string | null;
}) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<TeamSwitcher
					organizations={organizations}
					activeOrganizationId={activeOrganizationId}
				/>
			</SidebarHeader>
			<SidebarContent>
				<NavMain
					items={[
						{
							title: "Dashboard",
							url: "/dashboard",
							icon: <LayoutDashboardIcon />,
							isActive: true,
						},
						{
							title: "Learning",
							url: "#",
							icon: <BookOpenIcon />,
						},
						{
							title: "Settings",
							url: "#",
							icon: <Settings2Icon />,
						},
					]}
				/>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
