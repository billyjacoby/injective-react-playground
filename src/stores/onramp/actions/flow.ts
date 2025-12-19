import { OnrampStep } from "../../../context/onrampContext";
import { gasCalculator } from "../../../lib/services/gasCalculator";
import { OnrampActions, OnrampStoreApi } from "../types";

export function createFlowActions({
	get,
}: OnrampStoreApi): Pick<
	OnrampActions,
	"startOnramp" | "executeFullFlow" | "useExistingEth" | "useExistingWeth"
> {
	return {
		startOnramp: () => {
			get().setStep(OnrampStep.BUYING_ETH);
		},

		executeFullFlow: async () => {
			try {
				// Get quote amount if available
				const { quote } = get();
				const targetWethAmount = quote?.wethAmount;

				// Step 1: Wrap ETH
				await get().executeWrap(targetWethAmount);

				// Step 2: Approve wETH
				await get().executeApprove();

				// Step 3: Bridge to Injective
				await get().executeBridge(targetWethAmount);
			} catch (error) {
				console.error("Full flow failed:", error);
				// Error state is already set by individual steps
			}
		},

		useExistingEth: async () => {
			const { walletConfig } = get();
			if (!walletConfig) {
				get().setError("Wallet not connected");
				return;
			}

			// Refresh balances first
			await get().refreshBalances();

			const { ethBalance, gasSpeed, quote } = get();
			const ethBal = parseFloat(ethBalance);

			if (ethBal <= 0) {
				get().setError("No ETH balance to use");
				return;
			}

			// Use quote amount if available, otherwise use full balance
			const targetWethAmount = quote?.wethAmount;

			// Check if we have enough for gas using the selected speed
			const gasEst = await gasCalculator.calculateGasReserve(gasSpeed);
			const minRequired = parseFloat(gasEst.safeEthToReserve);

			if (targetWethAmount) {
				// If we have a quote, check if we have enough ETH for target amount + gas
				const targetAmountNum = parseFloat(targetWethAmount);
				if (ethBal < minRequired + targetAmountNum) {
					get().setError(
						`Insufficient ETH. Need ${(minRequired + targetAmountNum).toFixed(6)} ETH (${targetAmountNum.toFixed(6)} for wrap + ${minRequired.toFixed(6)} for gas)`,
					);
					return;
				}
			} else {
				// No quote, check if we have enough for gas
				if (ethBal <= minRequired) {
					get().setError(
						`Insufficient ETH. Need at least ${minRequired.toFixed(6)} ETH for gas fees.`,
					);
					return;
				}
			}

			// Execute wrap with target amount, then approve and bridge
			try {
				await get().executeWrap(targetWethAmount);
				await get().executeApprove();
				await get().executeBridge(targetWethAmount);
			} catch (error) {
				console.error("ETH wrap flow failed:", error);
				// Error state is already set by individual steps
			}
		},

		useExistingWeth: async () => {
			const { walletConfig } = get();
			if (!walletConfig) {
				get().setError("Wallet not connected");
				return;
			}

			// Refresh balances first
			await get().refreshBalances();

			const { wethBalance, ethBalance, gasSpeed, quote } = get();
			const wethBal = parseFloat(wethBalance);

			if (wethBal <= 0) {
				get().setError("No wETH balance to bridge");
				return;
			}

			// Use quote amount if available, otherwise use full balance
			const targetWethAmount = quote?.wethAmount;

			// For wETH bridge, we only need gas for approve + bridge (2 transactions)
			const gasEst = await gasCalculator.calculateGasReserve(gasSpeed);
			// Only need ~2/3 of full gas since we skip wrap
			const approveBridgeGas = (parseFloat(gasEst.safeEthToReserve) * 2) / 3;
			const ethBal = parseFloat(ethBalance);

			console.log(`[OnrampStore] wETH bridge gas check:`, {
				ethBalance: ethBal,
				requiredGas: approveBridgeGas,
				gasSpeed,
				targetAmount: targetWethAmount,
			});

			if (ethBal < approveBridgeGas) {
				get().setError(
					`Insufficient ETH for gas. Need at least ${approveBridgeGas.toFixed(6)} ETH.`,
				);
				return;
			}

			// Validate target amount if provided
			if (targetWethAmount) {
				const targetAmountNum = parseFloat(targetWethAmount);
				if (targetAmountNum > wethBal) {
					get().setError(
						`Insufficient wETH. Have ${wethBal.toFixed(6)}, need ${targetAmountNum.toFixed(6)}`,
					);
					return;
				}
			}

			// Execute approve -> bridge flow (skip wrap)
			try {
				await get().executeApprove();
				await get().executeBridge(targetWethAmount);
			} catch (error) {
				console.error("wETH bridge flow failed:", error);
				// Error state is already set by individual steps
			}
		},
	};
}
