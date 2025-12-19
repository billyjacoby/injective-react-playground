import { useGaslessStore } from "../stores/gaslessStore";

export function AddressDisplay() {
	const { ownerAddress, smartAccountAddress } = useGaslessStore();

	if (!ownerAddress) return null;

	return (
		<div className="bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
			<div className="flex justify-between">
				<span className="text-gray-400">EOA</span>
				<span className="font-mono">{ownerAddress}</span>
			</div>
			<div className="flex justify-between">
				<span className="text-gray-400">Smart Account</span>
				<span className="font-mono">
					{smartAccountAddress ? smartAccountAddress : "—"}
				</span>
			</div>
		</div>
	);
}
