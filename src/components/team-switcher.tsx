"use client";

import { useRouter } from "@tanstack/react-router";
import { Building2Icon, ChevronsUpDownIcon } from "lucide-react";
import * as React from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function TeamSwitcher({
	organizations,
	activeOrganizationId,
}: {
	organizations: {
		id: string;
		name: string;
		logo?: string | null;
	}[];
	activeOrganizationId?: string | null;
}) {
	const { isMobile } = useSidebar();
	const router = useRouter();
	const activeOrganization =
		organizations.find(
			(organization) => organization.id === activeOrganizationId,
		) ?? organizations[0];
	const [isSwitching, startTransition] = React.useTransition();

	if (!activeOrganization) {
		return null;
	}

	function selectOrganization(organizationId: string) {
		startTransition(async () => {
			const result = await authClient.organization.setActive({
				organizationId,
			});
			if (!result.error) {
				await router.invalidate({ sync: true });
			}
		});
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								size="lg"
								className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
							/>
						}
					>
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							{activeOrganization.logo ? (
								<img
									src={activeOrganization.logo}
									alt=""
									className="size-5 rounded"
								/>
							) : (
								<Building2Icon className="size-4" />
							)}
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">
								{activeOrganization.name}
							</span>
							<span className="truncate text-xs">Organization</span>
						</div>
						<ChevronsUpDownIcon className="ml-auto" />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-fit"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-xs text-muted-foreground">
								Organizations
							</DropdownMenuLabel>
							{organizations.map((organization) => (
								<DropdownMenuItem
									key={organization.id}
									disabled={isSwitching}
									onClick={() => selectOrganization(organization.id)}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-md border">
										{organization.logo ? (
											<img
												src={organization.logo}
												alt=""
												className="size-4 rounded"
											/>
										) : (
											<Building2Icon className="size-3.5" />
										)}
									</div>
									{organization.name}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
