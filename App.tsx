import { useEffect } from "react";
import { AddressDisplay } from "./src/components/AddressDisplay";
import { ConnectButton } from "./src/components/ConnectButton";
import { EoaBalances } from "./src/components/EoaBalances";
import { SmartAccountBalances } from "./src/components/SmartAccountBalances";
import { StatusMessage } from "./src/components/StatusMessage";
import { TestGaslessButton } from "./src/components/TestGaslessButton";
import { useGaslessStore } from "./src/stores/gaslessStore";

function App() {
	const { ownerAddress, smartAccountAddress, fetchBalances } =
		useGaslessStore();

	// Auto-fetch balances when addresses change
	useEffect(() => {
		if (ownerAddress && smartAccountAddress) {
			fetchBalances();
		}
	}, [ownerAddress, smartAccountAddress, fetchBalances]);

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4">
			<div className="w-full max-w-lg space-y-4">
				<h1 className="text-2xl font-bold text-center">Gasless PoC</h1>

				{!ownerAddress ? (
					<ConnectButton />
				) : (
					<div className="space-y-4">
						<AddressDisplay />
						<TestGaslessButton />
						<EoaBalances />
						<SmartAccountBalances />
					</div>
				)}

				<StatusMessage />
			</div>
		</div>
	);
}

export default App;
