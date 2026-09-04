"use client";

import { Link, useRouterState } from "@tanstack/react-router";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

type StaticNavPath =
	| "/"
	| "/dashboard"
	| "/account"
	| "/platform-admin"
	| "/platform-admin/courses";

export type NavItem = {
	title: string;
	url: string;
	icon: React.ReactNode;
} & (
	| { to: StaticNavPath; hash?: string }
	| { to: "/learn/$courseSlug"; courseSlug: string }
);

export function NavMain({ items }: { items: NavItem[] }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Workspace</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					const isActive =
						item.url === "/"
							? pathname === "/"
							: pathname === item.url || pathname.startsWith(`${item.url}/`);
					return (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								isActive={isActive}
								tooltip={item.title}
							>
								{item.to === "/learn/$courseSlug" ? (
									<Link to={item.to} params={{ courseSlug: item.courseSlug }}>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								) : (
									<Link hash={item.hash} to={item.to}>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								)}
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
