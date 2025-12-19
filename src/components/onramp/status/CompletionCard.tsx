import { useOnrampStore } from "../../../stores/onramp";

type CompletionCardProps = {
	onReset: () => void;
};

export function CompletionCard({ onReset }: CompletionCardProps) {
	const transactions = useOnrampStore((state) => state.transactions);
	const quote = useOnrampStore((state) => state.quote);
	const bridgedAmount = useOnrampStore((state) => state.bridgedAmount);

	return (
		<div className="text-center py-8">
			<div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
				<svg
					className="w-10 h-10 text-emerald-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-label="Success icon"
					role="img"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M5 13l4 4L19 7"
					/>
				</svg>
			</div>

			<h2 className="text-2xl font-bold text-white mb-2">Bridge Initiated!</h2>
			<p className="text-gray-400 mb-6">
				Your wETH is being bridged to Injective. This typically takes 5-15
				minutes.
			</p>

			{(bridgedAmount || quote) && (
				<div className="bg-gray-900/50 rounded-lg p-4 mb-6 text-left">
					<p className="text-sm text-gray-500 mb-2">Amount bridging:</p>
					<p className="text-xl font-semibold text-white">
						{parseFloat(bridgedAmount || quote?.wethAmount || "0").toFixed(6)}{" "}
						wETH
					</p>
				</div>
			)}

			{transactions.bridgeTx && (
				<a
					href={`https://etherscan.io/tx/${transactions.bridgeTx}`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
				>
					View bridge transaction on Etherscan
					<svg
						aria-label="Etherscan icon"
						role="img"
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/>
					</svg>
				</a>
			)}

			<button
				type="button"
				onClick={onReset}
				className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
			>
				Start New Onramp
			</button>
		</div>
	);
}
