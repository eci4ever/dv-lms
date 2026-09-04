"use client";

import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	BookOpenTextIcon,
	CompassIcon,
	LayoutDashboardIcon,
	NetworkIcon,
	ShieldCheckIcon,
	UserRoundIcon,
} from "lucide-react";
import type * as React from "react";

import { type NavItem, NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

const studentNavigation: NavItem[] = [
	{
		title: "Dashboard",
		url: "/dashboard",
		to: "/dashboard",
		icon: <LayoutDashboardIcon />,
	},
	{
		title: "My learning",
		url: "/dashboard#learning",
		to: "/dashboard",
		hash: "learning",
		icon: <BookOpenIcon />,
	},
	{
		title: "Explore courses",
		url: "/#course",
		to: "/",
		hash: "course",
		icon: <CompassIcon />,
	},
	{
		title: "Account",
		url: "/account",
		to: "/account",
		icon: <UserRoundIcon />,
	},
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
	user: {
		name: string;
		email: string;
		image?: string | null;
		role?: string | null;
	};
	onSignOut: () => void;
};

export function AppSidebar({ user, onSignOut, ...props }: AppSidebarProps) {
	const navigation = user.role?.split(",").includes("admin")
		? [
				...studentNavigation,
				{
					title: "Platform admin",
					url: "/platform-admin",
					to: "/platform-admin" as const,
					icon: <ShieldCheckIcon />,
				},
				{
					title: "Manage courses",
					url: "/platform-admin/courses",
					to: "/platform-admin/courses" as const,
					icon: <BookOpenTextIcon />,
				},
			]
		: studentNavigation;

	return (
		<Sidebar
			className="border-slate-800 bg-[#0a1121]"
			collapsible="icon"
			{...props}
		>
			<SidebarHeader className="p-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild className="h-12 px-2" size="lg">
							<Link to="/">
								<div className="grid size-8 place-items-center rounded-lg bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
									<NetworkIcon className="size-4" />
								</div>
								<div className="grid flex-1 text-left leading-tight">
									<span className="font-semibold tracking-tight">
										NetLab MY
									</span>
									<span className="mt-0.5 text-xs text-sidebar-foreground/55">
										Practical IT learning
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className="gap-1 px-2">
				<NavMain items={navigation} />
			</SidebarContent>
			<SidebarFooter className="border-t border-slate-800/80 p-3">
				<NavUser
					onSignOut={onSignOut}
					user={{ ...user, avatar: user.image ?? "" }}
				/>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
