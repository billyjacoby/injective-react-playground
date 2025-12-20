import { toLightSmartAccount } from "permissionless/accounts";
import {
	type Address,
	createPublicClient,
	createWalletClient,
	custom,
	http,
} from "viem";
import {
	createBundlerClient,
	createPaymasterClient,
	type SmartAccount,
} from "viem/account-abstraction";
import { toAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
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
 * Gets the Alchemy RPC URL for the given chain
 */
function getAlchemyRpcUrl(chainId: number, apiKey: string): string {
	const chainUrls: Record<number, string> = {
		1: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
		11155111: `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
	};
	return chainUrls[chainId] ?? chainUrls[11155111];
}

/**
 * Creates a gasless client using viem + permissionless.
 * Uses the connected EOA (Rabby/MetaMask) as the owner/signer.
 *
 * @param config - Configuration options
 * @returns The smart account and bundler client ready to send sponsored transactions
 *
 * @example
 * ```ts
 * const { bundlerClient, account, ownerAddress, smartAccountAddress } = await createGaslessClient({
 *   policyId: 'your-policy-id'
 * });
 *
 * // Send a sponsored transaction
 * const hash = await bundlerClient.sendUserOperation({
 *   account,
 *   calls: [{ to: '0x...', data: '0x', value: 0n }]
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

	const rpcUrl = getAlchemyRpcUrl(chain.id, apiKey);

	// Create a public client for reading chain state
	const publicClient = createPublicClient({
		chain,
		transport: http(rpcUrl),
	});

	// Create a wallet client from the browser's ethereum provider
	const walletClient = createWalletClient({
		chain,
		transport: custom(window.ethereum),
	});

	// Get connected accounts - this may trigger a connection popup
	const [address] = await walletClient.getAddresses();
	if (!address) {
		throw new Error("No account connected. Please connect your wallet first.");
	}

	console.log("[GaslessClient] Creating owner account from wallet...", {
		ownerAddress: address,
	});

	// Create an owner account that delegates signing to the browser wallet
	const owner = toAccount({
		address,
		signMessage: async ({ message }) => {
			return walletClient.signMessage({ account: address, message });
		},
		// biome-ignore lint/suspicious/noExplicitAny: signTypedData types are complex between viem versions
		signTypedData: async (typedData: any) => {
			return walletClient.signTypedData({
				account: address,
				domain: typedData.domain,
				types: typedData.types,
				primaryType: typedData.primaryType,
				message: typedData.message,
			});
		},
		signTransaction: async () => {
			throw new Error("signTransaction not supported for smart account owner");
		},
	});

	console.log("[GaslessClient] Creating Light Account...", {
		chain: chain.name,
		ownerAddress: address,
		policyId: config.policyId,
	});

	// Create the Light Account using permissionless.js
	// Type assertion needed due to viem version differences in permissionless
	const account = await toLightSmartAccount({
		// biome-ignore lint/suspicious/noExplicitAny: Client type mismatch between viem versions
		client: publicClient as any,
		owner,
		version: "2.0.0",
	});

	// Create a paymaster client for gas sponsorship
	const paymasterClient = createPaymasterClient({
		transport: http(rpcUrl),
	});

	// Minimum gas prices required by Alchemy's bundler (0.1 gwei)
	const MIN_PRIORITY_FEE = 100_000_000n; // 0.1 gwei in wei
	const MIN_MAX_FEE = 100_000_000n; // 0.1 gwei in wei

	// Create the bundler client with paymaster for sponsored transactions
	// Alchemy requires the policyId to be passed in the paymaster context
	const bundlerClient = createBundlerClient({
		// biome-ignore lint/suspicious/noExplicitAny: SmartAccount type mismatch between viem versions
		account: account as any as SmartAccount,
		client: publicClient,
		paymaster: paymasterClient,
		paymasterContext: {
			policyId: config.policyId,
		},
		transport: http(rpcUrl),
		// Custom fee estimation to ensure minimum gas prices for Alchemy's bundler
		userOperation: {
			estimateFeesPerGas: async () => {
				// Get the current fee data from the chain
				const feeData = await publicClient.estimateFeesPerGas();

				// Ensure we meet the bundler's minimum requirements
				const maxPriorityFeePerGas =
					feeData.maxPriorityFeePerGas &&
					feeData.maxPriorityFeePerGas > MIN_PRIORITY_FEE
						? feeData.maxPriorityFeePerGas
						: MIN_PRIORITY_FEE;

				const maxFeePerGas =
					feeData.maxFeePerGas && feeData.maxFeePerGas > MIN_MAX_FEE
						? feeData.maxFeePerGas
						: MIN_MAX_FEE + maxPriorityFeePerGas;

				return {
					maxFeePerGas,
					maxPriorityFeePerGas,
				};
			},
		},
	});

	console.log("[GaslessClient] ✅ Client created!", {
		smartAccountAddress: account.address,
		ownerAddress: address,
	});

	return {
		// biome-ignore lint/suspicious/noExplicitAny: SmartAccount type mismatch between viem versions
		account: account as any as SmartAccount,
		bundlerClient,
		ownerAddress: address as Address,
		smartAccountAddress: account.address,
	};
}
