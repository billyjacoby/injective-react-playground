import { WalletClient } from "viem";
import { POLYGON_DESINTATION_ADDRESS } from "../../constants";
import { executeBridgeOrder } from "../lib/bridge-order";
import type { deBridgeOrderResponse } from "../types";

type BridgeButtonProps = {
	walletClient: WalletClient;
	injectiveAddress: string;
	isOnInjectiveChain: boolean;
	onError: (error: string) => void;
	orderEstimation: deBridgeOrderResponse;
	isQuoteStale: boolean;
	amount: string;
	tokenDecimals: number;
};

export function BridgeButton({
	walletClient,
	injectiveAddress,
	isOnInjectiveChain,
	onError,
	orderEstimation,
	isQuoteStale,
	amount,
	tokenDecimals,
}: BridgeButtonProps) {
	async function handleBridge() {
		if (isQuoteStale) {
			onError("Please refresh the quote before proceeding");
			return;
		}

		const bridgeParams = {
			injectiveAddress,
			srcChainTokenIn: orderEstimation.estimation.srcChainTokenIn
				.address as `0x${string}`,
			srcChainTokenInAmount: amount,
			tokenDecimals,
			dstChainId: "137", // Polygon
			dstChainTokenOut: orderEstimation.estimation.dstChainTokenOut
				.address as `0x${string}`,
			dstChainTokenOutRecipient: POLYGON_DESINTATION_ADDRESS,
		};

		try {
			onError("");
			console.log("Starting bridge transaction...");
			const txHash = await executeBridgeOrder(walletClient, bridgeParams);
			console.log("Bridge transaction successful:", txHash);
			alert(`Bridge transaction sent! Hash: ${txHash}`);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Bridge transaction failed";
			onError(errorMessage);
			console.error("Bridge error:", err);
		}
	}

	const isDisabled = !isOnInjectiveChain || isQuoteStale;

	return (
		<button
			type="button"
			onClick={handleBridge}
			disabled={isDisabled}
			className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			{isQuoteStale
				? "Quote Expired - Refresh Required"
				: "Send Bridge Transaction"}
		</button>
	);
}
