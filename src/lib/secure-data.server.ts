import { env } from "cloudflare:workers";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
	let value = "";
	for (const byte of bytes) value += String.fromCharCode(byte);
	return btoa(value);
}

function base64ToBytes(value: string) {
	return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function encryptionKey() {
	const runtimeEnv = env as typeof env & {
		PAYOUT_DATA_ENCRYPTION_KEY?: string;
	};
	const secret =
		runtimeEnv.PAYOUT_DATA_ENCRYPTION_KEY?.trim() ||
		env.BETTER_AUTH_SECRET?.trim();
	if (!secret) throw new Error("Bank data encryption is not configured.");
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
}

export async function encryptSensitive(value: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await encryptionKey(),
		encoder.encode(value),
	);
	return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptSensitive(value: string) {
	const [version, iv, ciphertext] = value.split(".");
	if (version !== "v1" || !iv || !ciphertext)
		throw new Error("Encrypted bank data is invalid.");
	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: base64ToBytes(iv) },
		await encryptionKey(),
		base64ToBytes(ciphertext),
	);
	return decoder.decode(plaintext);
}

export function bankAccountLast4(value: string) {
	return value.replace(/\s+/g, "").slice(-4);
}
