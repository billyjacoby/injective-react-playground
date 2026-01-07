import { useEffect, useState } from "react";
import type { Address, WalletClient } from "viem";
import { useBridgeQuote } from "../hooks/useBridgeQuote";
import { formatBridgeAmount, formatTimeRemaining } from "../utils/bridge";
import { BridgeButton } from "./BridgeButton";
import { ErrorDisplay } from "./ErrorDisplay";

type BridgeInfoProps = {
	walletClient: WalletClient;
	injectiveAddress: string;
	account: Address;
	isOnInjectiveChain: boolean;
	srcChainTokenIn: Address;
	dstChainId: string;
	dstChainTokenOut: Address;
	dstChainTokenOutRecipient: Address;
	tokenDecimals?: number;
	onError: (error: string) => void;
};

export function BridgeInfo(props: BridgeInfoProps) {
	const {
		walletClient,
		injectiveAddress,
		account,
		isOnInjectiveChain,
		srcChainTokenIn,
		dstChainId,
		dstChainTokenOut,
		dstChainTokenOutRecipient,
		tokenDecimals = 6,
		onError,
	} = props;
	const [amount, setAmount] = useState("");

	const {
		quote,
		isLoading,
		error,
		isStale,
		timeRemaining,
		fetchQuote,
		refreshQuote,
		setError,
	} = useBridgeQuote({
		injectiveAddress,
		account,
		srcChainTokenIn,
		dstChainId,
		dstChainTokenOut,
		dstChainTokenOutRecipient,
		tokenDecimals,
	});
	console.log("🪵 | BridgeInfo | quote:", quote);

	// Fetch quote when amount changes
	useEffect(() => {
		if (amount && parseFloat(amount) > 0) {
			fetchQuote(amount);
		}
	}, [amount, fetchQuote]);

	// Sync error with parent
	useEffect(() => {
		if (error) {
			onError(error);
		}
	}, [error, onError]);

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		// Allow empty string, numbers, and one decimal point
		if (value === "" || /^\d*\.?\d*$/.test(value)) {
			setAmount(value);
			setError(null);
		}
	};

	const handleRefresh = async () => {
		await refreshQuote();
	};

	if (!quote && !isLoading && !amount) {
		return (
			<div className="flex flex-col gap-4 w-full max-w-md text-black">
				<div className="bg-gray-100 p-4 rounded-lg">
					<label
						htmlFor="amount"
						className="block text-sm font-medium text-gray-700 mb-2"
					>
						Amount to Bridge
					</label>
					<input
						type="text"
						value={amount}
						onChange={handleAmountChange}
						placeholder="0.0"
						className="w-full px-4 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 w-full max-w-md text-black">
			{/* Amount Input */}
			<div className="bg-gray-100 p-4 rounded-lg">
				<label
					htmlFor="amount"
					className="block text-sm font-medium text-gray-500 mb-2"
				>
					Amount to Bridge
				</label>
				<input
					type="text"
					value={amount}
					onChange={handleAmountChange}
					placeholder="0.0"
					disabled={isLoading}
					className="w-full px-4 py-2 bg-white text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="bg-blue-50 p-4 rounded-lg">
					<p className="text-sm text-blue-600">Fetching bridge quote...</p>
				</div>
			)}

			{/* Quote Details */}
			{quote?.estimation && !isLoading && (
				<div className="bg-white border-2 rounded-lg p-4">
					{/* Quote Status Header */}
					<div className="flex items-center justify-between mb-4 pb-3 border-b">
						<h3 className="text-lg font-semibold">Bridge Details</h3>
						{isStale ? (
							<button
								type="button"
								onClick={handleRefresh}
								className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
							>
								Refresh Quote
							</button>
						) : (
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
								<span className="text-sm text-gray-600">
									Valid for {formatTimeRemaining(timeRemaining)}
								</span>
							</div>
						)}
					</div>

					{/* Stale Warning */}
					{isStale && (
						<div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
							<p className="text-sm text-yellow-800">
								⚠️ This quote has expired. Please refresh to get a new quote
								before proceeding.
							</p>
						</div>
					)}

					{/* Source Chain Info */}
					<div className="mb-4">
						<h4 className="text-sm font-medium text-gray-600 mb-2">You Send</h4>
						<div className="bg-gray-50 p-3 rounded">
							<div className="flex justify-between items-center">
								<div>
									<p className="font-semibold">
										{formatBridgeAmount(
											quote.estimation.srcChainTokenIn.amount,
											quote.estimation.srcChainTokenIn.decimals,
											quote.estimation.srcChainTokenIn.symbol,
										)}
									</p>
									<p className="text-xs text-gray-500 mt-1">
										{quote.estimation.srcChainTokenIn.symbol} on Injective
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Fees Breakdown */}
					{quote.estimation.costsDetails &&
						quote.estimation.costsDetails.length > 0 && (
							<div className="mb-4">
								<h4 className="text-sm font-medium text-gray-600 mb-2">Fees</h4>
								<div className="bg-gray-50 p-3 rounded space-y-2">
									{quote.estimation.costsDetails.map((cost) => {
										const costKey = `${cost.chain}-${cost.type}-${cost.amountIn}`;
										const tokenInfo =
											cost.chain === "100000029"
												? quote.estimation.srcChainTokenIn
												: quote.estimation.dstChainTokenOut;
										const feeAmount =
											(cost.payload?.feeAmount as string) ||
											(
												BigInt(cost.amountIn) - BigInt(cost.amountOut)
											).toString();

										return (
											<div
												key={costKey}
												className="flex justify-between text-sm"
											>
												<span className="text-gray-600">
													{cost.type === "DlnProtocolFee"
														? "Protocol Fee"
														: cost.type === "TakerMargin"
															? "Taker Margin"
															: cost.type === "EstimatedOperatingExpenses"
																? "Operating Expenses"
																: cost.type}
													:
												</span>
												<span>
													{formatBridgeAmount(
														feeAmount,
														tokenInfo.decimals,
														tokenInfo.symbol,
													)}
												</span>
											</div>
										);
									})}
									{quote.protocolFee && (
										<div className="flex justify-between text-sm pt-2 border-t">
											<span className="text-gray-600 font-medium">
												Total Protocol Fee:
											</span>
											<span className="font-medium">
												{formatBridgeAmount(
													quote.protocolFee,
													quote.estimation.srcChainTokenIn.decimals,
													quote.estimation.srcChainTokenIn.symbol,
												)}
											</span>
										</div>
									)}
								</div>
							</div>
						)}

					{/* Destination Chain Info */}
					<div className="mb-4">
						<h4 className="text-sm font-medium text-gray-600 mb-2">
							You Receive
						</h4>
						<div className="bg-green-50 p-3 rounded">
							<div className="flex justify-between items-center">
								<div>
									<p className="font-semibold text-green-700">
										{formatBridgeAmount(
											quote.estimation.dstChainTokenOut.amount,
											quote.estimation.dstChainTokenOut.decimals,
											quote.estimation.dstChainTokenOut.symbol,
										)}
									</p>
									<p className="text-xs text-gray-500 mt-1">
										{quote.estimation.dstChainTokenOut.symbol} on Polygon
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Bridge Button */}
					{quote?.tx && (
						<BridgeButton
							walletClient={walletClient}
							injectiveAddress={injectiveAddress}
							isOnInjectiveChain={isOnInjectiveChain}
							onError={onError}
							orderEstimation={quote}
							isQuoteStale={isStale}
							amount={amount}
							tokenDecimals={tokenDecimals}
						/>
					)}
					{!quote?.tx && quote?.estimation && (
						<div className="p-3 bg-blue-50 border border-blue-200 rounded">
							<p className="text-sm text-blue-800">
								Quote received. Transaction data will be available when you're
								ready to bridge.
							</p>
						</div>
					)}
				</div>
			)}

			{/* Error Display */}
			{error && <ErrorDisplay error={error} className="w-full" />}
		</div>
	);
}
