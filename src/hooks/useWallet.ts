import { getInjectiveAddress } from "@injectivelabs/sdk-ts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Address, createWalletClient, custom } from "viem";
import { injective } from "viem/chains";

/**
 * Hook for managing wallet connection
 * Handles connecting to wallet, getting accounts, and converting to Injective addresses
 * Uses viem wallet client for all wallet interactions
 */
export function useWallet() {
	const [account, setAccount] = useState<Address | null>(null);
	const [injectiveAddress, setInjectiveAddress] = useState<string | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [chainId, setChainId] = useState<number | null>(null);

	// Create wallet client using viem
	const walletClient = useMemo(() => {
		try {
			if (!window?.ethereum) {
				throw new Error(
					"No Ethereum provider found. Please install Rabby wallet.",
				);
			}
			return createWalletClient({
				chain: injective,
				transport: custom(window.ethereum),
			});
		} catch (err) {
			console.error("Error creating wallet client:", err);
			return null;
		}
	}, []);

	/**
	 * Connect wallet and request account access using viem wallet client
	 */
	const connectWallet = useCallback(async () => {
		if (!walletClient) {
			setError("No Ethereum provider found. Please install Rabby wallet.");
			return;
		}

		setIsConnecting(true);
		setError(null);

		try {
			// Request account access using viem
			const accounts = await walletClient.requestAddresses();

			if (!accounts || accounts.length === 0) {
				throw new Error("No accounts found");
			}

			const addr = accounts[0];
			setAccount(addr);

			const injAddr = getInjectiveAddress(addr);
			setInjectiveAddress(injAddr);

			// Check and switch chain if needed
			const chainId = await walletClient.getChainId();
			if (chainId !== injective.id) {
				try {
					await walletClient.switchChain(injective);
					setChainId(injective.id);
				} catch (err) {
					setChainId(chainId);
					console.error("Error switching chain:", err);
					setError("Failed to switch to Injective network");
				}
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to connect wallet";
			setError(errorMessage);
			console.error("Connection error:", err);
		} finally {
			setIsConnecting(false);
		}
	}, [walletClient]);

	const disconnectWallet = useCallback(async () => {
		setAccount(null);
		setInjectiveAddress(null);
		setChainId(null);
		setError(null);
	}, []);

	// Check for existing connection on mount
	useEffect(() => {
		if (!walletClient) return;

		async function checkConnection() {
			if (!walletClient) return;

			try {
				// Get addresses using viem wallet client
				const accounts = await walletClient.getAddresses();

				if (accounts && accounts.length > 0) {
					const addr = accounts[0];
					setAccount(addr);
					const injAddr = getInjectiveAddress(addr);
					setInjectiveAddress(injAddr);
				}

				const chainId = await walletClient.getChainId();
				setChainId(chainId);
			} catch (err) {
				console.error("Error checking connection:", err);
			}
		}

		checkConnection();
	}, [walletClient]);

	return {
		chainId,
		account,
		injectiveAddress,
		isConnecting,
		error,
		walletClient,
		setError,
		connectWallet,
		disconnectWallet,
	};
}
