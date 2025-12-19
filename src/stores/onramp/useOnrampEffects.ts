import React from "react";
import type { WalletConfig } from "./types";
import { useOnrampStore } from "./useOnrampStore";

type UseOnrampEffectsProps = {
	walletConfig: WalletConfig | undefined;
};

/**
 * Hook that sets up React effects for the onramp store:
 * - Sets wallet config in store
 * - Initial gas price fetch on mount
 * - Periodic gas price refresh (every 30 seconds)
 * - Quote fetch when USD amount changes
 * - Balance refresh when wallet address changes
 */
export function useOnrampEffects({ walletConfig }: UseOnrampEffectsProps) {
	const setWalletConfig = useOnrampStore((state) => state.setWalletConfig);
	const refreshGasPrices = useOnrampStore((state) => state.refreshGasPrices);
	const fetchQuote = useOnrampStore((state) => state.fetchQuote);
	const refreshBalances = useOnrampStore((state) => state.refreshBalances);
	const usdAmount = useOnrampStore((state) => state.usdAmount);

	// Set wallet config in store
	React.useEffect(() => {
		setWalletConfig(walletConfig);
	}, [walletConfig, setWalletConfig]);

	// Fetch gas prices on mount
	React.useEffect(() => {
		console.log("[useOnrampEffects] Initial gas price fetch");
		refreshGasPrices();
	}, [refreshGasPrices]);

	// Refresh gas prices periodically (every 30 seconds)
	// Note: refreshGasPrices reads gasSpeed from store, so we don't need gasSpeed in deps
	React.useEffect(() => {
		const interval = setInterval(() => {
			console.log("[useOnrampEffects] Periodic gas price refresh");
			refreshGasPrices();
		}, 30000);

		return () => clearInterval(interval);
	}, [refreshGasPrices]);

	// Fetch initial quote when amount changes
	React.useEffect(() => {
		if (usdAmount > 0) {
			fetchQuote(usdAmount);
		}
	}, [usdAmount, fetchQuote]);

	// Refresh balances when address changes
	React.useEffect(() => {
		if (walletConfig?.address) {
			refreshBalances();
		}
	}, [walletConfig?.address, refreshBalances]);
}
