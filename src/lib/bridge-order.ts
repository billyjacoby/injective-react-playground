/**
 * Bridge order implementation using viem for cross-chain token transfers via deBridge.
 *
 * This module handles creating deBridge orders and executing them using viem
 * for wallet interactions, compatible with Rabby and other EIP-1193 wallets.
 */

import { getEthereumAddress } from "@injectivelabs/sdk-ts";
import {
	type Address,
	createPublicClient,
	createWalletClient,
	custom,
	formatUnits,
	type PublicClient,
	parseUnits,
	type WalletClient,
} from "viem";
import { injective } from "viem/chains";
import { DEBRIDGE_INJ_CHAIN_ID } from "../../constants";
import { debridgeERC20Abi } from "./debridge-abi";

export const DEBRIDGE_API = "https://dln.debridge.finance/v1.0";

// Injective EVM chain ID (1776 for mainnet)
const INJECTIVE_CHAIN_ID = injective.id;

// Injective EVM RPC URL
const INJECTIVE_EVM_RPC = injective.rpcUrls.default.http[0];

// Input parameters for creating a deBridge order
export interface deBridgeOrderInput {
	srcChainId: string;
	srcChainTokenIn: string;
	srcChainTokenInAmount: string;
	dstChainId: string;
	dstChainTokenOut: string;
	dstChainTokenOutRecipient?: string;
	account?: string;
	dstChainTokenOutAmount?: string;
	slippage?: number;
	additionalTakerRewardBps?: number;
	srcIntermediaryTokenAddress?: string;
	dstIntermediaryTokenAddress?: string;
	dstIntermediaryTokenSpenderAddress?: string;
	intermediaryTokenUSDPrice?: number;
	srcAllowedCancelBeneficiary?: string;
	referralCode?: number;
	affiliateFeePercent?: number;
	srcChainOrderAuthorityAddress?: string;
	srcChainRefundAddress?: string;
	dstChainOrderAuthorityAddress?: string;
	prependOperatingExpenses?: boolean;
	deBridgeApp?: string;
	affiliateFeeRecipient?: string;
}

// Response structure for a deBridge order
export interface deBridgeOrderResponse {
	tx: {
		data: string;
		to: string;
		value: string;
	};
	estimation: {
		srcChainTokenIn: {
			amount: string;
			tokenAddress: string;
			decimals: number;
			symbol: string;
		};
		dstChainTokenOut: {
			amount: string;
			tokenAddress: string;
			decimals: number;
			symbol: string;
		};
		fees: {
			srcChainTokenIn: string;
			dstChainTokenOut: string;
		};
	};
}

/**
 * Get viem public client for Injective chain
 */
function getPublicClient(): PublicClient {
	return createPublicClient({
		chain: injective,
		transport: custom({
			request: async ({ method, params }) => {
				const response = await fetch(INJECTIVE_EVM_RPC, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method,
						params,
					}),
				});
				const data = await response.json();
				return data.result;
			},
		}),
	});
}

/**
 * Get viem wallet client from window.ethereum (Rabby, MetaMask, etc.)
 */
function getWalletClient(): WalletClient {
	if (typeof window === "undefined") {
		throw new Error("Window is not available.");
	}

	const windowWithEthereum = window as Window & {
		ethereum?: {
			request: (args: {
				method: string;
				params?: unknown[];
			}) => Promise<unknown>;
			isRabby?: boolean;
			isMetaMask?: boolean;
		};
	};

	if (!windowWithEthereum.ethereum) {
		throw new Error(
			"No Ethereum provider found. Please install Rabby or another wallet.",
		);
	}

	return createWalletClient({
		chain: injective,
		transport: custom(windowWithEthereum.ethereum),
	});
}

/**
 * Check ERC-20 token allowance using viem
 */
async function checkAllowance(
	tokenAddress: Address,
	owner: Address,
	spender: Address,
): Promise<bigint> {
	const publicClient = getPublicClient();

	try {
		const allowance = (await publicClient.readContract({
			address: tokenAddress,
			abi: debridgeERC20Abi,
			functionName: "allowance",
			args: [owner, spender],
		})) as bigint;
		return allowance;
	} catch (error) {
		console.warn("Failed to check allowance:", error);
		return BigInt(0);
	}
}

/**
 * Create a deBridge cross-chain transfer order.
 *
 * @param params - Bridge order parameters.
 * @returns The order response including transaction data.
 * @throws If source and destination chains are the same or API call fails.
 */
export async function createDebridgeBridgeOrder(
	params: deBridgeOrderInput,
): Promise<deBridgeOrderResponse> {
	if (params.srcChainId === params.dstChainId) {
		throw new Error("Source and destination chains must be different");
	}

	const queryParams = new URLSearchParams({
		srcChainId: params.srcChainId,
		srcChainTokenIn: params.srcChainTokenIn,
		srcChainTokenInAmount: params.srcChainTokenInAmount,
		dstChainId: params.dstChainId,
		dstChainTokenOut: params.dstChainTokenOut,
		dstChainTokenOutRecipient: params.dstChainTokenOutRecipient || "",
		dstChainTokenOutAmount: params.dstChainTokenOutAmount || "auto",
		senderAddress: params.account || "",
		srcChainOrderAuthorityAddress:
			params.srcChainOrderAuthorityAddress || params.account || "",
		srcChainRefundAddress: params.account || "",
		dstChainOrderAuthorityAddress:
			params.dstChainOrderAuthorityAddress ||
			params.dstChainTokenOutRecipient ||
			"",
		referralCode: params.referralCode
			? params.referralCode.toString()
			: "31805",
		prependOperatingExpenses: "true",
		affiliateFeePercent: (params.affiliateFeePercent || 0).toString(),
		affiliateFeeRecipient: params.affiliateFeeRecipient
			? params.affiliateFeeRecipient
			: "0x55A8f5cce1d53D9Ff84EC0962882b447E5914dB8",
	});

	// Remove affiliate params if fee is 0
	if (
		queryParams.get("affiliateFeePercent") === "0" ||
		!queryParams.get("affiliateFeeRecipient")
	) {
		queryParams.delete("affiliateFeePercent");
		queryParams.delete("affiliateFeeRecipient");
	}

	console.log(
		"Creating deBridge order:",
		`${DEBRIDGE_API}/dln/order/create-tx?${queryParams}`,
	);

	const response = await fetch(
		`${DEBRIDGE_API}/dln/order/create-tx?${queryParams}`,
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Failed to create bridge order: ${response.statusText}. ${errorText}`,
		);
	}

	const data = await response.json();

	if (data.error) {
		throw new Error(`DeBridge API Error: ${data.error}`);
	}

	if (data.tx?.data) {
		data.tx.data = data.tx.data.toString();
	}

	return data;
}

/**
 * Execute a bridge order using viem and Rabby wallet.
 *
 * @param params - Bridge execution parameters
 * @param params.injectiveAddress - Injective address (will be converted to EVM address)
 * @param params.srcChainTokenIn - Source chain token address
 * @param params.srcChainTokenInAmount - Amount to bridge (in human-readable format, e.g., "0.1")
 * @param params.tokenDecimals - Token decimals (default: 6 for USDC/USDT)
 * @param params.dstChainId - Destination chain ID
 * @param params.dstChainTokenOut - Destination chain token address
 * @param params.dstChainTokenOutRecipient - Recipient address on destination chain
 * @param params.dstChainTokenOutAmount - Optional destination amount (default: "auto")
 * @returns Transaction hash of the bridge transaction
 */
export async function executeBridgeOrder(params: {
	injectiveAddress: string;
	srcChainTokenIn: Address;
	srcChainTokenInAmount: string;
	tokenDecimals?: number;
	dstChainId: string;
	dstChainTokenOut: Address;
	dstChainTokenOutRecipient: Address;
	dstChainTokenOutAmount?: string;
	referralCode?: number;
	affiliateFeePercent?: number;
	affiliateFeeRecipient?: Address;
}): Promise<`0x${string}`> {
	const {
		injectiveAddress,
		srcChainTokenIn,
		srcChainTokenInAmount,
		tokenDecimals = 6,
		dstChainId,
		dstChainTokenOut,
		dstChainTokenOutRecipient,
		dstChainTokenOutAmount,
		referralCode,
		affiliateFeePercent,
		affiliateFeeRecipient,
	} = params;

	const ethereumAddress = getEthereumAddress(injectiveAddress) as Address;
	console.log(
		`Executing bridge order for: ${injectiveAddress} (${ethereumAddress})`,
	);

	// Get wallet client and accounts
	const walletClient = getWalletClient();
	const [account] = await walletClient.getAddresses();

	if (!account) {
		throw new Error("No account connected. Please connect your Rabby wallet.");
	}

	if (account.toLowerCase() !== ethereumAddress.toLowerCase()) {
		throw new Error(
			`Connected account (${account}) does not match expected address (${ethereumAddress})`,
		);
	}

	// Convert amount to atomic units
	const amountInAtomicUnit = parseUnits(srcChainTokenInAmount, tokenDecimals);

	// Construct order parameters
	const orderInput: deBridgeOrderInput = {
		srcChainId: DEBRIDGE_INJ_CHAIN_ID,
		srcChainTokenIn,
		srcChainTokenInAmount: amountInAtomicUnit.toString(),
		dstChainId,
		dstChainTokenOut,
		dstChainTokenOutRecipient,
		dstChainTokenOutAmount,
		account: ethereumAddress,
		srcChainOrderAuthorityAddress: ethereumAddress,
		srcChainRefundAddress: ethereumAddress,
		dstChainOrderAuthorityAddress: dstChainTokenOutRecipient,
		referralCode,
		affiliateFeePercent,
		affiliateFeeRecipient,
	};

	console.log(
		"Creating deBridge order with input:",
		JSON.stringify(orderInput, null, 2),
	);
	const order = await createDebridgeBridgeOrder(orderInput);

	if (!order?.tx?.to || !order.tx.data) {
		throw new Error("Invalid transaction data returned from order creation.");
	}

	console.log("Order estimation:", order.estimation);

	// ===== Token Approval =====
	const spenderAddress = order.tx.to as Address;

	console.log("\nChecking or setting token approval...");
	console.log(`Token: ${srcChainTokenIn} | Spender: ${spenderAddress}`);
	console.log(`Required amount: ${srcChainTokenInAmount} tokens`);

	const requiredAmount = BigInt(order.estimation.srcChainTokenIn.amount);

	try {
		console.log("Checking current allowance...");
		const currentAllowance = await checkAllowance(
			srcChainTokenIn,
			ethereumAddress,
			spenderAddress,
		);

		console.log(
			`Current allowance: ${formatUnits(currentAllowance, tokenDecimals)} tokens`,
		);

		if (currentAllowance < requiredAmount) {
			console.log("Allowance insufficient—sending approval...");

			const hash = await walletClient.writeContract({
				chain: injective,
				address: srcChainTokenIn,
				abi: debridgeERC20Abi,
				functionName: "approve",
				args: [spenderAddress, requiredAmount],
				account,
			});

			console.log(`Approval tx hash: ${hash}`);
			console.log("Waiting for approval confirmation...");

			const publicClient = getPublicClient();
			await publicClient.waitForTransactionReceipt({ hash });

			console.log("Approval successful! ✅");
		} else {
			console.log("Sufficient allowance already granted. 👍");
		}
	} catch (err) {
		console.error(
			"Error during approval:",
			err instanceof Error ? err.message : err,
		);
		throw new Error("Token approval failed—cannot proceed.");
	}

	// ===== Main Bridge Transaction =====
	try {
		console.log("\nSubmitting bridge transaction...");

		const hash = await walletClient.sendTransaction({
			chain: injective,
			to: order.tx.to as Address,
			data: order.tx.data as `0x${string}`,
			value: BigInt(order.tx.value || "0"),
			account,
		});

		console.log(`Bridge tx hash: ${hash}`);
		console.log(
			`Explorer: https://explorer.injective.network/transaction/${hash}`,
		);

		return hash;
	} catch (err) {
		console.error(
			"Error sending bridge transaction:",
			err instanceof Error ? err.message : err,
		);
		throw err;
	}
}
