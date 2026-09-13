import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
	CheckCircle2Icon,
	ClipboardIcon,
	KeyRoundIcon,
	LaptopIcon,
	LoaderCircleIcon,
	MailCheckIcon,
	RefreshCwIcon,
	ShieldCheckIcon,
	SmartphoneIcon,
	Trash2Icon,
	UserRoundCogIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";

interface AccountSearch {
	error?: string;
	verified?: boolean;
}

interface AccountSession {
	createdAt: Date;
	expiresAt: Date;
	id: string;
	ipAddress?: string | null;
	token: string;
	userAgent?: string | null;
}

interface TwoFactorEnrollment {
	backupCodes: string[];
	totpURI: string;
}

export const Route = createFileRoute("/account")({
	head: () => ({ meta: [{ title: "Account | DV LMS" }] }),
	validateSearch: (search: Record<string, unknown>): AccountSearch => ({
		error: typeof search.error === "string" ? search.error : undefined,
		verified:
			search.verified === true || search.verified === "true" || undefined,
	}),
	beforeLoad: async () => {
		const dashboard = await getDashboardSession();
		if (!dashboard) throw redirect({ to: "/login" });
		return dashboard;
	},
	component: AccountPage,
});

function initialsFor(name: string) {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function describeDevice(userAgent?: string | null) {
	if (!userAgent) return "Unknown device";
	const browser = userAgent.includes("Edg/")
		? "Edge"
		: userAgent.includes("Chrome/")
			? "Chrome"
			: userAgent.includes("Firefox/")
				? "Firefox"
				: userAgent.includes("Safari/")
					? "Safari"
					: "Browser";
	const platform = userAgent.includes("Windows")
		? "Windows"
		: userAgent.includes("Mac OS")
			? "macOS"
			: userAgent.includes("Android")
				? "Android"
				: userAgent.includes("iPhone") || userAgent.includes("iPad")
					? "iOS"
					: userAgent.includes("Linux")
						? "Linux"
						: "Unknown platform";
	return `${browser} on ${platform}`;
}

function formatDate(value: Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function AccountPage() {
	const dashboard = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const { session } = dashboard;
	const user = session.user;
	const initials = useMemo(() => initialsFor(user.name), [user.name]);

	const [name, setName] = useState(user.name);
	const [image, setImage] = useState(user.image ?? "");
	const [savingProfile, setSavingProfile] = useState(false);
	const [sendingVerification, setSendingVerification] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [changingPassword, setChangingPassword] = useState(false);
	const [sessions, setSessions] = useState<AccountSession[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(true);
	const [revokingToken, setRevokingToken] = useState<string | null>(null);
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(
		Boolean(user.twoFactorEnabled),
	);
	const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
	const [twoFactorPassword, setTwoFactorPassword] = useState("");
	const [twoFactorCode, setTwoFactorCode] = useState("");
	const [twoFactorBusy, setTwoFactorBusy] = useState(false);
	const [enrollment, setEnrollment] = useState<TwoFactorEnrollment | null>(
		null,
	);
	const [showBackupCodes, setShowBackupCodes] = useState(false);

	const loadSessions = useCallback(async () => {
		setLoadingSessions(true);
		const result = await authClient.listSessions();
		if (result.error) {
			toast.error(result.error.message ?? "Unable to load your sessions.");
		} else {
			setSessions((result.data ?? []) as AccountSession[]);
		}
		setLoadingSessions(false);
	}, []);

	useEffect(() => {
		void loadSessions();
	}, [loadSessions]);

	useEffect(() => {
		if (!search.verified && !search.error) return;
		if (search.verified) {
			toast.success("Your email address has been verified.");
		} else {
			toast.error(search.error ?? "Email verification failed.");
		}
		void navigate({ replace: true, search: {} });
	}, [navigate, search.error, search.verified]);

	async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextName = name.trim();
		if (!nextName) {
			toast.error("Name is required.");
			return;
		}
		setSavingProfile(true);
		const result = await authClient.updateUser({
			image: image.trim() || null,
			name: nextName,
		});
		setSavingProfile(false);
		if (result.error) {
			toast.error(result.error.message ?? "Unable to update your profile.");
			return;
		}
		toast.success("Profile updated.");
		await router.invalidate();
	}

	async function sendVerification() {
		setSendingVerification(true);
		const result = await authClient.sendVerificationEmail({
			callbackURL: `${window.location.origin}/account?verified=true`,
			email: user.email,
		});
		setSendingVerification(false);
		if (result.error) {
			toast.error(result.error.message ?? "Unable to send verification email.");
			return;
		}
		toast.success("Verification email sent. Check your inbox.");
	}

	async function changePassword(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (newPassword.length < 8) {
			toast.error("New password must be at least 8 characters.");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match.");
			return;
		}
		setChangingPassword(true);
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true,
		});
		setChangingPassword(false);
		if (result.error) {
			toast.error(result.error.message ?? "Unable to change your password.");
			return;
		}
		setCurrentPassword("");
		setNewPassword("");
		setConfirmPassword("");
		toast.success("Password changed and other sessions signed out.");
		await loadSessions();
	}

	async function revokeSession(token: string) {
		setRevokingToken(token);
		const result = await authClient.revokeSession({ token });
		setRevokingToken(null);
		if (result.error) {
			toast.error(result.error.message ?? "Unable to revoke this session.");
			return;
		}
		toast.success("Session signed out.");
		await loadSessions();
	}

	async function revokeOtherSessions() {
		setRevokingToken("all-other-sessions");
		const result = await authClient.revokeOtherSessions();
		setRevokingToken(null);
		if (result.error) {
			toast.error(result.error.message ?? "Unable to revoke other sessions.");
			return;
		}
		toast.success("All other sessions signed out.");
		await loadSessions();
	}

	function closeTwoFactorDialog(open: boolean) {
		setTwoFactorDialogOpen(open);
		if (!open) {
			if (showBackupCodes) setTwoFactorEnabled(true);
			setEnrollment(null);
			setShowBackupCodes(false);
			setTwoFactorPassword("");
			setTwoFactorCode("");
		}
	}

	async function beginTwoFactor(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setTwoFactorBusy(true);
		const result = await authClient.twoFactor.enable({
			issuer: "DV LMS",
			method: "totp",
			password: twoFactorPassword,
		});
		setTwoFactorBusy(false);
		if (result.error) {
			toast.error(result.error.message ?? "Unable to start 2FA setup.");
			return;
		}
		if (result.data.method !== "totp") {
			toast.error("Authenticator setup is unavailable.");
			return;
		}
		setEnrollment({
			backupCodes: result.data.backupCodes,
			totpURI: result.data.totpURI,
		});
		setTwoFactorPassword("");
	}

	async function confirmTwoFactor(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setTwoFactorBusy(true);
		const result = await authClient.twoFactor.verifyTotp({
			code: twoFactorCode,
			trustDevice: true,
		});
		setTwoFactorBusy(false);
		if (result.error) {
			toast.error(
				result.error.message ?? "That authenticator code is invalid.",
			);
			return;
		}
		setShowBackupCodes(true);
		setTwoFactorCode("");
		toast.success("Two-factor authentication enabled.");
		await router.invalidate();
	}

	async function disableTwoFactor(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setTwoFactorBusy(true);
		const result = await authClient.twoFactor.disable({
			password: twoFactorPassword,
		});
		setTwoFactorBusy(false);
		if (result.error) {
			toast.error(result.error.message ?? "Unable to disable 2FA.");
			return;
		}
		setTwoFactorEnabled(false);
		closeTwoFactorDialog(false);
		toast.success("Two-factor authentication disabled.");
		await router.invalidate();
	}

	async function copyBackupCodes() {
		if (!enrollment) return;
		await navigator.clipboard.writeText(enrollment.backupCodes.join("\n"));
		toast.success("Backup codes copied.");
	}

	const authenticatorSecret = useMemo(() => {
		if (!enrollment) return "";
		try {
			return new URL(enrollment.totpURI).searchParams.get("secret") ?? "";
		} catch {
			return "";
		}
	}, [enrollment]);

	return (
		<SidebarProvider>
			<AppSidebar
				user={user}
				organizations={dashboard.organizations}
				activeOrganizationId={dashboard.activeOrganizationId}
				isOrganizationOwner={dashboard.isOrganizationOwner}
				organizationRole={dashboard.organizationRole}
				isImpersonating={Boolean(session.session.impersonatedBy)}
				activeItem="account"
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-vertical:h-4 data-vertical:self-center"
					/>
					<p className="text-sm font-medium">Account</p>
				</header>

				<main className="flex flex-1 p-4 sm:p-6 lg:p-8">
					<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
						<div className="flex items-start gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card">
								<UserRoundCogIcon className="size-5" />
							</div>
							<div className="space-y-1">
								<h1 className="text-2xl font-semibold tracking-tight">
									Account settings
								</h1>
								<p className="text-sm leading-6 text-muted-foreground">
									Manage your profile, sign-in security, and active sessions.
								</p>
							</div>
						</div>

						<div className="grid items-start gap-6 lg:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>Profile</CardTitle>
									<CardDescription>
										Update the name and avatar shown across DV LMS.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<form className="space-y-5" onSubmit={saveProfile}>
										<div className="flex items-center gap-4">
											<Avatar className="size-14">
												<AvatarImage src={image || undefined} alt={name} />
												<AvatarFallback>{initials}</AvatarFallback>
											</Avatar>
											<div>
												<p className="font-medium">{user.name}</p>
												<p className="text-sm text-muted-foreground">
													{user.email}
												</p>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="account-name">Name</Label>
											<Input
												id="account-name"
												value={name}
												onChange={(event) => setName(event.target.value)}
												autoComplete="name"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="account-avatar">Avatar URL</Label>
											<Input
												id="account-avatar"
												value={image}
												onChange={(event) => setImage(event.target.value)}
												placeholder="https://example.com/avatar.jpg"
												type="url"
											/>
										</div>
										<Button type="submit" disabled={savingProfile}>
											{savingProfile ? (
												<LoaderCircleIcon className="animate-spin" />
											) : null}
											Save profile
										</Button>
									</form>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Email address</CardTitle>
									<CardDescription>
										Verify your email so your account can receive trusted
										notices.
									</CardDescription>
									<CardAction>
										<Badge
											variant={user.emailVerified ? "secondary" : "outline"}
										>
											{user.emailVerified ? "Verified" : "Unverified"}
										</Badge>
									</CardAction>
								</CardHeader>
								<CardContent className="space-y-5">
									<div className="flex items-center gap-3 rounded-lg border p-3">
										<MailCheckIcon className="size-5 text-muted-foreground" />
										<p className="min-w-0 flex-1 truncate font-medium">
											{user.email}
										</p>
									</div>
									{user.emailVerified ? (
										<p className="flex items-center gap-2 text-sm text-muted-foreground">
											<CheckCircle2Icon className="size-4 text-emerald-600" />
											Your email address is verified.
										</p>
									) : (
										<Button
											type="button"
											variant="outline"
											disabled={sendingVerification}
											onClick={sendVerification}
										>
											{sendingVerification ? (
												<LoaderCircleIcon className="animate-spin" />
											) : (
												<MailCheckIcon />
											)}
											Send verification email
										</Button>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Password</CardTitle>
									<CardDescription>
										Choose a strong password you do not use elsewhere.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<form className="space-y-4" onSubmit={changePassword}>
										<div className="space-y-2">
											<Label htmlFor="current-password">Current password</Label>
											<Input
												id="current-password"
												type="password"
												value={currentPassword}
												onChange={(event) =>
													setCurrentPassword(event.target.value)
												}
												autoComplete="current-password"
												required
											/>
										</div>
										<div className="grid gap-4 sm:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="new-password">New password</Label>
												<Input
													id="new-password"
													type="password"
													value={newPassword}
													onChange={(event) =>
														setNewPassword(event.target.value)
													}
													autoComplete="new-password"
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="confirm-password">
													Confirm password
												</Label>
												<Input
													id="confirm-password"
													type="password"
													value={confirmPassword}
													onChange={(event) =>
														setConfirmPassword(event.target.value)
													}
													autoComplete="new-password"
													required
												/>
											</div>
										</div>
										<Button type="submit" disabled={changingPassword}>
											{changingPassword ? (
												<LoaderCircleIcon className="animate-spin" />
											) : (
												<KeyRoundIcon />
											)}
											Change password
										</Button>
									</form>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Two-factor authentication</CardTitle>
									<CardDescription>
										Require an authenticator code when you sign in.
									</CardDescription>
									<CardAction>
										<Badge variant={twoFactorEnabled ? "secondary" : "outline"}>
											{twoFactorEnabled ? "Enabled" : "Disabled"}
										</Badge>
									</CardAction>
								</CardHeader>
								<CardContent className="space-y-5">
									<div className="flex items-center gap-3 rounded-lg border p-3">
										<ShieldCheckIcon className="size-5 text-muted-foreground" />
										<p className="text-sm text-muted-foreground">
											{twoFactorEnabled
												? "Your account is protected with an authenticator app."
												: "Add a second step to protect your account."}
										</p>
									</div>
									<Button
										type="button"
										variant={twoFactorEnabled ? "outline" : "default"}
										onClick={() => setTwoFactorDialogOpen(true)}
									>
										<ShieldCheckIcon />
										{twoFactorEnabled ? "Disable 2FA" : "Set up 2FA"}
									</Button>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Active sessions</CardTitle>
								<CardDescription>
									Review devices signed in to your account and remove access.
								</CardDescription>
								<CardAction className="flex gap-2">
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={loadSessions}
										disabled={loadingSessions}
										aria-label="Refresh sessions"
									>
										<RefreshCwIcon
											className={loadingSessions ? "animate-spin" : undefined}
										/>
									</Button>
									{sessions.length > 1 ? (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={revokeOtherSessions}
											disabled={revokingToken === "all-other-sessions"}
										>
											Sign out others
										</Button>
									) : null}
								</CardAction>
							</CardHeader>
							<CardContent>
								{loadingSessions ? (
									<div className="flex min-h-24 items-center justify-center text-muted-foreground">
										<LoaderCircleIcon className="size-5 animate-spin" />
									</div>
								) : sessions.length === 0 ? (
									<p className="py-6 text-center text-sm text-muted-foreground">
										No active sessions found.
									</p>
								) : (
									<div className="divide-y rounded-lg border">
										{sessions.map((activeSession) => {
											const isCurrent = activeSession.id === session.session.id;
											const isMobile = /Android|iPhone|iPad/i.test(
												activeSession.userAgent ?? "",
											);
											const DeviceIcon = isMobile ? SmartphoneIcon : LaptopIcon;
											return (
												<div
													key={activeSession.id}
													className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
												>
													<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
														<DeviceIcon className="size-4" />
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex flex-wrap items-center gap-2">
															<p className="font-medium">
																{describeDevice(activeSession.userAgent)}
															</p>
															{isCurrent ? (
																<Badge variant="secondary">Current</Badge>
															) : null}
														</div>
														<p className="mt-1 text-xs text-muted-foreground">
															{activeSession.ipAddress ?? "IP unavailable"} ·
															Signed in {formatDate(activeSession.createdAt)} ·
															Expires {formatDate(activeSession.expiresAt)}
														</p>
													</div>
													{!isCurrent ? (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => revokeSession(activeSession.token)}
															disabled={revokingToken === activeSession.token}
														>
															<Trash2Icon />
															Sign out
														</Button>
													) : null}
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</main>
			</SidebarInset>

			<Dialog open={twoFactorDialogOpen} onOpenChange={closeTwoFactorDialog}>
				<DialogContent className="sm:max-w-md">
					{twoFactorEnabled ? (
						<form onSubmit={disableTwoFactor} className="contents">
							<DialogHeader>
								<DialogTitle>Disable two-factor authentication</DialogTitle>
								<DialogDescription>
									Enter your password to remove authenticator protection from
									your account.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="disable-2fa-password">Current password</Label>
								<Input
									id="disable-2fa-password"
									type="password"
									value={twoFactorPassword}
									onChange={(event) => setTwoFactorPassword(event.target.value)}
									autoComplete="current-password"
									required
								/>
							</div>
							<DialogFooter>
								<Button
									type="submit"
									variant="destructive"
									disabled={twoFactorBusy}
								>
									{twoFactorBusy ? (
										<LoaderCircleIcon className="animate-spin" />
									) : null}
									Disable 2FA
								</Button>
							</DialogFooter>
						</form>
					) : showBackupCodes && enrollment ? (
						<>
							<DialogHeader>
								<DialogTitle>Save your backup codes</DialogTitle>
								<DialogDescription>
									Store these one-time codes somewhere safe. Each code can be
									used once if you lose your authenticator.
								</DialogDescription>
							</DialogHeader>
							<div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 font-mono text-xs">
								{enrollment.backupCodes.map((code) => (
									<span key={code}>{code}</span>
								))}
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={copyBackupCodes}
								>
									<ClipboardIcon />
									Copy codes
								</Button>
								<Button
									type="button"
									onClick={() => closeTwoFactorDialog(false)}
								>
									Done
								</Button>
							</DialogFooter>
						</>
					) : enrollment ? (
						<form onSubmit={confirmTwoFactor} className="contents">
							<DialogHeader>
								<DialogTitle>Scan the QR code</DialogTitle>
								<DialogDescription>
									Add DV LMS to your authenticator app, then enter the six-digit
									code it shows.
								</DialogDescription>
							</DialogHeader>
							<div className="mx-auto rounded-xl bg-white p-3">
								<QRCodeSVG value={enrollment.totpURI} size={176} />
							</div>
							{authenticatorSecret ? (
								<div className="space-y-1 text-center">
									<p className="text-xs text-muted-foreground">
										Manual setup key
									</p>
									<code className="break-all text-xs">
										{authenticatorSecret}
									</code>
								</div>
							) : null}
							<div className="space-y-2">
								<Label htmlFor="setup-2fa-code">Authenticator code</Label>
								<Input
									id="setup-2fa-code"
									value={twoFactorCode}
									onChange={(event) =>
										setTwoFactorCode(
											event.target.value.replace(/\D/g, "").slice(0, 6),
										)
									}
									inputMode="numeric"
									pattern="[0-9]{6}"
									autoComplete="one-time-code"
									placeholder="000000"
									required
								/>
							</div>
							<DialogFooter>
								<Button
									type="submit"
									disabled={twoFactorBusy || twoFactorCode.length !== 6}
								>
									{twoFactorBusy ? (
										<LoaderCircleIcon className="animate-spin" />
									) : null}
									Verify and enable
								</Button>
							</DialogFooter>
						</form>
					) : (
						<form onSubmit={beginTwoFactor} className="contents">
							<DialogHeader>
								<DialogTitle>Set up two-factor authentication</DialogTitle>
								<DialogDescription>
									Confirm your password before connecting an authenticator app.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="enable-2fa-password">Current password</Label>
								<Input
									id="enable-2fa-password"
									type="password"
									value={twoFactorPassword}
									onChange={(event) => setTwoFactorPassword(event.target.value)}
									autoComplete="current-password"
									required
								/>
							</div>
							<DialogFooter>
								<Button type="submit" disabled={twoFactorBusy}>
									{twoFactorBusy ? (
										<LoaderCircleIcon className="animate-spin" />
									) : null}
									Continue
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	);
}
