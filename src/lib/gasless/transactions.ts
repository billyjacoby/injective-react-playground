import { getGaslessClient } from "./client";
import type {
	GaslessCall,
	GaslessTransactionResult,
	SendGaslessOptions,
} from "./types";

/**
 * Sends a single gasless (sponsored) transaction.
 *
 * @param call - The call to execute (to, data, optional value)
 * @param config - Client configuration (policyId required, others optional)
 * @param options - Transaction options
 * @returns The transaction result with hashes
 *
 * @example
 * ```ts
 * const signedHashedData = await walletClient.writeContract({
 *   account: ownerAddress,
 *   address: tokenAddress,
 *   abi: erc20Abi,
 *   functionName: "transfer",
 *   args: [recipientAddress, amount],
 * });
 *
 * const result = await sendGasless(
 *   { to: '0xRecipient', data: signedHashedData },
 * );
 *
 * ```
 */
export async function sendGasless(
	call: GaslessCall,
	options: SendGaslessOptions = {},
): Promise<GaslessTransactionResult> {
	const { waitForTransaction = true } = options;
	const {
		bundlerClient,
		smartAccount: account,
		smartAccountAddress,
	} = await getGaslessClient();

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
