import { env } from "cloudflare:workers";

const encoder = new TextEncoder();

function config() {
	const secretKey = env.BILLPLZ_SECRET_KEY?.trim();
	const xSignatureKey = env.BILLPLZ_X_SIGNATURE_KEY?.trim();
	const collectionId = env.BILLPLZ_COLLECTION_ID?.trim();
	if (!secretKey || !xSignatureKey || !collectionId)
		throw new Error("Billplz Sandbox is not configured.");
	const sandbox = env.BILLPLZ_MODE?.trim() !== "production";
	return {
		secretKey,
		xSignatureKey,
		collectionId,
		apiBase: sandbox
			? "https://www.billplz-sandbox.com/api"
			: "https://www.billplz.com/api",
	};
}

function authorization(secretKey: string) {
	return `Basic ${btoa(`${secretKey}:`)}`;
}

async function jsonResponse(response: Response) {
	const body = (await response.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!response.ok) {
		const message =
			body && typeof body.error === "string"
				? body.error
				: `Billplz returned HTTP ${response.status}.`;
		throw new Error(message);
	}
	if (!body) throw new Error("Billplz returned an invalid response.");
	return body;
}

export async function createBillplzBill(input: {
	orderId: string;
	name: string;
	email: string;
	amountInSen: number;
	description: string;
	callbackUrl: string;
	redirectUrl: string;
}) {
	const settings = config();
	const form = new URLSearchParams({
		collection_id: settings.collectionId,
		email: input.email,
		name: input.name,
		amount: String(input.amountInSen),
		description: input.description.slice(0, 200),
		callback_url: input.callbackUrl,
		redirect_url: input.redirectUrl,
		reference_1_label: "Order ID",
		reference_1: input.orderId,
	});
	const response = await fetch(`${settings.apiBase}/v3/bills`, {
		method: "POST",
		headers: {
			Authorization: authorization(settings.secretKey),
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: form,
	});
	const body = await jsonResponse(response);
	if (typeof body.id !== "string" || typeof body.url !== "string")
		throw new Error("Billplz did not return a bill URL.");
	return { id: body.id, url: body.url };
}

export async function deleteBillplzBill(id: string) {
	const settings = config();
	const response = await fetch(`${settings.apiBase}/v3/bills/${id}`, {
		method: "DELETE",
		headers: { Authorization: authorization(settings.secretKey) },
	});
	return response.ok;
}

export function billplzCollectionId() {
	return config().collectionId;
}

function signatureSource(parameters: URLSearchParams) {
	return [...parameters.entries()]
		.filter(([key]) => key.toLowerCase() !== "x_signature")
		.map(([key, value]) => `${key}${value}`)
		.sort((left, right) =>
			left.toLowerCase().localeCompare(right.toLowerCase()),
		)
		.join("|");
}

function hexBytes(value: string) {
	return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) =>
		Number.parseInt(byte, 16),
	);
}

export async function verifyBillplzSignature(parameters: URLSearchParams) {
	const supplied = parameters.get("x_signature")?.toLowerCase();
	if (!supplied || !/^[a-f0-9]{64}$/.test(supplied)) return false;
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(config().xSignatureKey),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);
	return crypto.subtle.verify(
		"HMAC",
		key,
		hexBytes(supplied),
		encoder.encode(signatureSource(parameters)),
	);
}
