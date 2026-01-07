import { Wallet } from "@injectivelabs/wallet-base";
import "./App.css";
import { SendInj } from "./src/components/SendInj";
import { useWallet } from "./src/hooks/useWallet";

export type SigObject = {
	address: string;
	message: string;
	signature: string;
};

function App() {
	const { wallet, injAddress, connect, disconnect } = useWallet();

	return (
		<div className="flex flex-col items-center gap-4">
			<h1 className="text-5xl ">Injective React</h1>
			{injAddress ? (
				<>
					<p>Wallet: {injAddress}</p>
					<button type="button" onClick={disconnect}>
						Disconnect Wallet
					</button>
				</>
			) : (
				<>
				<button type="button" onClick={() => connect(Wallet.Rabby)}>
					Connect Rabby  Wallet
				</button>
				<button type="button" onClick={() => connect(Wallet.Keplr)}>
					Connect Keplr  Wallet
				</button>
				</>
			)}
			<div className="flex flex-col gap-2">
				<SendInj wallet={wallet} address={injAddress} />
			</div>
		</div>
	);
}

export default App;
