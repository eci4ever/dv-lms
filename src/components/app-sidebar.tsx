"use client";

import {
	BookOpenIcon,
	Code2Icon,
	GaugeIcon,
	GraduationCapIcon,
	LibraryIcon,
	Settings2Icon,
	ShieldCheckIcon,
	TrophyIcon,
} from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
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

const navMain = [
	{
		title: "Overview",
		url: "/dashboard",
		icon: <GaugeIcon />,
		isActive: true,
		items: [
			{ title: "Learning summary", url: "/dashboard" },
			{ title: "Weekly progress", url: "#progress" },
		],
	},
	{
		title: "My learning",
		url: "#learning",
		icon: <BookOpenIcon />,
		items: [
			{ title: "In progress", url: "#learning" },
			{ title: "Completed", url: "#" },
			{ title: "Bookmarks", url: "#" },
		],
	},
	{
		title: "Course library",
		url: "#",
		icon: <LibraryIcon />,
		items: [
			{ title: "All courses", url: "#" },
			{ title: "Learning paths", url: "#" },
		],
	},
	{
		title: "Settings",
		url: "#",
		icon: <Settings2Icon />,
		items: [
			{ title: "Profile", url: "#" },
			{ title: "Preferences", url: "#" },
		],
	},
];

const learningPaths = [
	{ name: "Full-Stack TypeScript", url: "#learning", icon: <Code2Icon /> },
	{ name: "Modern React", url: "#learning", icon: <GraduationCapIcon /> },
	{ name: "Achievements", url: "#", icon: <TrophyIcon /> },
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
				...navMain,
				{
					title: "Platform admin",
					url: "/platform-admin",
					icon: <ShieldCheckIcon />,
					items: [
						{ title: "Users", url: "/platform-admin#users" },
						{ title: "Organizations", url: "/platform-admin#organizations" },
					],
				},
			]
		: navMain;

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild size="lg">
							<a href="/">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/20">
									<Code2Icon className="size-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">DevLMS</span>
									<span className="truncate text-xs text-sidebar-foreground/60">
										Learn by building
									</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navigation} />
				<NavProjects projects={learningPaths} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser
					onSignOut={onSignOut}
					user={{ ...user, avatar: user.image ?? "" }}
				/>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
