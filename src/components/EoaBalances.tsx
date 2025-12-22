import { formatEther } from "viem";
import { useGaslessStore } from "../stores/gaslessStore";

function fmtEth(v: bigint) {
	return Number(formatEther(v)).toFixed(6);
}

export function EoaBalances() {
	const {
		eoaBalances,
		isLoading,
		isProcessing,
		fundEthAmount,
		fundWethAmount,
		wrapEoaEthAmount,
		unwrapEoaWethAmount,
		peggyBridgeWethFromEOAAmount,
		fundEth,
		fundWeth,
		wrapEthFromEoa,
		unwrapWethFromEoa,
		peggyBridgeWethFromEOA,
		setPeggyBridgeWethFromEOAAmount,
		setFundEthAmount,
		setFundWethAmount,
		setWrapEoaEthAmount,
		setUnwrapEoaWethAmount,
	} = useGaslessStore();

	return (
		<div className="bg-gray-800 rounded-lg p-4">
			<h2 className="text-sm text-gray-400">
				EOA Balances → Send to Smart Account
			</h2>
			<h2 className="text-sm text-gray-400 mb-3">
				(Gas required for these TX)
			</h2>
			{isLoading ? (
				<p className="text-gray-500 text-sm">Loading...</p>
			) : (
				<div className="space-y-3 text-sm">
					{/* ETH */}
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<span className="w-28">ETH: {fmtEth(eoaBalances.eth)}</span>
							{eoaBalances.eth > 0n && (
								<>
									<input
										type="text"
										value={fundEthAmount}
										onChange={(e) => setFundEthAmount(e.target.value)}
										className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
										placeholder="0.001"
									/>
									<button
										type="button"
										onClick={fundEth}
										disabled={isProcessing}
										className="py-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
									>
										Send
									</button>
								</>
							)}
						</div>
						{eoaBalances.eth > 0n && (
							<div className="flex items-center gap-2 pl-28">
								<input
									type="text"
									value={wrapEoaEthAmount}
									onChange={(e) => setWrapEoaEthAmount(e.target.value)}
									className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
									placeholder="0.001"
								/>
								<button
									type="button"
									onClick={wrapEthFromEoa}
									disabled={isProcessing}
									className="py-1 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
								>
									Wrap → WETH
								</button>
							</div>
						)}
					</div>
					{/* WETH */}
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<span className="w-28">WETH: {fmtEth(eoaBalances.weth)}</span>
							{eoaBalances.weth > 0n && (
								<div className="flex flex-col items-center gap-2">
									<div className="flex items-center gap-2">
										<input
											type="text"
											value={fundWethAmount}
											onChange={(e) => setFundWethAmount(e.target.value)}
											className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
											placeholder="0.001"
										/>
										<button
											type="button"
											onClick={fundWeth}
											disabled={isProcessing}
											className="py-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
										>
											Send
										</button>
									</div>
									<div className="flex items-center gap-2">
										<input
											type="text"
											value={peggyBridgeWethFromEOAAmount}
											onChange={(e) =>
												setPeggyBridgeWethFromEOAAmount(e.target.value)
											}
											className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
											placeholder="0.001"
										/>
										<button
											type="button"
											onClick={peggyBridgeWethFromEOA}
											disabled={isProcessing}
											className="py-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
										>
											Bridge → Injective
										</button>
									</div>
								</div>
							)}
						</div>
						{eoaBalances.weth > 0n && (
							<div className="flex items-center gap-2 pl-28">
								<input
									type="text"
									value={unwrapEoaWethAmount}
									onChange={(e) => setUnwrapEoaWethAmount(e.target.value)}
									className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs font-mono"
									placeholder="0.001"
								/>
								<button
									type="button"
									onClick={unwrapWethFromEoa}
									disabled={isProcessing}
									className="py-1 px-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded text-xs whitespace-nowrap"
								>
									Unwrap → ETH
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
