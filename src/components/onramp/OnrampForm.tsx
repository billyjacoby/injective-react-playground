import React from "react";
import { type Address, formatEther } from "viem";
import { IS_MAINNET } from "../../constants/setup";
import { OnrampStep } from "../../context/onrampContext";
import { erc20WethContract } from "../../lib/contracts/Erc20WethContract";
import {
	createGaslessClient,
	getDefaultConfig,
} from "../../lib/gasless/client";
import { gaslessTransferWeth, gaslessWrapEth } from "../../lib/gasless/demo";
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
	const testGaslessTransaction = useOnrampStore(
		(state) => state.testGaslessTransaction,
	);
	const ethBalance = useOnrampStore((state) => state.ethBalance);
	const wethBalance = useOnrampStore((state) => state.wethBalance);
	const error = useOnrampStore((state) => state.error);
	const walletConfig = useOnrampStore((state) => state.walletConfig);

	// Smart account address state
	const [smartAccountAddress, setSmartAccountAddress] = React.useState<
		string | null
	>(null);
	const [smartAccountWethBalance, setSmartAccountWethBalance] =
		React.useState<string>("0");
	const [smartAccountEthBalance, setSmartAccountEthBalance] =
		React.useState<string>("0");
	const [isLoadingSmartAccount, setIsLoadingSmartAccount] =
		React.useState(false);

	// Fetch smart account address and balances when wallet is connected
	React.useEffect(() => {
		async function fetchSmartAccountData() {
			if (!walletConfig?.address) {
				setSmartAccountAddress(null);
				setSmartAccountWethBalance("0");
				setSmartAccountEthBalance("0");
				return;
			}

			const { policyId } = getDefaultConfig();
			if (!policyId) {
				console.warn("No policy ID configured");
				return;
			}

			setIsLoadingSmartAccount(true);
			try {
				const { smartAccountAddress: addr } = await createGaslessClient({
					policyId,
				});
				setSmartAccountAddress(addr);

				// Fetch balances for the smart account
				const [wethBal, ethBal] = await Promise.all([
					erc20WethContract.getWethBalance(addr as Address),
					erc20WethContract.getBalance(addr as Address),
				]);
				setSmartAccountWethBalance(formatEther(wethBal));
				setSmartAccountEthBalance(formatEther(ethBal));
			} catch (err) {
				console.error("Failed to get smart account data:", err);
			} finally {
				setIsLoadingSmartAccount(false);
			}
		}

		fetchSmartAccountData();
	}, [walletConfig?.address]);

	// Refresh smart account balances
	const refreshSmartAccountBalances = React.useCallback(async () => {
		if (!smartAccountAddress) return;
		try {
			const [wethBal, ethBal] = await Promise.all([
				erc20WethContract.getWethBalance(smartAccountAddress as Address),
				erc20WethContract.getBalance(smartAccountAddress as Address),
			]);
			setSmartAccountWethBalance(formatEther(wethBal));
			setSmartAccountEthBalance(formatEther(ethBal));
		} catch (err) {
			console.error("Failed to refresh balances:", err);
		}
	}, [smartAccountAddress]);

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

			{/* Smart Account Address Display */}
			{walletConfig?.address && (
				<div className="border-t border-gray-700 pt-4">
					<div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-400">Smart Account</span>
							<div className="flex items-center gap-2">
								{isLoadingSmartAccount && (
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
								)}
								<button
									type="button"
									onClick={refreshSmartAccountBalances}
									className="text-xs text-purple-400 hover:text-purple-300"
									title="Refresh balances"
								>
									🔄
								</button>
							</div>
						</div>
						{smartAccountAddress ? (
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<code className="flex-1 text-xs bg-gray-900 px-3 py-2 rounded-lg text-purple-300 font-mono break-all">
										{smartAccountAddress}
									</code>
									<button
										type="button"
										onClick={() => {
											navigator.clipboard.writeText(smartAccountAddress);
											alert("Smart account address copied!");
										}}
										className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
										title="Copy address"
									>
										📋
									</button>
								</div>

								{/* Smart Account Balances */}
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="bg-gray-900 px-3 py-2 rounded-lg">
										<span className="text-gray-500">ETH: </span>
										<span className="text-white">
											{parseFloat(smartAccountEthBalance).toFixed(6)}
										</span>
									</div>
									<div className="bg-gray-900 px-3 py-2 rounded-lg">
										<span className="text-gray-500">wETH: </span>
										<span className="text-white">
											{parseFloat(smartAccountWethBalance).toFixed(6)}
										</span>
									</div>
								</div>

								{/* Transfer wETH to EOA button */}
								{parseFloat(smartAccountWethBalance) > 0 && (
									<button
										type="button"
										onClick={async () => {
											if (!walletConfig?.address) return;
											try {
												const result = await gaslessTransferWeth(
													walletConfig.address as Address,
													smartAccountWethBalance,
												);
												const shortHash = `${result.userOperationHash.slice(0, 8)}...${result.userOperationHash.slice(-6)}`;
												alert(
													`✅ Transferred ${smartAccountWethBalance} wETH to your EOA!\n\nTx: ${shortHash}`,
												);
												// Refresh balances after transfer
												await refreshSmartAccountBalances();
											} catch (err) {
												const errorMsg =
													err instanceof Error ? err.message : "Unknown error";
												alert(`❌ Transfer failed: ${errorMsg}`);
											}
										}}
										disabled={isLoading}
										className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:cursor-not-allowed text-xs"
									>
										💸 Transfer {parseFloat(smartAccountWethBalance).toFixed(6)}{" "}
										wETH to EOA (Gasless)
									</button>
								)}

								<p className="text-xs text-gray-500">
									Send testnet ETH here, then wrap → transfer to test the full
									gasless flow.
								</p>
							</div>
						) : (
							<p className="text-xs text-gray-500">
								Connect wallet to see your smart account address
							</p>
						)}
					</div>
				</div>
			)}

			{/* Test Gasless Transaction Button */}
			<div className="border-t border-gray-700 pt-4 gap-2 flex flex-col">
				<button
					type="button"
					onClick={async () => {
						try {
							const userOpHash = await testGaslessTransaction();
							const explorerUrl = IS_MAINNET
								? `https://etherscan.io/tx/${userOpHash}`
								: `https://sepolia.etherscan.io/tx/${userOpHash}`;
							const shortHash = `${userOpHash.slice(0, 8)}...${userOpHash.slice(-6)}`;
							alert(
								`✅ Gasless transaction test successful!\n\nUserOperation Hash: ${shortHash}\n\nView on explorer: ${explorerUrl}\n\nCheck the console for more details.`,
							);
						} catch (err) {
							const errorMsg =
								err instanceof Error ? err.message : "Unknown error";
							alert(
								`❌ Test failed: ${errorMsg}\n\nCheck the console for details.`,
							);
						}
					}}
					disabled={isLoading || isFormDisabled}
					className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed text-sm"
				>
					{isLoading ? (
						<span className="flex items-center justify-center gap-2">
							<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
							Testing...
						</span>
					) : (
						"🧪 Test Gasless Transaction (Send 0 ETH to self)"
					)}
				</button>
				<button
					type="button"
					onClick={async () => {
						try {
							const result = await gaslessWrapEth("0.001");
							const userOpHash = result.userOperationHash;
							const explorerUrl = IS_MAINNET
								? `https://etherscan.io/tx/${userOpHash}`
								: `https://sepolia.etherscan.io/tx/${userOpHash}`;
							const shortHash = `${userOpHash.slice(0, 8)}...${userOpHash.slice(-6)}`;
							alert(
								`✅ Gasless transaction test successful!\n\nUserOperation Hash: ${shortHash}\n\nView on explorer: ${explorerUrl}\n\nCheck the console for more details.`,
							);
						} catch (err) {
							const errorMsg =
								err instanceof Error ? err.message : "Unknown error";
							alert(
								`❌ Test failed: ${errorMsg}\n\nCheck the console for details.`,
							);
						}
					}}
					disabled={isLoading || isFormDisabled}
					className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed text-sm"
				>
					{isLoading ? (
						<span className="flex items-center justify-center gap-2">
							<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
							Testing...
						</span>
					) : (
						"🧪 Gasless Wrap (Wrap 0.001 ETH to WETH)"
					)}
				</button>
				<p className="text-xs text-gray-500 text-center mt-2">
					This tests if account abstraction and gas sponsorship work correctly
				</p>
				{error && (
					<div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
						{error}
					</div>
				)}
			</div>

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
