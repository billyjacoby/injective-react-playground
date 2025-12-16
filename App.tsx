import { getInjectiveAddress } from "@injectivelabs/sdk-ts";
import { Wallet } from "@injectivelabs/wallet-base";
import { BaseWalletStrategy } from "@injectivelabs/wallet-core";
import { EvmWalletStrategy } from "@injectivelabs/wallet-evm";
import React from "react";
import "./App.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { NETWORK_INFO } from "./constants";
import { DerivativeMarket } from "./src/components/DerivativeMarket";
import { SendInj } from "./src/components/SendInj";
import {
	refetchDerivativeMarkets,
	useDerivativeMarketTickers,
} from "./src/hooks/useDerivativeMarkets";
import { queryClient } from "./src/lib/query-client";
import { StreamManager } from "./src/lib/stream-manager";

export type SigObject = {
	address: string;
	message: string;
	signature: string;
};

function App() {
	const [wallet, setWallet] = React.useState<BaseWalletStrategy | undefined>();
	const [injAddress, setInjAddress] = React.useState<string | undefined>();
	const loadEffectHasRun = React.useRef(false);

	const {
		data: derivativeMarketsTickers,
		isLoading: isLoadingDerivativeMarketsTickers,
	} = useDerivativeMarketTickers();

	const onLoad = React.useCallback(async () => {
		const isConnected = localStorage.getItem("isConnected");
		if (isConnected) {
			setInjAddress(isConnected);
			return;
		}

		const strategy = new EvmWalletStrategy({
			chainId: NETWORK_INFO.chainId,
			wallet: Wallet.Rabby,
			evmOptions: {
				evmChainId: NETWORK_INFO.evmChainId ?? 1776,
			},
		});
		const _wallet = new BaseWalletStrategy({
			chainId: NETWORK_INFO.chainId,
			wallet: Wallet.Rabby,
			strategies: {
				[Wallet.Rabby]: strategy,
			},
		});

		setWallet(_wallet);
	}, []);

	async function disconnectWallet() {
		await wallet?.disconnect();
		setInjAddress(undefined);
		localStorage.removeItem("isConnected");
	}

	async function connectWallet() {
		if (!wallet) {
			throw new Error("Wallet not connected");
		}

		await wallet.enableAndGetAddresses();
		localStorage.setItem("isConnected", "true");

		const address = await wallet?.getAddresses();
		setInjAddress(getInjectiveAddress(address?.[0]));
	}

	React.useEffect(() => {
		if (!loadEffectHasRun.current) {
			onLoad();
			loadEffectHasRun.current = true;
		}
	}, [onLoad]);

	return (
		<div className="flex flex-col items-center gap-4">
			{isLoadingDerivativeMarketsTickers ? (
				<div>Loading...</div>
			) : (
				<div>
					<div className="flex flex-col gap-2">
						<h2>Derivative Markets</h2>
						<button type="button" onClick={refetchDerivativeMarkets}>
							Refresh
						</button>
					</div>
					<ul>
						{derivativeMarketsTickers?.map((market) => (
							<DerivativeMarket key={market.ticker} ticker={market.ticker} />
						))}
					</ul>
				</div>
			)}
			<h1 className="text-5xl ">Injective React</h1>
			{injAddress ? (
				<>
					<p>Wallet: {injAddress}</p>
					<button type="button" onClick={disconnectWallet}>
						Disconnect Wallet
					</button>
				</>
			) : (
				<button type="button" onClick={connectWallet}>
					Connect Wallet
				</button>
			)}
			<div className="flex flex-col gap-2">
				<SendInj wallet={wallet} address={injAddress} />
			</div>
			<StreamManager />
		</div>
	);
}

export default function WrappedApp() {
	return (
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	);
}
