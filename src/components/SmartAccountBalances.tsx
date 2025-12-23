import { useState } from "react";
import { formatEther } from "viem";
import { useGaslessStore } from "../stores/gaslessStore";

function fmtEth(v: bigint) {
	return Number(formatEther(v)).toFixed(6);
}

export function SmartAccountBalances() {
	const {
		smartBalances,
		isLoading,
		isProcessing,
		withdrawEth,
		withdrawWeth,
		wrapEthFromSmartAccount,
		unwrapWethFromSmartAccount,
		peggyBridgeWethFromSmartAccount,
	} = useGaslessStore();

	const [withdrawEthAmount, setWithdrawEthAmount] = useState("0.001");
	const [withdrawWethAmount, setWithdrawWethAmount] = useState("0.001");
	const [wrapSmartEthAmount, setWrapSmartEthAmount] = useState("0.001");
	const [unwrapSmartWethAmount, setUnwrapSmartWethAmount] = useState("0.001");
	const [
		peggyBridgeWethFromSmartAccountAmount,
		setPeggyBridgeWethFromSmartAccountAmount,
	] = useState("0.001");

	return (
		<div className="bg-gray-800 rounded-lg p-4">
			<h2 className="text-sm text-gray-400">
				Smart Account Balances → Withdraw (Gasless)
			</h2>
			<h2 className="text-sm text-gray-400 mb-3">(Gasless TX!)</h2>
			{isLoading ? (
				<p className="text-gray-500 text-sm">Loading...</p>
			) : (
				<div className="space-y-3 text-sm">
					{/* ETH */}
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<span className="w-28">ETH: {fmtEth(smartBalances.eth)}</span>
							{smartBalances.eth > 0n && (
								<>
									<input
										type="text"
										value={withdrawEthAmount}
										onChange={(e) => setWithdrawEthAmount(e.target.value)}
										className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
										placeholder="0.001"
									/>
									<button
										type="button"
										onClick={() => withdrawEth(withdrawEthAmount)}
										disabled={isProcessing}
										className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
									>
										Withdraw
									</button>
								</>
							)}
						</div>
						{smartBalances.eth > 0n && (
							<div className="flex items-center gap-2 pl-28">
								<input
									type="text"
									value={wrapSmartEthAmount}
									onChange={(e) => setWrapSmartEthAmount(e.target.value)}
									className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
									placeholder="0.001"
								/>
								<button
									type="button"
									onClick={() => wrapEthFromSmartAccount(wrapSmartEthAmount)}
									disabled={isProcessing}
									className="py-1 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
								>
									Wrap → WETH (Gasless)
								</button>
							</div>
						)}
					</div>
					{/* WETH */}
					{smartBalances.weth > 0n && (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<span className="w-28">WETH: {fmtEth(smartBalances.weth)}</span>
								<input
									type="text"
									value={withdrawWethAmount}
									onChange={(e) => setWithdrawWethAmount(e.target.value)}
									className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
									placeholder="0.001"
								/>
								<button
									type="button"
									onClick={() => withdrawWeth(withdrawWethAmount)}
									disabled={isProcessing}
									className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
								>
									Withdraw
								</button>
							</div>
							<div className="flex items-center gap-2">
								<div className="flex items-center gap-2 pl-28">
									<input
										type="text"
										value={unwrapSmartWethAmount}
										onChange={(e) => setUnwrapSmartWethAmount(e.target.value)}
										className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
										placeholder="0.001"
									/>
									<button
										type="button"
										onClick={() =>
											unwrapWethFromSmartAccount(unwrapSmartWethAmount)
										}
										disabled={isProcessing}
										className="py-1 px-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
									>
										Unwrap → ETH (Gasless)
									</button>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={peggyBridgeWethFromSmartAccountAmount}
									onChange={(e) =>
										setPeggyBridgeWethFromSmartAccountAmount(e.target.value)
									}
									className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
									placeholder="0.001"
								/>
								<button
									type="button"
									onClick={() =>
										peggyBridgeWethFromSmartAccount(
											peggyBridgeWethFromSmartAccountAmount,
										)
									}
									disabled={isProcessing}
									className="py-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
								>
									Bridge → Injective
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
