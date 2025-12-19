type BalanceDisplayProps = {
	ethBalance: string;
	wethBalance: string;
};

export function BalanceDisplay({
	ethBalance,
	wethBalance,
}: BalanceDisplayProps) {
	return (
		<div className="grid grid-cols-2 gap-4">
			<div className="bg-gray-800/50 rounded-lg p-4">
				<p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
					ETH Balance
				</p>
				<p className="text-lg font-semibold text-white">
					{parseFloat(ethBalance).toFixed(6)} ETH
				</p>
			</div>
			<div className="bg-gray-800/50 rounded-lg p-4">
				<p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
					wETH Balance
				</p>
				<p className="text-lg font-semibold text-white">
					{parseFloat(wethBalance).toFixed(6)} wETH
				</p>
			</div>
		</div>
	);
}
