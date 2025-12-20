import { type Address, encodeFunctionData, erc20Abi, parseEther } from "viem";
import { createGaslessClient, getDefaultConfig } from "./client";
import type {
	Erc20ApproveParams,
	Erc20TransferParams,
	GaslessCall,
	GaslessClientConfig,
	GaslessTestResult,
	GaslessTransactionResult,
	SendGaslessOptions,
	SponsorshipEligibility,
} from "./types";

// =============================================================================
// Core Transaction Functions
// =============================================================================

/**
 * Sends a single gasless (sponsored) transaction.
 *
 * @param call - The call to execute (to, data, value)
 * @param config - Client configuration (policyId required, others optional)
 * @param options - Transaction options
 * @returns The transaction result with hashes
 *
 * @example
 * ```ts
 * // Simple ETH transfer (0 value)
 * const result = await sendGasless(
 *   { to: '0xRecipient' },
 *   { policyId: 'your-policy-id' }
 * );
 *
 * // Contract call with data
 * const result = await sendGasless(
 *   {
 *     to: '0xContract',
 *     data: encodeFunctionData({ abi, functionName: 'mint', args: [1] }),
 *     value: parseEther('0.1')
 *   },
 *   { policyId: 'your-policy-id' }
 * );
 * ```
 */
export async function sendGasless(
	call: GaslessCall,
	config: GaslessClientConfig,
	options: SendGaslessOptions = {},
): Promise<GaslessTransactionResult> {
	const { waitForTransaction = true } = options;
	const { bundlerClient, account, smartAccountAddress } =
		await createGaslessClient(config);

	console.log("[Gasless] Sending transaction...", {
		from: smartAccountAddress,
		to: call.to,
		value: (call.value ?? 0n).toString(),
		hasData: call.data && call.data !== "0x",
	});

	const hash = await bundlerClient.sendUserOperation({
		account,
		calls: [
			{
				to: call.to,
				data: call.data ?? "0x",
				value: call.value ?? 0n,
			},
		],
	});

	console.log("[Gasless] User operation submitted:", hash);

	const response: GaslessTransactionResult = {
		userOperationHash: hash,
		smartAccountAddress,
	};

	if (waitForTransaction) {
		const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
		console.log(
			"[Gasless] ✅ Transaction confirmed:",
			receipt.receipt.transactionHash,
		);
		response.transactionHash = receipt.receipt.transactionHash;
	}

	return response;
}

/**
 * Sends multiple calls in a single gasless (sponsored) transaction.
 * All calls are executed atomically in the order provided.
 *
 * @param calls - Array of calls to execute
 * @param config - Client configuration (policyId required)
 * @param options - Transaction options
 * @returns The transaction result with hashes
 *
 * @example
 * ```ts
 * // Batch: approve + transfer
 * const result = await sendGaslessBatch(
 *   [
 *     { to: tokenAddress, data: approveCalldata },
 *     { to: bridgeAddress, data: depositCalldata }
 *   ],
 *   { policyId: 'your-policy-id' }
 * );
 * ```
 */
export async function sendGaslessBatch(
	calls: GaslessCall[],
	config: GaslessClientConfig,
	options: SendGaslessOptions = {},
): Promise<GaslessTransactionResult> {
	const { waitForTransaction = true } = options;
	const { bundlerClient, account, smartAccountAddress } =
		await createGaslessClient(config);

	console.log("[Gasless] Sending batch transaction...", {
		from: smartAccountAddress,
		callCount: calls.length,
		targets: calls.map((c) => c.to),
	});

	// Format calls for the bundler client
	const formattedCalls = calls.map((call) => ({
		to: call.to,
		data: call.data ?? "0x",
		value: call.value ?? 0n,
	}));

	const hash = await bundlerClient.sendUserOperation({
		account,
		calls: formattedCalls,
	});

	console.log("[Gasless] Batch user operation submitted:", hash);

	const response: GaslessTransactionResult = {
		userOperationHash: hash,
		smartAccountAddress,
	};

	if (waitForTransaction) {
		const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
		console.log(
			"[Gasless] ✅ Batch transaction confirmed:",
			receipt.receipt.transactionHash,
		);
		response.transactionHash = receipt.receipt.transactionHash;
	}

	return response;
}

/**
 * Checks if a transaction (or batch) would be eligible for gas sponsorship.
 * Note: This performs a dry-run estimation to check eligibility.
 *
 * @param calls - Single call or array of calls to check
 * @param config - Client configuration (policyId required)
 * @returns Whether the transaction is eligible for sponsorship
 *
 * @example
 * ```ts
 * const { eligible } = await checkGaslessEligibility(
 *   { to: '0xContract', data: '0x...' },
 *   { policyId: 'your-policy-id' }
 * );
 * if (eligible) {
 *   await sendGasless(call, config);
 * }
 * ```
 */
export async function checkGaslessEligibility(
	calls: GaslessCall | GaslessCall[],
	config: GaslessClientConfig,
): Promise<SponsorshipEligibility> {
	const { bundlerClient, account } = await createGaslessClient(config);
	const callArray = Array.isArray(calls) ? calls : [calls];

	const formattedCalls = callArray.map((call) => ({
		to: call.to,
		data: call.data ?? "0x",
		value: call.value ?? 0n,
	}));

	try {
		// Try to estimate the user operation - if it succeeds with paymaster, it's eligible
		await bundlerClient.prepareUserOperation({
			account,
			calls: formattedCalls,
		});

		console.log("[Gasless] Sponsorship eligibility: true");
		return { eligible: true };
	} catch (error) {
		console.log("[Gasless] Sponsorship eligibility: false", error);
		return { eligible: false };
	}
}

// =============================================================================
// ERC-20 Helper Functions
// =============================================================================

/**
 * Sends a gasless ERC-20 token transfer.
 *
 * @param params - Token transfer parameters
 * @param config - Client configuration (policyId required)
 * @param options - Transaction options
 * @returns The transaction result
 *
 * @example
 * ```ts
 * import { parseUnits } from 'viem';
 *
 * const result = await sendGaslessErc20Transfer(
 *   {
 *     token: '0xUSDC...',
 *     to: '0xRecipient...',
 *     amount: parseUnits('100', 6) // 100 USDC
 *   },
 *   { policyId: 'your-policy-id' }
 * );
 * ```
 */
export async function sendGaslessErc20Transfer(
	params: Erc20TransferParams,
	config: GaslessClientConfig,
	options: SendGaslessOptions = {},
): Promise<GaslessTransactionResult> {
	const data = encodeFunctionData({
		abi: erc20Abi,
		functionName: "transfer",
		args: [params.to, params.amount],
	});

	return sendGasless({ to: params.token, data }, config, options);
}

/**
 * Sends a gasless ERC-20 approval.
 *
 * @param params - Token approval parameters
 * @param config - Client configuration (policyId required)
 * @param options - Transaction options
 * @returns The transaction result
 *
 * @example
 * ```ts
 * import { maxUint256 } from 'viem';
 *
 * const result = await sendGaslessErc20Approve(
 *   {
 *     token: '0xUSDC...',
 *     spender: '0xBridge...',
 *     amount: maxUint256 // Unlimited approval
 *   },
 *   { policyId: 'your-policy-id' }
 * );
 * ```
 */
export async function sendGaslessErc20Approve(
	params: Erc20ApproveParams,
	config: GaslessClientConfig,
	options: SendGaslessOptions = {},
): Promise<GaslessTransactionResult> {
	const data = encodeFunctionData({
		abi: erc20Abi,
		functionName: "approve",
		args: [params.spender, params.amount],
	});

	return sendGasless({ to: params.token, data }, config, options);
}

/**
 * Sends a gasless ERC-20 approve + transfer in a single batch transaction.
 * Useful for when you need to approve and transfer in one atomic operation.
 *
 * @param approveParams - Token approval parameters
 * @param transferParams - Token transfer parameters
 * @param config - Client configuration (policyId required)
 * @param options - Transaction options
 * @returns The transaction result
 */
export async function sendGaslessApproveAndTransfer(
	approveParams: Erc20ApproveParams,
	transferParams: Erc20TransferParams,
	config: GaslessClientConfig,
	options: SendGaslessOptions = {},
): Promise<GaslessTransactionResult> {
	const approveData = encodeFunctionData({
		abi: erc20Abi,
		functionName: "approve",
		args: [approveParams.spender, approveParams.amount],
	});

	const transferData = encodeFunctionData({
		abi: erc20Abi,
		functionName: "transfer",
		args: [transferParams.to, transferParams.amount],
	});

	return sendGaslessBatch(
		[
			{ to: approveParams.token, data: approveData },
			{ to: transferParams.token, data: transferData },
		],
		config,
		options,
	);
}

// =============================================================================
// Contract Call Helpers
// =============================================================================

/**
 * Sends a gasless contract call with encoded function data.
 * This is a convenience wrapper around sendGasless for contract interactions.
 *
 * @param to - The contract address
 * @param abi - The contract ABI
 * @param functionName - The function to call
 * @param args - The function arguments
 * @param config - Client configuration (policyId required)
 * @param options - Transaction options
 * @returns The transaction result
 *
 * @example
 * ```ts
 * const result = await sendGaslessContractCall(
 *   '0xContract...',
 *   contractAbi,
 *   'mint',
 *   [tokenId, amount],
 *   { policyId: 'your-policy-id' }
 * );
 * ```
 */
export async function sendGaslessContractCall(
	to: Address,
	// biome-ignore lint/suspicious/noExplicitAny: ABI type is complex
	abi: readonly any[],
	functionName: string,
	// biome-ignore lint/suspicious/noExplicitAny: Args can be any type
	args: readonly any[],
	config: GaslessClientConfig,
	options: SendGaslessOptions & { value?: bigint } = {},
): Promise<GaslessTransactionResult> {
	const { value, ...txOptions } = options;

	const data = encodeFunctionData({
		abi,
		functionName,
		args,
	});

	return sendGasless({ to, data, value }, config, txOptions);
}

/**
 * Sends a gasless test transaction (0 ETH to self).
 * Useful for verifying that gas sponsorship is working.
 *
 * @param policyId - The Gas Manager policy ID
 * @returns The test result with full details
 */
export async function sendGaslessTestTransaction(
	policyId: string,
): Promise<GaslessTestResult> {
	const { bundlerClient, account, ownerAddress, smartAccountAddress } =
		await createGaslessClient({ policyId });

	console.log("[GaslessTest] Sending 0 ETH from smart account to owner...", {
		from: smartAccountAddress,
		to: ownerAddress,
	});

	const hash = await bundlerClient.sendUserOperation({
		account,
		calls: [
			{
				to: ownerAddress,
				data: "0x",
				value: parseEther("0"),
			},
		],
	});

	console.log("[GaslessTest] ✅ User operation submitted!", {
		hash,
	});

	const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });

	console.log("[GaslessTest] ✅ Transaction mined!", {
		userOpHash: hash,
		txHash: receipt.receipt.transactionHash,
	});

	return {
		userOperationHash: hash,
		transactionHash: receipt.receipt.transactionHash,
		smartAccountAddress,
		ownerAddress,
	};
}

/**
 * Quick test function using environment variables for configuration.
 * Run this to verify gasless transactions are working.
 *
 * @returns The test result with all transaction details
 *
 * @example
 * ```ts
 * // In browser console:
 * import { testGaslessTransaction } from './lib/gasless';
 * await testGaslessTransaction();
 * ```
 */
export async function testGaslessTransaction(): Promise<GaslessTestResult> {
	const { policyId, isMainnet } = getDefaultConfig();

	if (!policyId) {
		throw new Error(
			`Missing policy ID. Set VITE_ALCHEMY_GAS_POLICY_ID${isMainnet ? "" : "_SEPOLIA"} in your .env file`,
		);
	}

	console.log("🚀 Testing gasless transaction...");
	console.log("Network:", isMainnet ? "Mainnet" : "Sepolia");
	console.log("Policy ID:", policyId);

	const result = await sendGaslessTestTransaction(policyId);

	console.log("✅ Test complete!");
	console.log("Smart Account:", result.smartAccountAddress);
	console.log("Owner EOA:", result.ownerAddress);
	console.log("UserOp Hash:", result.userOperationHash);
	console.log("Tx Hash:", result.transactionHash);

	return result;
}
