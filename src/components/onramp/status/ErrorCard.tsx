import { useOnrampStore } from "../../../stores/onramp";

type ErrorCardProps = {
	onRetry: () => void;
};

export function ErrorCard({ onRetry }: ErrorCardProps) {
	const error = useOnrampStore((state) => state.error);

	return (
		<div className="text-center py-8">
			<div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
				<svg
					className="w-10 h-10 text-red-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-label="Error icon"
					role="img"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>

			<h2 className="text-2xl font-bold text-white mb-2">
				Something went wrong
			</h2>
			<p className="text-gray-400 mb-4">
				{error || "An unexpected error occurred"}
			</p>

			<button
				type="button"
				onClick={onRetry}
				className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
			>
				Try Again
			</button>
		</div>
	);
}
