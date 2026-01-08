import "./App.css";
import { injective, polygon } from "viem/chains";
import {
	INJ_USDT_ADDRESS,
	POLYGON_DESINTATION_ADDRESS,
	POLYGON_USDC_ADDRESS,
} from "./constants";
import { BridgeInfo } from "./src/components/BridgeInfo";
import { ErrorDisplay } from "./src/components/ErrorDisplay";
import { WalletConnectionButton } from "./src/components/WalletConnectionButton";
import { WalletInfo } from "./src/components/WalletInfo";
import { useWallet } from "./src/hooks/useWallet";
import { client } from "./src/lib/poly-client";
import { getSafeWallet } from "./src/utils/get-safe-wallet";

function App() {
	const {
		chainId,
		account,
		injectiveAddress,
		disconnectWallet,
		isConnecting,
		error,
		setError,
		connectWallet,
		walletClient,
	} = useWallet();

	async function getPolymarketSafeAddress() {
		if (!account) {
			console.error("Please connect your wallet first");
			return;
		}

		const safeAddress = getSafeWallet(account);

		const isSafeDeployed = await client.getDeployed(safeAddress);
		console.log(
			"🪵 | getPolymarketSafeAddress | isSafeDeployed:",
			isSafeDeployed,
		);

		if (!isSafeDeployed) {
			await walletClient?.switchChain(polygon);
			// need to deploy the safe here
			const response = await client.deploy();
			console.log("🪵 | getPolymarketSafeAddress | response:", response);
			const result = await response.wait();
			console.log("🪵 | getPolymarketSafeAddress | result:", result);
			console.log("🪵 | Safe address:", safeAddress);
		}
	}

	return (
		<div className="flex flex-col items-center gap-4 p-8">
			<h1 className="text-5xl">Injective React</h1>

			<button type="button" onClick={getPolymarketSafeAddress}>
				Deploy Polymarket
			</button>

			{!account || !walletClient ? (
				<WalletConnectionButton
					onClick={connectWallet}
					isConnecting={isConnecting}
					error={error}
				/>
			) : injectiveAddress && account ? (
				<div className="flex flex-col items-center gap-4 w-full max-w-md">
					<WalletInfo
						account={account}
						injectiveAddress={injectiveAddress}
						currentChainId={chainId}
					/>

					<BridgeInfo
						walletClient={walletClient}
						injectiveAddress={injectiveAddress}
						account={account}
						isOnInjectiveChain={chainId === injective.id}
						srcChainTokenIn={INJ_USDT_ADDRESS}
						dstChainId="137"
						dstChainTokenOut={POLYGON_USDC_ADDRESS}
						dstChainTokenOutRecipient={POLYGON_DESINTATION_ADDRESS}
						tokenDecimals={6}
						onError={setError}
					/>

					<button
						type="button"
						onClick={disconnectWallet}
						className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
					>
						Disconnect Wallet
					</button>

					<ErrorDisplay error={error} className="w-full" />
				</div>
			) : null}
		</div>
	);
}

export default App;
