import { WalletClientSigner } from "@aa-sdk/core";
import { alchemy, mainnet, sepolia } from "@account-kit/infra";
import { createLightAccountAlchemyClient } from "@account-kit/smart-contracts";
import { createWalletClient, custom } from "viem";
import type { GaslessClientConfig, GaslessClientResult } from "./types";

/**
 * Default configuration using environment variables.
 * Override these when calling createGaslessClient if needed.
 */
export function getDefaultConfig() {
	const isMainnet = import.meta.env.VITE_NETWORK === "mainnet";

	return {
		chain: isMainnet ? mainnet : sepolia,
		apiKey: isMainnet
			? (import.meta.env.VITE_ALCHEMY_KEY as string)
			: (import.meta.env.VITE_ALCHEMY_SEPOLIA_KEY as string),
		policyId: isMainnet
			? (import.meta.env.VITE_ALCHEMY_GAS_POLICY_ID as string)
			: (import.meta.env.VITE_ALCHEMY_GAS_POLICY_ID_SEPOLIA as string),
		isMainnet,
	};
}

/**
 * Creates an Alchemy Smart Account client that can send gasless transactions.
 * Uses the connected EOA (Rabby/MetaMask) as the owner/signer.
 *
 * @param config - Configuration options
 * @returns The smart account client ready to send sponsored transactions
 *
 * @example
 * ```ts
 * const { client, ownerAddress, smartAccountAddress } = await createGaslessClient({
 *   policyId: 'your-policy-id'
 * });
 *
 * // Send a sponsored transaction
 * const result = await client.sendUserOperation({
 *   uo: { target: '0x...', data: '0x', value: 0n }
 * });
 * ```
 */
export async function createGaslessClient(
	config: GaslessClientConfig,
): Promise<GaslessClientResult> {
	const defaults = getDefaultConfig();
	const chain = config.chain ?? defaults.chain;
	const apiKey = config.apiKey ?? defaults.apiKey;

	if (!apiKey) {
		throw new Error(
			"Alchemy API key is required. Set VITE_ALCHEMY_KEY or VITE_ALCHEMY_SEPOLIA_KEY",
		);
	}

	// Ensure we have an ethereum provider (Rabby/MetaMask)
	if (!window.ethereum) {
		throw new Error(
			"No ethereum provider found. Please connect Rabby or MetaMask wallet.",
		);
	}

	// Create a viem wallet client from the browser's ethereum provider
	const walletClient = createWalletClient({
		chain,
		transport: custom(window.ethereum),
	});

	// Get connected accounts - this may trigger a connection popup
	const [address] = await walletClient.getAddresses();
	if (!address) {
		throw new Error("No account connected. Please connect your wallet first.");
	}

	// Wrap the wallet client in a WalletClientSigner for AA-SDK
	const signer = new WalletClientSigner(walletClient, "browser-wallet");

	console.log("[GaslessClient] Creating Light Account client...", {
		chain: chain.name,
		ownerAddress: address,
		policyId: config.policyId,
	});

	// Create the Light Account client with Alchemy's Gas Manager
	const smartAccountClient = await createLightAccountAlchemyClient({
		transport: alchemy({ apiKey }),
		chain,
		signer,
		policyId: config.policyId, // This enables gas sponsorship
	});

	console.log("[GaslessClient] ✅ Client created!", {
		smartAccountAddress: smartAccountClient.account.address,
		ownerAddress: address,
	});

	return {
		client: smartAccountClient,
		ownerAddress: address,
		smartAccountAddress: smartAccountClient.account.address,
	};
}

