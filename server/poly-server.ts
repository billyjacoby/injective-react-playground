import {
	BuilderApiKeyCreds,
	buildHmacSignature,
} from "@polymarket/builder-signing-sdk";

const key = process.env.POLYMARKET_API_KEY || "";
const secret = process.env.POLYMARKET_API_SECRET || "";
const passphrase = process.env.POLYMARKET_API_PASSPHRASE || "";

if (!key || !secret || !passphrase) {
	throw new Error(
		"POLYMARKET_API_KEY, POLYMARKET_API_SECRET, and POLYMARKET_API_PASSPHRASE must be set",
	);
}

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
	key,
	secret,
	passphrase,
};

type SignRequest = {
	method: string;
	path: string;
	body?: string;
};

// POST /sign - receives { method, path, body } from the client SDK
export async function handleSignRequest(request: Request): Promise<{
	POLY_BUILDER_SIGNATURE: string;
	POLY_BUILDER_TIMESTAMP: string;
	POLY_BUILDER_API_KEY: string;
	POLY_BUILDER_PASSPHRASE: string;
}> {
	const { method, path, body }: SignRequest = await request.json();
	console.log("🪵 | handleSignRequest | method:", method, "path:", path);

	const timestamp = Date.now().toString();

	const signature = buildHmacSignature(
		BUILDER_CREDENTIALS.secret,
		parseInt(timestamp),
		method,
		path,
		body,
	);

	return {
		POLY_BUILDER_SIGNATURE: signature,
		POLY_BUILDER_TIMESTAMP: timestamp,
		POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
		POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
	};
}
