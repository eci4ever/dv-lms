import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { KeyRoundIcon, LoaderCircleIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/two-factor")({
	head: () => ({ meta: [{ title: "Two-factor authentication | DV LMS" }] }),
	beforeLoad: async () => {
		if (await getSession()) throw redirect({ to: "/dashboard" });
	},
	component: TwoFactorPage,
});

function TwoFactorPage() {
	const navigate = Route.useNavigate();
	const [method, setMethod] = useState<"totp" | "backup">("totp");
	const [code, setCode] = useState("");
	const [trustDevice, setTrustDevice] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	async function verify(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitting(true);
		const result =
			method === "totp"
				? await authClient.twoFactor.verifyTotp({ code, trustDevice })
				: await authClient.twoFactor.verifyBackupCode({ code, trustDevice });
		setSubmitting(false);
		if (result.error) {
			toast.error(
				result.error.message ??
					(method === "totp"
						? "That authenticator code is invalid."
						: "That backup code is invalid."),
			);
			return;
		}
		toast.success("Two-factor authentication complete.");
		await navigate({ to: "/dashboard" });
	}

	function switchMethod() {
		setMethod((current) => (current === "totp" ? "backup" : "totp"));
		setCode("");
	}

	return (
		<AuthLayout
			title="Confirm it’s you"
			description={
				method === "totp"
					? "Enter the six-digit code from your authenticator app."
					: "Enter one of the backup codes you saved during setup."
			}
			footer={
				<>
					Need to use another account?{" "}
					<Link
						className="font-medium text-foreground hover:underline"
						to="/login"
					>
						Return to login
					</Link>
				</>
			}
		>
			<form className="space-y-5" onSubmit={verify}>
				<div className="mx-auto grid size-11 place-items-center rounded-xl bg-muted">
					{method === "totp" ? (
						<ShieldCheckIcon className="size-5" />
					) : (
						<KeyRoundIcon className="size-5" />
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="two-factor-code">
						{method === "totp" ? "Authenticator code" : "Backup code"}
					</Label>
					<Input
						id="two-factor-code"
						value={code}
						onChange={(event) =>
							setCode(
								method === "totp"
									? event.target.value.replace(/\D/g, "").slice(0, 6)
									: event.target.value,
							)
						}
						inputMode={method === "totp" ? "numeric" : "text"}
						pattern={method === "totp" ? "[0-9]{6}" : undefined}
						autoComplete="one-time-code"
						placeholder={method === "totp" ? "000000" : "Backup code"}
						className="h-10 text-center font-mono tracking-widest"
						required
						autoFocus
					/>
				</div>
				<label
					htmlFor="trust-device"
					className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
				>
					<Checkbox
						id="trust-device"
						checked={trustDevice}
						onCheckedChange={setTrustDevice}
						className="mt-0.5"
					/>
					<span>
						<span className="block text-sm font-medium">Trust this device</span>
						<span className="mt-1 block text-xs leading-5 text-muted-foreground">
							Skip this step on this device for 30 days.
						</span>
					</span>
				</label>
				<Button
					type="submit"
					className="w-full"
					size="lg"
					disabled={submitting || (method === "totp" && code.length !== 6)}
				>
					{submitting ? <LoaderCircleIcon className="animate-spin" /> : null}
					Continue
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="w-full"
					onClick={switchMethod}
				>
					{method === "totp" ? "Use a backup code" : "Use authenticator app"}
				</Button>
			</form>
		</AuthLayout>
	);
}
