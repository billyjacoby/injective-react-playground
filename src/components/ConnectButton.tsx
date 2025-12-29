import { useGaslessStore } from "../stores/gaslessStore";

export function ConnectButton() {
	const { isConnecting, connectWallet } = useGaslessStore();

	return (
		<button
			type="button"
			onClick={connectWallet}
			disabled={isConnecting}
			className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium"
		>
			{isConnecting ? "Connecting..." : "Connect Wallet"}
		</button>
	);
}
