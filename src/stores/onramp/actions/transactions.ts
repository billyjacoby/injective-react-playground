import {
	Address,
	formatEther,
	getAddress,
	maxUint256,
	parseEther,
	toHex,
} from "viem";
import { wethToken } from "../../../constants/tokens";
import { OnrampStep } from "../../../context/onrampContext";
import { erc20WethContract } from "../../../lib/contracts/Erc20WethContract";
import {
	injectivePeggyBridgeAddress,
	peggyContract,
} from "../../../lib/contracts/PeggyContract";
import { gasCalculator } from "../../../lib/services/gasCalculator";
import { OnrampActions, OnrampStoreApi } from "../types";

// Transaction execution actions
export function createTransactionActions({
	set,
	get,
}: OnrampStoreApi): Pick<
	OnrampActions,
	"executeWrap" | "executeApprove" | "executeBridge"
> {
	return {
		executeWrap: async (targetAmount?: string) => {
			const { walletConfig, ethBalance, gasSpeed } = get();
			if (!walletConfig) throw new Error("Wallet not connected");

			const { address, sendTransaction } = walletConfig;
			get().setStep(OnrampStep.WRAPPING_ETH);
			set({ isLoading: true });

			try {
				let amountToWrap: string;

				if (targetAmount) {
					// Use target amount if provided, but ensure we have enough ETH for gas
					const gasEstimate = await gasCalculator.calculateGasReserve(gasSpeed);
					const gasReserve = parseFloat(gasEstimate.safeEthToReserve);
					const ethBal = parseFloat(ethBalance);
					const targetAmountNum = parseFloat(targetAmount);

					if (ethBal < gasReserve + targetAmountNum) {
						throw new Error(
							`Insufficient ETH. Need ${(gasReserve + targetAmountNum).toFixed(6)} ETH (${targetAmountNum.toFixed(6)} for wrap + ${gasReserve.toFixed(6)} for gas)`,
						);
					}

					amountToWrap = targetAmount;
				} else {
					// Calculate how much to wrap (total ETH minus gas reserve)
					const wrapCalc = await gasCalculator.calculateWrapAmount(
						ethBalance,
						gasSpeed,
					);

					if (!wrapCalc.isValid) {
						throw new Error(wrapCalc.error || "Invalid wrap amount");
					}

					amountToWrap = wrapCalc.amountToWrap;
				}

				// Get gas prices for the selected speed
				const gasPrices = await gasCalculator.getGasPricesForSpeed(gasSpeed);

				// Build wrap transaction
				const tx = await erc20WethContract.deposit(
					amountToWrap,
					address as Address,
				);

				// Override gas parameters with selected speed
				const txWithGas = {
					...tx,
					type: "0x2" as const,
					maxFeePerGas: toHex(gasPrices.maxFeePerGas),
					maxPriorityFeePerGas: toHex(gasPrices.maxPriorityFeePerGas),
				};

				console.log(`[OnrampStore] Wrap TX with ${gasSpeed} gas:`, {
					maxFeePerGas: `${Number(gasPrices.maxFeePerGas) / 1e9} gwei`,
					maxPriorityFeePerGas: `${Number(gasPrices.maxPriorityFeePerGas) / 1e9} gwei`,
					type: "0x2",
				});

				const txHash = await sendTransaction(txWithGas);

				const { transactions } = get();
				set({
					transactions: { ...transactions, wrapTx: txHash },
					isLoading: false,
				});

				// Refresh balances after wrap
				await new Promise((resolve) => setTimeout(resolve, 2000));
				await get().refreshBalances();

				return txHash;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : "Wrap failed";
				set({ error: errorMsg, isLoading: false });
				get().setStep(OnrampStep.ERROR);
				throw error;
			}
		},

		executeApprove: async () => {
			const { walletConfig } = get();
			if (!walletConfig) throw new Error("Wallet not connected");

			const { address, sendTransaction } = walletConfig;
			get().setStep(OnrampStep.APPROVING_WETH);
			set({ isLoading: true });

			try {
				// Check current allowance
				const currentAllowance = await erc20WethContract.getAllowance(
					address as Address,
					injectivePeggyBridgeAddress as Address,
				);

				const { wethBalance } = get();
				const wethBalanceWei = parseEther(wethBalance);

				// If allowance is sufficient, skip approval
				if (currentAllowance >= wethBalanceWei) {
					set({ isLoading: false });
					return "already-approved";
				}

				// Get gas prices for the selected speed
				const { gasSpeed } = get();
				const gasPrices = await gasCalculator.getGasPricesForSpeed(gasSpeed);

				// Build approve transaction
				const tx = await erc20WethContract.setTokenAllowance({
					amount: maxUint256,
					fromAddress: address as Address,
					tokenAddress: getAddress(wethToken.address) as Address,
					spenderAddress: injectivePeggyBridgeAddress as Address,
				});

				// Override gas parameters with selected speed
				const txWithGas = {
					...tx,
					type: "0x2" as const,
					maxFeePerGas: toHex(gasPrices.maxFeePerGas),
					maxPriorityFeePerGas: toHex(gasPrices.maxPriorityFeePerGas),
				};

				console.log(`[OnrampStore] Approve TX with ${gasSpeed} gas:`, {
					maxFeePerGas: `${Number(gasPrices.maxFeePerGas) / 1e9} gwei`,
					maxPriorityFeePerGas: `${Number(gasPrices.maxPriorityFeePerGas) / 1e9} gwei`,
					type: "0x2",
				});

				const txHash = await sendTransaction(txWithGas);

				const { transactions } = get();
				set({
					transactions: { ...transactions, approveTx: txHash },
					isLoading: false,
				});

				// Wait for confirmation
				await new Promise((resolve) => setTimeout(resolve, 2000));

				return txHash;
			} catch (error) {
				const errorMsg =
					error instanceof Error ? error.message : "Approval failed";
				set({ error: errorMsg, isLoading: false });
				get().setStep(OnrampStep.ERROR);
				throw error;
			}
		},

		executeBridge: async (targetAmount?: string) => {
			const { walletConfig } = get();
			if (!walletConfig) throw new Error("Wallet not connected");

			const { address, injectiveAddress, sendTransaction } = walletConfig;
			get().setStep(OnrampStep.BRIDGING);
			set({ isLoading: true });

			try {
				// Refresh balance to ensure we have the latest
				await get().refreshBalances();

				// Get current wETH balance (fresh from contract)
				const wethBalanceWei = await erc20WethContract.getWethBalance(
					address as Address,
				);

				const wethBalanceEth = formatEther(wethBalanceWei);

				let amountToBridge: bigint;
				let amountToBridgeEth: string;

				if (targetAmount) {
					// Use target amount if provided
					const targetAmountWei = parseEther(targetAmount);

					if (targetAmountWei > wethBalanceWei) {
						throw new Error(
							`Insufficient wETH. Have ${wethBalanceEth}, need ${targetAmount}`,
						);
					}

					if (targetAmountWei === 0n) {
						throw new Error("Bridge amount must be greater than 0");
					}

					amountToBridge = targetAmountWei;
					amountToBridgeEth = targetAmount;
				} else {
					// Use full balance if no target amount specified
					if (wethBalanceWei === 0n) {
						throw new Error("No wETH to bridge");
					}

					amountToBridge = wethBalanceWei;
					amountToBridgeEth = wethBalanceEth;
				}

				console.log(`[OnrampStore] Bridge amount:`, {
					wei: amountToBridge.toString(),
					eth: amountToBridgeEth,
				});

				// Get gas prices for the selected speed
				const { gasSpeed } = get();
				const gasPrices = await gasCalculator.getGasPricesForSpeed(gasSpeed);

				// Build bridge transaction
				const tx = await peggyContract.sendToInjective({
					amount: amountToBridge.toString(),
					fromAddress: address,
					tokenAddress: getAddress(wethToken.address),
					destinationAddress: injectiveAddress,
				});

				// Override gas parameters with selected speed
				const txWithGas = {
					...tx,
					type: "0x2" as const,
					maxFeePerGas: toHex(gasPrices.maxFeePerGas),
					maxPriorityFeePerGas: toHex(gasPrices.maxPriorityFeePerGas),
				};

				console.log(`[OnrampStore] Bridge TX with ${gasSpeed} gas:`, {
					maxFeePerGas: `${Number(gasPrices.maxFeePerGas) / 1e9} gwei`,
					maxPriorityFeePerGas: `${Number(gasPrices.maxPriorityFeePerGas) / 1e9} gwei`,
					type: "0x2",
				});

				const txHash = await sendTransaction(txWithGas);

				const { transactions } = get();
				set({
					transactions: { ...transactions, bridgeTx: txHash },
					bridgedAmount: amountToBridgeEth,
					isLoading: false,
				});

				// Mark as complete
				get().setStep(OnrampStep.COMPLETE);

				return txHash;
			} catch (error) {
				const errorMsg =
					error instanceof Error ? error.message : "Bridge failed";
				set({ error: errorMsg, isLoading: false });
				get().setStep(OnrampStep.ERROR);
				throw error;
			}
		},
	};
}
