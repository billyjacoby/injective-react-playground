import { useGaslessStore } from "../stores/gaslessStore";

export function TestGaslessButton() {
	const { isProcessing, testGasless } = useGaslessStore();

	return (
		<div className="bg-gray-800 rounded-lg p-4">
			<button
				type="button"
				onClick={testGasless}
				disabled={isProcessing}
				className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg text-sm"
			>
				Test Gasless Tx (0 ETH to self)
			</button>
		</div>
	);
}

