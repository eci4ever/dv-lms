import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { auth } from "@/lib/auth";
import * as schema from "@/lib/auth-schema";
import { writeAudit } from "@/lib/platform.server";
import { bankAccountLast4, encryptSensitive } from "@/lib/secure-data.server";

const db = drizzle(env.DB, { schema });

function values(input: unknown) {
	if (!input || typeof input !== "object" || Array.isArray(input))
		throw new Error("Invalid request.");
	return input as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 120) {
	const result = typeof value === "string" ? value.trim() : "";
	if (!result) throw new Error(`${label} is required.`);
	if (result.length > max) throw new Error(`${label} is too long.`);
	return result;
}
async function session() {
	const headers = getRequestHeaders();
	const current = await auth.api.getSession({ headers });
	if (!current) throw new Error("Authentication required.");
	return { headers, current };
}
async function owner() {
	const context = await session();
	const organizations = await auth.api.listOrganizations({
		headers: context.headers,
	});
	const organizationId =
		context.current.session.activeOrganizationId &&
		organizations.some(
			(item) => item.id === context.current.session.activeOrganizationId,
		)
			? context.current.session.activeOrganizationId
			: organizations[0]?.id;
	if (!organizationId) throw new Error("Select an organization first.");
	const organization = await auth.api.getFullOrganization({
		headers: context.headers,
		query: { organizationId },
	});
	const role = organization?.members.find(
		(item) => item.userId === context.current.user.id,
	)?.role;
	if (!role?.split(",").includes("owner"))
		throw new Error("Organization owner access is required.");
	return { ...context, organizationId };
}
async function admin() {
	const context = await session();
	if (
		!context.current.user.role?.split(",").includes("admin") ||
		context.current.session.impersonatedBy
	)
		throw new Error("Platform administrator access is required.");
	return context.current;
}

export const getCreatorPayouts = createServerFn({ method: "GET" }).handler(
	async () => {
		const { organizationId } = await owner();
		const [profile] = await db
			.select({
				accountHolderName: schema.creatorPayoutProfile.accountHolderName,
				bankName: schema.creatorPayoutProfile.bankName,
				bankAccountLast4: schema.creatorPayoutProfile.bankAccountLast4,
			})
			.from(schema.creatorPayoutProfile)
			.where(eq(schema.creatorPayoutProfile.organizationId, organizationId))
			.limit(1);
		const [balance] = await db
			.select({
				amount: sql<number>`coalesce(sum(${schema.creatorLedgerEntry.amountInSen}), 0)`,
			})
			.from(schema.creatorLedgerEntry)
			.where(eq(schema.creatorLedgerEntry.organizationId, organizationId));
		const entries = await db
			.select()
			.from(schema.creatorLedgerEntry)
			.where(eq(schema.creatorLedgerEntry.organizationId, organizationId))
			.orderBy(desc(schema.creatorLedgerEntry.createdAt));
		const payouts = await db
			.select()
			.from(schema.creatorPayout)
			.where(eq(schema.creatorPayout.organizationId, organizationId))
			.orderBy(desc(schema.creatorPayout.createdAt));
		return {
			profile: profile ?? null,
			balanceInSen: Number(balance?.amount ?? 0),
			entries,
			payouts,
		};
	},
);

export const saveCreatorPayoutProfile = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const data = values(input);
		return {
			accountHolderName: text(data.accountHolderName, "Account holder"),
			bankName: text(data.bankName, "Bank"),
			bankAccountNumber: text(data.bankAccountNumber, "Bank account", 40),
		};
	})
	.handler(async ({ data }) => {
		const { organizationId, current } = await owner();
		const account = data.bankAccountNumber.replace(/[\s-]+/g, "");
		if (!/^\d{6,24}$/.test(account))
			throw new Error("Enter a valid bank account number.");
		await db
			.insert(schema.creatorPayoutProfile)
			.values({
				organizationId,
				accountHolderName: data.accountHolderName,
				bankName: data.bankName,
				bankAccountEncrypted: await encryptSensitive(account),
				bankAccountLast4: bankAccountLast4(account),
				updatedBy: current.user.id,
			})
			.onConflictDoUpdate({
				target: schema.creatorPayoutProfile.organizationId,
				set: {
					accountHolderName: data.accountHolderName,
					bankName: data.bankName,
					bankAccountEncrypted: await encryptSensitive(account),
					bankAccountLast4: bankAccountLast4(account),
					updatedBy: current.user.id,
					updatedAt: new Date(),
				},
			});
		return { saved: true };
	});

export const listAdminPayouts = createServerFn({ method: "GET" }).handler(
	async () => {
		await admin();
		const organizations = await db
			.select({
				id: schema.organization.id,
				name: schema.organization.name,
				balanceInSen: sql<number>`coalesce((select sum(cle.amount_in_sen) from creator_ledger_entry cle where cle.organization_id = ${schema.organization.id}), 0)`,
				accountHolderName: schema.creatorPayoutProfile.accountHolderName,
				bankName: schema.creatorPayoutProfile.bankName,
				bankAccountLast4: schema.creatorPayoutProfile.bankAccountLast4,
			})
			.from(schema.organization)
			.leftJoin(
				schema.creatorPayoutProfile,
				eq(schema.organization.id, schema.creatorPayoutProfile.organizationId),
			);
		const safeOrganizations = organizations.map((item) => ({
			...item,
			balanceInSen: Number(item.balanceInSen),
		}));
		const payouts = await db
			.select({
				id: schema.creatorPayout.id,
				organizationId: schema.creatorPayout.organizationId,
				organizationName: schema.organization.name,
				amountInSen: schema.creatorPayout.amountInSen,
				status: schema.creatorPayout.status,
				transferReference: schema.creatorPayout.transferReference,
				failureReason: schema.creatorPayout.failureReason,
				createdAt: schema.creatorPayout.createdAt,
				processedAt: schema.creatorPayout.processedAt,
			})
			.from(schema.creatorPayout)
			.innerJoin(
				schema.organization,
				eq(schema.creatorPayout.organizationId, schema.organization.id),
			)
			.orderBy(desc(schema.creatorPayout.createdAt));
		return { organizations: safeOrganizations, payouts };
	},
);

export const createCreatorPayout = createServerFn({ method: "POST" })
	.validator((input: unknown) => ({
		organizationId: text(values(input).organizationId, "Organization"),
	}))
	.handler(async ({ data }) => {
		const current = await admin();
		const [profile] = await db
			.select({ id: schema.creatorPayoutProfile.organizationId })
			.from(schema.creatorPayoutProfile)
			.where(
				eq(schema.creatorPayoutProfile.organizationId, data.organizationId),
			)
			.limit(1);
		if (!profile) throw new Error("Creator payout bank details are missing.");
		const [open] = await db
			.select({ id: schema.creatorPayout.id })
			.from(schema.creatorPayout)
			.where(
				and(
					eq(schema.creatorPayout.organizationId, data.organizationId),
					inArray(schema.creatorPayout.status, ["draft", "processing"]),
				),
			)
			.limit(1);
		if (open) throw new Error("This creator already has an open payout.");
		const [balance] = await db
			.select({
				amount: sql<number>`coalesce(sum(${schema.creatorLedgerEntry.amountInSen}), 0)`,
			})
			.from(schema.creatorLedgerEntry)
			.where(eq(schema.creatorLedgerEntry.organizationId, data.organizationId));
		const amount = Number(balance?.amount ?? 0);
		if (amount <= 0) throw new Error("No creator balance is available.");
		const id = crypto.randomUUID();
		await db.insert(schema.creatorPayout).values({
			id,
			organizationId: data.organizationId,
			amountInSen: amount,
			createdBy: current.user.id,
		});
		return { id, amountInSen: amount };
	});

export const updateCreatorPayout = createServerFn({ method: "POST" })
	.validator((input: unknown) => {
		const data = values(input);
		const status = data.status;
		if (status !== "processing" && status !== "paid" && status !== "failed")
			throw new Error("Invalid payout status.");
		return {
			id: text(data.id, "Payout"),
			status,
			reference:
				typeof data.reference === "string" ? data.reference.trim() : "",
			reason: typeof data.reason === "string" ? data.reason.trim() : "",
		};
	})
	.handler(async ({ data }) => {
		const current = await admin();
		const [payout] = await db
			.select()
			.from(schema.creatorPayout)
			.where(eq(schema.creatorPayout.id, data.id))
			.limit(1);
		if (!payout || payout.status === "paid")
			throw new Error("Payout cannot be updated.");
		if (data.status === "paid" && !data.reference)
			throw new Error("Transfer reference is required.");
		if (data.status === "failed" && !data.reason)
			throw new Error("Failure reason is required.");
		const now = new Date();
		const update = db
			.update(schema.creatorPayout)
			.set({
				status: data.status,
				transferReference: data.reference || null,
				failureReason: data.reason || null,
				processedBy: current.user.id,
				processedAt: data.status === "processing" ? null : now,
				updatedAt: now,
			})
			.where(eq(schema.creatorPayout.id, payout.id));
		if (data.status === "paid")
			await db.batch([
				update,
				db.insert(schema.creatorLedgerEntry).values({
					id: crypto.randomUUID(),
					organizationId: payout.organizationId,
					payoutId: payout.id,
					type: "payout",
					amountInSen: -payout.amountInSen,
					currency: payout.currency,
					description: `Payout ${payout.id}`,
				}),
			]);
		else await update;
		await writeAudit({
			actorId: current.user.id,
			organizationId: payout.organizationId,
			action: `payout.${data.status}`,
			resourceType: "creator_payout",
			resourceId: payout.id,
			metadata: { reference: data.reference || undefined },
		});
		return { status: data.status };
	});
