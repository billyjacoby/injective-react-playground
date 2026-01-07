import { Wallet } from "@injectivelabs/wallet-base";
import { BaseWalletStrategy } from "@injectivelabs/wallet-core";
import { CosmosWalletStrategy } from "@injectivelabs/wallet-cosmos";
import { EvmWalletStrategy } from "@injectivelabs/wallet-evm";
import { useEffect, useState, useCallback, useRef } from "react";
import { NETWORK_INFO } from "../../constants";
import { getInjectiveAddress } from "@injectivelabs/sdk-ts";


const getWallet = (walletType: Wallet | null | undefined) => {
        if(!walletType) return undefined;

        const rabbyStrategy = new EvmWalletStrategy({
			chainId: NETWORK_INFO.chainId,
			wallet: Wallet.Rabby,
			evmOptions: {
				evmChainId: NETWORK_INFO.evmChainId ?? 1776,
			},
		});

		const keplrStrategy = new CosmosWalletStrategy({
			chainId: NETWORK_INFO.chainId,
			wallet: Wallet.Keplr,
		});

    	const wallet = new BaseWalletStrategy({
			chainId: NETWORK_INFO.chainId,
			wallet: walletType,
			strategies: {
				[Wallet.Rabby]: rabbyStrategy,
				[Wallet.Keplr]: keplrStrategy,
			},
		});

		return wallet;
}

export function useWallet() {
	const [wallet, setWallet] = useState<BaseWalletStrategy>();
	const [injAddress, setInjAddress] = useState<string>();
	const loadEffectHasRun = useRef(false);

    const onLoad = useCallback(async () => {
        const walletType = localStorage.getItem("walletType") as Wallet | undefined;
        const wallet = getWallet(walletType);
        setWallet(wallet);
        const addresses = await wallet?.enableAndGetAddresses();

        if(walletType === Wallet.Keplr) {
            console.log('keplr', addresses);
            setInjAddress(addresses?.[0]);
            return
        }

        if (addresses && addresses?.length > 0) {
				const address = getInjectiveAddress(addresses[0]);
				setInjAddress(address);
			}
    }, []);

	const connect = useCallback(
		async (walletType: Wallet) => {
            const wallet = getWallet(walletType);
			if (!wallet) return;

			setWallet(wallet);
			const addresses = await wallet.enableAndGetAddresses();
            localStorage.setItem("walletType", walletType);
            if(walletType === Wallet.Keplr) {
                setInjAddress(addresses[0]);
                return
            }
			if (addresses.length > 0) {
				const address = getInjectiveAddress(addresses[0]);
				setInjAddress(address);
			}
		},
		[],
	);

	const disconnect = useCallback(() => {
		if (wallet) {
			wallet.disconnect();
		}
		setInjAddress(undefined);
		localStorage.removeItem("walletType");
	}, [wallet]);

	useEffect(() => {
		if (loadEffectHasRun.current) return;
		loadEffectHasRun.current = true;
        onLoad();
	}, [onLoad]);

	return {
		wallet,
		injAddress,
		connect,
		disconnect,
	};
}
