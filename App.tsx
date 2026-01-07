import { getInjectiveAddress } from "@injectivelabs/sdk-ts";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { executeBridgeOrder } from "./src/lib/bridge-order";
import "./App.css";
import {
	INJ_USDT_ADDRESS,
	POLYGON_DESINTATION_ADDRESS,
	POLYGON_USDC_ADDRESS,
} from "./constants";

export type SigObject = {
	address: string;
	message: string;
	signature: string;
};

const INJECTIVE_CHAIN_ID = 1776;
const INJECTIVE_EVM_RPC = "https://k8s.mainnet.evm.grpc-web.injective.network";

// Injective chain configuration for wallet_addEthereumChain
const INJECTIVE_CHAIN_CONFIG = {
	chainId: `0x${INJECTIVE_CHAIN_ID.toString(16)}`, // 0x6f0
	chainName: "Injective",
	nativeCurrency: {
		name: "INJ",
		symbol: "INJ",
		decimals: 18,
	},
	rpcUrls: [INJECTIVE_EVM_RPC],
	blockExplorerUrls: ["https://explorer.injective.network"],
};

function App() {
	const [account, setAccount] = useState<Address | null>(null);
	const [injectiveAddress, setInjectiveAddress] = useState<string | null>(null);
	const [currentChainId, setCurrentChainId] = useState<number | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isSwitchingChain, setIsSwitchingChain] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Helper function to get ethereum provider
	function getEthereumProvider() {
		if (typeof window === "undefined") return null;

		const windowWithEthereum = window as Window & {
			ethereum?: {
				request: (args: {
					method: string;
					params?: unknown[];
				}) => Promise<unknown>;
				isRabby?: boolean;
				isMetaMask?: boolean;
			};
		};

		return windowWithEthereum.ethereum || null;
	}

	// Check current chain ID
	async function checkChainId() {
		const provider = getEthereumProvider();
		if (!provider) return;

		try {
			const chainId = (await provider.request({
				method: "eth_chainId",
			})) as string;
			const chainIdNumber = parseInt(chainId, 16);
			setCurrentChainId(chainIdNumber);
			return chainIdNumber;
		} catch (err) {
			console.error("Error checking chain ID:", err);
			return null;
		}
	}

	// Handle chain addition
	async function addInjectiveChain(
		provider: NonNullable<ReturnType<typeof getEthereumProvider>>,
	) {
		try {
			await provider.request({
				method: "wallet_addEthereumChain",
				params: [INJECTIVE_CHAIN_CONFIG],
			});
			await checkChainId();
			return true;
		} catch (addError) {
			const errorMessage =
				addError instanceof Error
					? addError.message
					: "Failed to add Injective chain";
			setError(errorMessage);
			console.error("Error adding chain:", addError);
			return false;
		}
	}

	// Switch to Injective chain
	async function switchToInjectiveChain() {
		const provider = getEthereumProvider();
		if (!provider) {
			setError("No Ethereum provider found");
			return false;
		}

		setIsSwitchingChain(true);
		setError(null);

		try {
			// Try to switch to the chain
			await provider.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId: INJECTIVE_CHAIN_CONFIG.chainId }],
			});
			await checkChainId();
			return true;
		} catch (switchError: unknown) {
			// Error code 4902 means chain not added
			const isChainNotAdded =
				switchError &&
				typeof switchError === "object" &&
				"code" in switchError &&
				switchError.code === 4902;

			if (isChainNotAdded) {
				return await addInjectiveChain(provider);
			}

			const errorMessage =
				switchError instanceof Error
					? switchError.message
					: "Failed to switch to Injective chain";
			setError(errorMessage);
			console.error("Error switching chain:", switchError);
			return false;
		} finally {
			setIsSwitchingChain(false);
		}
	}

	// Check if already connected on mount
	useEffect(() => {
		async function checkConnection() {
			const provider = getEthereumProvider();
			if (!provider) return;

			try {
				await checkChainId();
				const accounts = (await provider.request({
					method: "eth_accounts",
				})) as string[];

				if (accounts && accounts.length > 0) {
					const addr = accounts[0] as Address;
					setAccount(addr);
					const injAddr = getInjectiveAddress(addr);
					setInjectiveAddress(injAddr);
				}
			} catch (err) {
				console.error("Error checking connection:", err);
			}
		}

		checkConnection();

		// Listen for chain changes
		const provider = getEthereumProvider();
		if (!provider) return;

		const handleChainChanged = (chainId: string) => {
			const chainIdNumber = parseInt(chainId, 16);
			setCurrentChainId(chainIdNumber);
		};

		const providerWithEvents = provider as unknown as {
			on?: (event: string, handler: (chainId: string) => void) => void;
			removeListener?: (
				event: string,
				handler: (chainId: string) => void,
			) => void;
		};

		if (typeof providerWithEvents.on === "function") {
			providerWithEvents.on("chainChanged", handleChainChanged);
		}

		return () => {
			if (typeof providerWithEvents.removeListener === "function") {
				providerWithEvents.removeListener("chainChanged", handleChainChanged);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function connectRabby() {
		const provider = getEthereumProvider();
		if (!provider) {
			setError("No Ethereum provider found. Please install Rabby wallet.");
			return;
		}

		setIsConnecting(true);
		setError(null);

		try {
			// Request account access via ethereum provider
			const accounts = (await provider.request({
				method: "eth_requestAccounts",
			})) as string[];

			if (!accounts || accounts.length === 0) {
				throw new Error("No accounts found");
			}

			const addr = accounts[0] as Address;
			setAccount(addr);
			const injAddr = getInjectiveAddress(addr);
			setInjectiveAddress(injAddr);

			// Check and switch chain if needed
			const chainId = await checkChainId();
			if (chainId !== INJECTIVE_CHAIN_ID) {
				const switched = await switchToInjectiveChain();
				if (!switched) {
					setError("Please switch to Injective network to continue");
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
	}

	async function handleBridge() {
		if (!account || !injectiveAddress) {
			setError("Please connect your wallet first");
			return;
		}

		// Check if on correct chain before bridging
		const chainId = await checkChainId();
		if (chainId !== INJECTIVE_CHAIN_ID) {
			const switched = await switchToInjectiveChain();
			if (!switched) {
				setError(
					"Please switch to Injective network to send bridge transaction",
				);
				return;
			}
		}

		// Example bridge parameters - adjust these as needed
		const bridgeParams = {
			injectiveAddress,
			srcChainTokenIn: INJ_USDT_ADDRESS, // INJECTIVE_USDT
			srcChainTokenInAmount: "0.1",
			tokenDecimals: 6,
			dstChainId: "137", // Polygon
			dstChainTokenOut: POLYGON_USDC_ADDRESS, // POLYGON_USDC
			dstChainTokenOutRecipient: POLYGON_DESINTATION_ADDRESS, // Bridge to same address
		};

		try {
			setError(null);
			console.log("Starting bridge transaction...");
			const txHash = await executeBridgeOrder(bridgeParams);
			console.log("Bridge transaction successful:", txHash);
			alert(`Bridge transaction sent! Hash: ${txHash}`);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Bridge transaction failed";
			setError(errorMessage);
			console.error("Bridge error:", err);
		}
	}

	return (
		<div className="flex flex-col items-center gap-4 p-8">
			<h1 className="text-5xl">Injective React</h1>

			{!account ? (
				<div className="flex flex-col items-center gap-4">
					<button
						type="button"
						onClick={connectRabby}
						disabled={isConnecting}
						className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isConnecting ? "Connecting..." : "Connect Rabby Wallet"}
					</button>
					{error && (
						<p className="text-red-500 text-sm max-w-md text-center">{error}</p>
					)}
				</div>
			) : (
				<div className="flex flex-col items-center gap-4 w-full max-w-md">
					<div className="bg-gray-100 p-4 rounded-lg w-full">
						<p className="text-sm text-gray-600">Connected Account:</p>
						<p className="font-mono text-sm break-all text-black">{account}</p>
						<p className="text-sm text-gray-600 mt-2">Injective Address:</p>
						<p className="font-mono text-sm break-all text-black">
							{injectiveAddress}
						</p>
						<p className="text-sm text-gray-600 mt-2">Current Chain ID:</p>
						<p className="font-mono text-sm text-black">
							{currentChainId !== null
								? `${currentChainId} ${currentChainId === INJECTIVE_CHAIN_ID ? "✓ (Injective)" : "⚠ (Wrong chain)"}`
								: "Unknown"}
						</p>
					</div>

					{currentChainId !== INJECTIVE_CHAIN_ID && (
						<button
							type="button"
							onClick={switchToInjectiveChain}
							disabled={isSwitchingChain}
							className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSwitchingChain
								? "Switching Chain..."
								: "Switch to Injective Network"}
						</button>
					)}

					<button
						type="button"
						onClick={handleBridge}
						disabled={currentChainId !== INJECTIVE_CHAIN_ID}
						className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Send Bridge Transaction
					</button>

					{error && (
						<p className="text-red-500 text-sm text-center w-full">{error}</p>
					)}
				</div>
			)}
		</div>
	);
}

export default App;
