import type { GasEstimate } from "../../../lib/services/gasCalculator";

type GasReserveInfoProps = {
	gasEstimate: GasEstimate;
};

export function GasReserveInfo({ gasEstimate }: GasReserveInfoProps) {
	return (
		<div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
			<div className="flex items-start gap-3">
				<svg
					className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div className="text-sm">
					<p className="text-amber-200 font-medium">Gas Reserve</p>
					<p className="text-amber-200/70 mt-1">
						~{parseFloat(gasEstimate.safeEthToReserve).toFixed(5)} ETH will be
						kept for transaction fees (wrap, approve, bridge).
					</p>
				</div>
			</div>
		</div>
	);
}
