import React from "react";
import { OnrampStep } from "../../context/onrampContext";
import { useOnrampStore } from "../../stores/onramp";

import { ActionButtons } from "./form/ActionButtons";
import { AmountInput } from "./form/AmountInput";
import { BalanceDisplay } from "./form/BalanceDisplay";
import { GasReserveInfo } from "./form/GasReserveInfo";
import { QuotePreview } from "./form/QuotePreview";

export function OnrampForm() {
	const currentStep = useOnrampStore((state) => state.currentStep);
	const usdAmount = useOnrampStore((state) => state.usdAmount);
	const quote = useOnrampStore((state) => state.quote);
	const gasEstimate = useOnrampStore((state) => state.gasEstimate);
	const isQuoteLoading = useOnrampStore((state) => state.isQuoteLoading);
	const isLoading = useOnrampStore((state) => state.isLoading);
	const setUsdAmount = useOnrampStore((state) => state.setUsdAmount);
	const startOnramp = useOnrampStore((state) => state.startOnramp);
	const useExistingEth = useOnrampStore((state) => state.useExistingEth);
	const useExistingWeth = useOnrampStore((state) => state.useExistingWeth);
	const ethBalance = useOnrampStore((state) => state.ethBalance);
	const wethBalance = useOnrampStore((state) => state.wethBalance);

	// Check if user has enough ETH to skip Moonpay
	const ethBalanceNum = parseFloat(ethBalance);
	const wethBalanceNum = parseFloat(wethBalance);
	const hasExistingEth = ethBalanceNum > 0.001; // More than dust amount
	const hasExistingWeth = wethBalanceNum > 0.0001; // More than dust amount

	// Calculate min gas based on selected speed
	const minGasRequired = gasEstimate
		? parseFloat(gasEstimate.safeEthToReserve)
		: 0.01;

	// For wETH bridge we only need ~2/3 of full gas (skip wrap)
	const minGasForWethBridge = (minGasRequired * 2) / 3;

	const canUseExistingEth = ethBalanceNum > minGasRequired;
	const canUseExistingWeth =
		hasExistingWeth && ethBalanceNum >= minGasForWethBridge;

	const [customAmount, setCustomAmount] = React.useState("");

	const handlePresetClick = (amount: number) => {
		setCustomAmount("");
		setUsdAmount(amount);
	};

	const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setCustomAmount(value);
		const num = parseFloat(value);
		if (!Number.isNaN(num) && num > 0) {
			setUsdAmount(num);
		}
	};

	// Disable form during active onramp
	const isFormDisabled =
		currentStep !== OnrampStep.IDLE && currentStep !== OnrampStep.COMPLETE;

	return (
		<div className="space-y-6">
			<AmountInput
				usdAmount={usdAmount}
				customAmount={customAmount}
				isDisabled={isFormDisabled}
				onPresetClick={handlePresetClick}
				onCustomAmountChange={handleCustomAmountChange}
			/>

			{quote && (
				<QuotePreview
					quote={quote}
					usdAmount={usdAmount}
					isQuoteLoading={isQuoteLoading}
				/>
			)}

			{gasEstimate && <GasReserveInfo gasEstimate={gasEstimate} />}

			<BalanceDisplay ethBalance={ethBalance} wethBalance={wethBalance} />

			<ActionButtons
				currentStep={currentStep}
				isLoading={isLoading}
				isQuoteLoading={isQuoteLoading}
				usdAmount={usdAmount}
				quote={quote}
				hasExistingWeth={hasExistingWeth}
				hasExistingEth={hasExistingEth}
				canUseExistingWeth={canUseExistingWeth}
				canUseExistingEth={canUseExistingEth}
				ethBalanceNum={ethBalanceNum}
				wethBalanceNum={wethBalanceNum}
				minGasRequired={minGasRequired}
				minGasForWethBridge={minGasForWethBridge}
				onUseExistingWeth={useExistingWeth}
				onUseExistingEth={useExistingEth}
				onStartOnramp={startOnramp}
			/>

			{/* Disclaimer */}
			<p className="text-xs text-gray-500 text-center">
				Prices are estimates and may vary. Bridge times typically 5-15 minutes.
			</p>
		</div>
	);
}

export default OnrampForm;
