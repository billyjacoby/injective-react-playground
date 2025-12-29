import { MoonPayProvider } from "@moonpay/moonpay-react";
import { useEffect } from "react";
import { AddressDisplay } from "./src/components/AddressDisplay";
import { ConnectButton } from "./src/components/ConnectButton";
import { EoaBalances } from "./src/components/EoaBalances";
import { Moonpay } from "./src/components/Moonpay";
import { SmartAccountBalances } from "./src/components/SmartAccountBalances";
import { StatusMessage } from "./src/components/StatusMessage";
import { TestGaslessButton } from "./src/components/TestGaslessButton";
import { useGaslessStore } from "./src/stores/gaslessStore";

const MOONPAY_API_KEY = import.meta.env.VITE_MOONPAY_API_KEY;
console.log("🪵 | MOONPAY_API_KEY:", MOONPAY_API_KEY);

if (!MOONPAY_API_KEY) {
	throw new Error("Moonpay API key is not set");
}

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
						<Moonpay />
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

export default function WrappedApp() {
	return (
		<MoonPayProvider apiKey={MOONPAY_API_KEY}>
			<App />
		</MoonPayProvider>
	);
}
