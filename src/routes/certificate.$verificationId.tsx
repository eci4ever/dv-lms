import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { verifyCertificate } from "@/lib/certificate.functions";

export const Route = createFileRoute("/certificate/$verificationId")({
	loader: ({ params }) =>
		verifyCertificate({ data: { verificationId: params.verificationId } }),
	component: CertificateVerificationPage,
});

function CertificateVerificationPage() {
	const certificate = Route.useLoaderData();
	return (
		<main className="dark grid min-h-screen place-items-center bg-[#080d1a] p-6 text-white">
			<section className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900/60 p-8 text-center shadow-2xl sm:p-12">
				<span className="mx-auto grid size-16 place-items-center rounded-full bg-cyan-400/10 text-cyan-300">
					<Award className="size-8" />
				</span>
				{certificate ? (
					<>
						<div className="mt-6 flex items-center justify-center gap-2 text-emerald-300">
							<CheckCircle2 className="size-5" />
							<span className="font-medium">Verified certificate</span>
						</div>
						<h1 className="mt-5 text-3xl font-semibold">
							{certificate.learnerName}
						</h1>
						<p className="mt-3 text-slate-400">successfully completed</p>
						<p className="mt-2 text-xl font-medium">
							{certificate.courseTitle}
						</p>
						<p className="mt-6 font-mono text-xs text-slate-500">
							Issued {certificate.issuedAt.toLocaleDateString("en-MY")} ·{" "}
							{certificate.verificationId}
						</p>
					</>
				) : (
					<>
						<div className="mt-6 flex items-center justify-center gap-2 text-red-300">
							<XCircle className="size-5" />
							<span className="font-medium">Certificate not found</span>
						</div>
						<h1 className="mt-5 text-3xl font-semibold">Unable to verify</h1>
						<p className="mt-3 text-slate-400">
							Check the verification link or ask the learner for the original
							certificate URL.
						</p>
					</>
				)}
				<Button asChild className="mt-8" variant="outline">
					<Link to="/courses">Explore courses</Link>
				</Button>
			</section>
		</main>
	);
}
