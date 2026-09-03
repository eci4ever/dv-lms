"use client";

import {
	BadgeCheckIcon,
	BellIcon,
	ChevronsUpDownIcon,
	CreditCardIcon,
	LogOutIcon,
	SparklesIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({
	user,
	onSignOut,
}: {
	user: {
		name: string;
		email: string;
		avatar: string;
		role?: string | null;
	};
	onSignOut: () => void;
}) {
	const { isMobile } = useSidebar();
	const initials = user.name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
	const globalRole = user.role ?? "user";

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="rounded-lg">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<div className="flex min-w-0 items-center gap-2">
									<span className="truncate font-medium">{user.name}</span>
									<Badge className="h-4 shrink-0 border-blue-400/20 bg-blue-500/15 px-1.5 text-[9px] uppercase tracking-wide text-blue-300">
										{globalRole}
									</Badge>
								</div>
								<span className="truncate text-xs">{user.email}</span>
							</div>
							<ChevronsUpDownIcon className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="dark w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 border-slate-700 bg-[#0f172a] p-2 text-slate-100 shadow-xl shadow-black/30"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={user.avatar} alt={user.name} />
									<AvatarFallback className="rounded-lg">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.name}</span>
									<span className="truncate text-xs">{user.email}</span>
									<Badge className="mt-2 w-fit border-blue-400/20 bg-blue-500/15 text-[10px] uppercase tracking-wider text-blue-300">
										Global role: {globalRole}
									</Badge>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem className="gap-3 px-3 py-2.5">
								<SparklesIcon />
								Upgrade to Pro
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem className="gap-3 px-3 py-2.5">
								<BadgeCheckIcon />
								Account
							</DropdownMenuItem>
							<DropdownMenuItem className="gap-3 px-3 py-2.5">
								<CreditCardIcon />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem className="gap-3 px-3 py-2.5">
								<BellIcon />
								Notifications
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="gap-3 px-3 py-2.5 text-red-300 focus:text-red-200"
							onSelect={onSignOut}
						>
							<LogOutIcon />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
