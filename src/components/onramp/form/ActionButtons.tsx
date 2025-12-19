import { OnrampStep } from "../../../context/onrampContext";
import { formatEthAmount } from "../utils/format";

type ActionButtonsProps = {
	currentStep: string;
	isLoading: boolean;
	isQuoteLoading: boolean;
	usdAmount: number;
	quote: { ethAmount: string; wethAmount: string } | null;
	hasExistingWeth: boolean;
	hasExistingEth: boolean;
	canUseExistingWeth: boolean;
	canUseExistingEth: boolean;
	ethBalanceNum: number;
	wethBalanceNum: number;
	minGasRequired: number;
	minGasForWethBridge: number;
	onUseExistingWeth: () => void;
	onUseExistingEth: () => void;
	onStartOnramp: () => void;
};

export function ActionButtons({
	currentStep,
	isLoading,
	isQuoteLoading,
	usdAmount,
	quote,
	hasExistingWeth,
	hasExistingEth,
	canUseExistingWeth,
	canUseExistingEth,
	ethBalanceNum,
	wethBalanceNum,
	minGasRequired,
	minGasForWethBridge,
	onUseExistingWeth,
	onUseExistingEth,
	onStartOnramp,
}: ActionButtonsProps) {
	if (currentStep !== OnrampStep.IDLE) {
		return null;
	}

	// Calculate effective amounts: use quote amount if available and less than balance
	const quoteWethAmount = quote?.wethAmount
		? parseFloat(quote.wethAmount)
		: null;
	const effectiveWethAmount = quoteWethAmount
		? Math.min(quoteWethAmount, wethBalanceNum)
		: wethBalanceNum;
	const effectiveEthAmount = quoteWethAmount
		? Math.min(quoteWethAmount, ethBalanceNum)
		: ethBalanceNum;

	return (
		<div className="space-y-3">
			{/* Use Existing wETH Button - shown when user has wETH (highest priority) */}
			{hasExistingWeth && (
				<button
					type="button"
					onClick={onUseExistingWeth}
					disabled={!canUseExistingWeth || isLoading}
					className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
				>
					{isLoading ? (
						<span className="flex items-center justify-center gap-2">
							<div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
							Processing...
						</span>
					) : canUseExistingWeth ? (
						`Bridge ${effectiveWethAmount.toFixed(4)} wETH → Injective`
					) : (
						`Need ETH for gas (have ${ethBalanceNum.toFixed(4)}, need ${minGasForWethBridge})`
					)}
				</button>
			)}

			{/* Use Existing ETH Button - shown when user has ETH */}
			{hasExistingEth && (
				<button
					type="button"
					onClick={onUseExistingEth}
					disabled={!canUseExistingEth || isLoading}
					className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
				>
					{isLoading ? (
						<span className="flex items-center justify-center gap-2">
							<div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
							Processing...
						</span>
					) : canUseExistingEth ? (
						`Wrap ${effectiveEthAmount.toFixed(4)} ETH → Bridge to Injective`
					) : (
						`Insufficient ETH (need > ${minGasRequired.toFixed(4)} for gas)`
					)}
				</button>
			)}

			{/* Divider when any existing balance options available */}
			{(hasExistingEth || hasExistingWeth) && (
				<div className="flex items-center gap-3">
					<div className="flex-1 h-px bg-gray-700" />
					<span className="text-xs text-gray-500 uppercase">or buy more</span>
					<div className="flex-1 h-px bg-gray-700" />
				</div>
			)}

			{/* Moonpay Button */}
			<button
				type="button"
				onClick={onStartOnramp}
				disabled={!quote || isQuoteLoading || usdAmount < 10 || isLoading}
				className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
			>
				{isQuoteLoading ? (
					<span className="flex items-center justify-center gap-2">
						<div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
						Loading quote...
					</span>
				) : usdAmount < 10 ? (
					"Minimum $10"
				) : (
					`Buy ${quote ? formatEthAmount(quote.ethAmount) : "..."} ETH with Moonpay`
				)}
			</button>
		</div>
	);
}
