import { getInjectiveAddress } from "@injectivelabs/sdk-ts";
import { Wallet } from "@injectivelabs/wallet-base";
import { BaseWalletStrategy } from "@injectivelabs/wallet-core";
import { EvmWalletStrategy } from "@injectivelabs/wallet-evm";
import { MoonPayProvider } from "@moonpay/moonpay-react";
import React from "react";
import { NETWORK_INFO } from "../../constants/setup";
import { createSendTransactionFn } from "../../lib/services/walletService";
import { useOnrampEffects } from "../../stores/onramp";
import { OnrampContent } from "./OnrampContent";
import { ConnectWallet, WalletHeader } from "./wallet";

const MOONPAY_API_KEY = "pk_test_BE3mHNKo20rh808zYUPChbNOdvW8fmEr";

// Wrapper component that handles wallet connection
export function OnrampPage() {
	const [wallet, setWallet] = React.useState<BaseWalletStrategy | undefined>();
	const [evmAddress, setEvmAddress] = React.useState<string | undefined>();
	const [injAddress, setInjAddress] = React.useState<string | undefined>();
	const [isConnecting, setIsConnecting] = React.useState(false);

	// Initialize wallet strategy
	const initWallet = React.useCallback(async () => {
		const strategy = new EvmWalletStrategy({
			chainId: NETWORK_INFO.chainId,
			wallet: Wallet.Rabby,
			evmOptions: {
				evmChainId: NETWORK_INFO.evmChainId ?? 1,
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
		return _wallet;
	}, []);

	// Connect wallet
	const connectWallet = async () => {
		setIsConnecting(true);
		try {
			let currentWallet = wallet;
			if (!currentWallet) {
				currentWallet = await initWallet();
			}

			await currentWallet.enableAndGetAddresses();
			const addresses = await currentWallet.getAddresses();
			const address = addresses[0];

			setEvmAddress(address);
			setInjAddress(getInjectiveAddress(address));
		} catch (error) {
			console.error("Failed to connect wallet:", error);
		} finally {
			setIsConnecting(false);
		}
	};

	// Disconnect wallet
	const disconnectWallet = async () => {
		await wallet?.disconnect();
		setEvmAddress(undefined);
		setInjAddress(undefined);
	};

	// Create send transaction function
	const sendTransaction = React.useMemo(() => {
		if (!wallet || !evmAddress)
			return async () => {
				throw new Error("Wallet not connected");
			};
		return createSendTransactionFn(wallet, evmAddress);
	}, [wallet, evmAddress]);

	// Wallet config for store
	const walletConfig = React.useMemo(() => {
		if (!evmAddress || !injAddress) return undefined;
		return {
			address: evmAddress,
			injectiveAddress: injAddress,
			sendTransaction,
		};
	}, [evmAddress, injAddress, sendTransaction]);

	// Set up store effects
	useOnrampEffects({ walletConfig });

	// Not connected state
	if (!evmAddress) {
		return (
			<ConnectWallet isConnecting={isConnecting} onConnect={connectWallet} />
		);
	}

	return (
		<MoonPayProvider apiKey={MOONPAY_API_KEY}>
			<div className="relative">
				<WalletHeader
					evmAddress={evmAddress}
					onDisconnect={disconnectWallet}
				/>

				{/* Add padding for fixed header */}
				<div className="pt-14">
					<OnrampContent walletAddress={evmAddress} />
				</div>
			</div>
		</MoonPayProvider>
	);
}

export default OnrampPage;
