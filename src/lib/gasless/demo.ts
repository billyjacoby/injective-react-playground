/**
 * Gasless Transaction Examples
 *
 * This file demonstrates how to use the gasless transaction module
 * for common DeFi operations like wrapping ETH, approving tokens, etc.
 */

import {
	type Address,
	encodeFunctionData,
	formatEther,
	maxUint256,
	parseEther,
} from "viem";
import { NETWORK } from "../../constants/setup";
import { getWethAddress } from "../../constants/tokens";
import { erc20WethAbi } from "../contracts/Erc20WethContract";
import { createGaslessClient, getDefaultConfig } from "./client";
import {
	checkGaslessEligibility,
	sendGasless,
	sendGaslessBatch,
	sendGaslessContractCall,
} from "./transactions";
import type { GaslessTransactionResult } from "./types";

// WETH contract address for the current network
const WETH_ADDRESS = getWethAddress(NETWORK) as Address;

// =============================================================================
// Configuration Helper
// =============================================================================

function getConfig() {
	const { policyId } = getDefaultConfig();
	if (!policyId) {
		throw new Error(
			"Missing policy ID. Set VITE_ALCHEMY_GAS_POLICY_ID_SEPOLIA in your .env",
		);
	}
	return { policyId };
}

// =============================================================================
// Wrap ETH → WETH (Gasless)
// =============================================================================

/**
 * Wraps ETH to WETH using a gasless transaction.
 * The gas fees are sponsored by the Gas Manager.
 *
 * @param amountInEth - Amount of ETH to wrap (e.g., "0.1" for 0.1 ETH)
 * @returns Transaction result with hashes
 *
 * @example
 * ```ts
 * const result = await gaslessWrapEth("0.1");
 * console.log("Wrapped 0.1 ETH to WETH!", result.transactionHash);
 * ```
 */
export async function gaslessWrapEth(
	amountInEth: string,
): Promise<GaslessTransactionResult> {
	const config = getConfig();
	const value = parseEther(amountInEth);

	console.log(`[Demo] Wrapping ${amountInEth} ETH to WETH...`);

	// The WETH deposit() function is payable - we send ETH value with empty calldata
	const depositCalldata = encodeFunctionData({
		abi: erc20WethAbi,
		functionName: "deposit",
		args: [],
	});

	const result = await sendGasless(
		{
			target: WETH_ADDRESS,
			data: depositCalldata,
			value,
		},
		config,
	);

	console.log(`[Demo] ✅ Wrapped ${amountInEth} ETH to WETH!`, {
		txHash: result.transactionHash,
		smartAccount: result.smartAccountAddress,
	});

	return result;
}

// =============================================================================
// Unwrap WETH → ETH (Gasless)
// =============================================================================

/**
 * Unwraps WETH back to ETH using a gasless transaction.
 *
 * @param amountInEth - Amount of WETH to unwrap (e.g., "0.1" for 0.1 WETH)
 * @returns Transaction result with hashes
 *
 * @example
 * ```ts
 * const result = await gaslessUnwrapWeth("0.1");
 * console.log("Unwrapped 0.1 WETH to ETH!", result.transactionHash);
 * ```
 */
export async function gaslessUnwrapWeth(
	amountInEth: string,
): Promise<GaslessTransactionResult> {
	const config = getConfig();
	const amount = parseEther(amountInEth);

	console.log(`[Demo] Unwrapping ${amountInEth} WETH to ETH...`);

	const result = await sendGaslessContractCall(
		WETH_ADDRESS,
		erc20WethAbi,
		"withdraw",
		[amount],
		config,
	);

	console.log(`[Demo] ✅ Unwrapped ${amountInEth} WETH to ETH!`, {
		txHash: result.transactionHash,
	});

	return result;
}

// =============================================================================
// Approve WETH for Spender (Gasless)
// =============================================================================

/**
 * Approves a spender to use WETH using a gasless transaction.
 *
 * @param spender - The address to approve
 * @param amount - Amount to approve (defaults to unlimited)
 * @returns Transaction result with hashes
 *
 * @example
 * ```ts
 * // Unlimited approval
 * await gaslessApproveWeth("0xBridgeContract...");
 *
 * // Specific amount
 * await gaslessApproveWeth("0xBridgeContract...", parseEther("100"));
 * ```
 */
export async function gaslessApproveWeth(
	spender: Address,
	amount: bigint = maxUint256,
): Promise<GaslessTransactionResult> {
	const config = getConfig();

	console.log(`[Demo] Approving WETH for ${spender}...`, {
		amount: amount === maxUint256 ? "unlimited" : formatEther(amount),
	});

	const result = await sendGaslessContractCall(
		WETH_ADDRESS,
		erc20WethAbi,
		"approve",
		[spender, amount],
		config,
	);

	console.log(`[Demo] ✅ Approved WETH for spender!`, {
		txHash: result.transactionHash,
	});

	return result;
}

// =============================================================================
// Wrap ETH + Approve in One Transaction (Gasless Batch)
// =============================================================================

/**
 * Wraps ETH to WETH and approves a spender in a single atomic transaction.
 * This is useful for preparing tokens for a bridge or swap.
 *
 * @param amountInEth - Amount of ETH to wrap
 * @param spender - The address to approve for spending
 * @returns Transaction result with hashes
 *
 * @example
 * ```ts
 * // Wrap 0.5 ETH and approve bridge contract in one tx
 * const result = await gaslessWrapAndApprove("0.5", "0xBridgeContract...");
 * ```
 */
export async function gaslessWrapAndApprove(
	amountInEth: string,
	spender: Address,
): Promise<GaslessTransactionResult> {
	const config = getConfig();
	const value = parseEther(amountInEth);

	console.log(`[Demo] Wrapping ${amountInEth} ETH and approving ${spender}...`);

	const depositCalldata = encodeFunctionData({
		abi: erc20WethAbi,
		functionName: "deposit",
		args: [],
	});

	const approveCalldata = encodeFunctionData({
		abi: erc20WethAbi,
		functionName: "approve",
		args: [spender, maxUint256],
	});

	// Execute both calls atomically in one UserOperation
	const result = await sendGaslessBatch(
		[
			{ target: WETH_ADDRESS, data: depositCalldata, value },
			{ target: WETH_ADDRESS, data: approveCalldata },
		],
		config,
	);

	console.log(`[Demo] ✅ Wrapped and approved in one transaction!`, {
		txHash: result.transactionHash,
	});

	return result;
}

// =============================================================================
// Transfer WETH (Gasless)
// =============================================================================

/**
 * Transfers WETH to another address using a gasless transaction.
 *
 * @param to - Recipient address
 * @param amountInEth - Amount to transfer (e.g., "0.1")
 * @returns Transaction result with hashes
 */
export async function gaslessTransferWeth(
	to: Address,
	amountInEth: string,
): Promise<GaslessTransactionResult> {
	const config = getConfig();
	const amount = parseEther(amountInEth);

	console.log(`[Demo] Transferring ${amountInEth} WETH to ${to}...`);

	const result = await sendGaslessContractCall(
		WETH_ADDRESS,
		erc20WethAbi,
		"transfer",
		[to, amount],
		config,
	);

	console.log(`[Demo] ✅ Transferred WETH!`, {
		txHash: result.transactionHash,
	});

	return result;
}

// =============================================================================
// Check if Wrap Would Be Sponsored
// =============================================================================

/**
 * Checks if a wrap transaction would be eligible for gas sponsorship.
 *
 * @param amountInEth - Amount to check
 * @returns Whether the transaction would be sponsored
 */
export async function checkWrapEligibility(
	amountInEth: string,
): Promise<boolean> {
	const config = getConfig();
	const value = parseEther(amountInEth);

	const depositCalldata = encodeFunctionData({
		abi: erc20WethAbi,
		functionName: "deposit",
		args: [],
	});

	const { eligible } = await checkGaslessEligibility(
		{ target: WETH_ADDRESS, data: depositCalldata, value },
		config,
	);

	console.log(
		`[Demo] Wrap ${amountInEth} ETH eligible for sponsorship:`,
		eligible,
	);
	return eligible;
}

// =============================================================================
// Full Demo: Check Balance, Wrap, Approve, Transfer
// =============================================================================

/**
 * Runs a full demo showing the gasless workflow.
 * Wraps a small amount of ETH and transfers it.
 */
export async function runFullDemo() {
	console.log("🚀 Starting Gasless Demo...\n");

	// 1. Create client to get addresses
	const config = getConfig();
	const { ownerAddress, smartAccountAddress } =
		await createGaslessClient(config);

	console.log("📍 Addresses:");
	console.log("  Owner (EOA):", ownerAddress);
	console.log("  Smart Account:", smartAccountAddress);
	console.log("  WETH Contract:", WETH_ADDRESS);
	console.log("");

	// 2. Check eligibility first
	console.log("🔍 Checking sponsorship eligibility...");
	const eligible = await checkWrapEligibility("0.001");
	if (!eligible) {
		console.log(
			"❌ Transaction not eligible for sponsorship. Check your policy.",
		);
		return;
	}
	console.log("");

	// 3. Wrap a small amount of ETH
	console.log("💰 Wrapping 0.001 ETH to WETH...");
	const wrapResult = await gaslessWrapEth("0.001");
	console.log("  UserOp Hash:", wrapResult.userOperationHash);
	console.log("  Tx Hash:", wrapResult.transactionHash);
	console.log("");

	console.log("✅ Demo complete! All transactions were gasless (sponsored).");

	return {
		ownerAddress,
		smartAccountAddress,
		wrapTxHash: wrapResult.transactionHash,
	};
}
