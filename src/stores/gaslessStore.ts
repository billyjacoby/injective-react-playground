import {
	GaslessBridgeClient,
	PEGGY_ABI,
	type SupportedChain,
} from "@billyjacoby/peggy-onramp";
import { isMainnet } from "@injectivelabs/networks";
import { getInjectiveAddress } from "@injectivelabs/sdk-ts";
import type { Address, Chain, PublicClient, WalletClient } from "viem";
import {
	createWalletClient,
	custom,
	encodeFunctionData,
	erc20Abi,
	maxUint256,
	parseEther,
	publicActions,
} from "viem";
import { create } from "zustand";
import { NETWORK } from "../constants/setup";
import { usdtToken, wethToken } from "../constants/tokens";
import { erc20WethAbi } from "../lib/contracts/Erc20WethContract";
import {
	getInjectivePeggyBridgeAddress,
	PeggyContract,
} from "../lib/contracts/PeggyContract";
import { getInjNetworkToChain } from "../lib/utils/network";

type Balances = {
	eth: bigint;
	weth: bigint;
	usdt: bigint;
};

const ZERO_BALANCES: Balances = { eth: 0n, weth: 0n, usdt: 0n };

type GaslessStore = {
	// State
	ownerAddress: Address | null;
	smartAccountAddress: Address | null;
	eoaBalances: Balances;
	smartBalances: Balances;
	isConnecting: boolean;
	isLoading: boolean;
	status: string;
	isProcessing: boolean;
	chain: Chain;

	// Clients
	gaslessClient: GaslessBridgeClient | null;
	walletClient: (WalletClient & PublicClient) | null;

	// Actions
	connectWallet: () => Promise<void>;
	fetchBalances: () => Promise<void>;
	testGasless: () => Promise<void>;
	fundEth: (amount: string) => Promise<void>;
	fundWeth: (amount: string) => Promise<void>;
	withdrawEth: (amount?: string) => Promise<void>;
	withdrawWeth: (amount?: string) => Promise<void>;
	wrapEthFromEoa: (amount: string) => Promise<void>;
	wrapEthFromSmartAccount: (amount?: string) => Promise<void>;
	unwrapWethFromEoa: (amount?: string) => Promise<void>;
	unwrapWethFromSmartAccount: (amount?: string) => Promise<void>;
	peggyBridgeWethFromEOA: (amount: string) => Promise<void>;
	peggyBridgeWethFromSmartAccount: (amount?: string) => Promise<void>;
};

const chain = getInjNetworkToChain(NETWORK);

export const useGaslessStore = create<GaslessStore>((set, get) => ({
	// Initial state
	ownerAddress: null,
	smartAccountAddress: null,
	eoaBalances: ZERO_BALANCES,
	smartBalances: ZERO_BALANCES,
	isConnecting: false,
	isLoading: false,
	status: "",
	isProcessing: false,
	chain,

	// Clients
	gaslessClient: null,
	walletClient: null,

	// Actions
	connectWallet: async () => {
		const apiKey = isMainnet(NETWORK)
			? (import.meta.env.VITE_ALCHEMY_KEY as string)
			: (import.meta.env.VITE_ALCHEMY_SEPOLIA_KEY as string);
		const policyId = isMainnet(NETWORK)
			? (import.meta.env.VITE_ALCHEMY_GAS_POLICY_ID as string)
			: (import.meta.env.VITE_ALCHEMY_GAS_POLICY_ID_SEPOLIA as string);

		set({ isConnecting: true, status: "Connecting..." });

		try {
			const chainName: SupportedChain = isMainnet(NETWORK)
				? "mainnet"
				: "sepolia";

			const gaslessClient = new GaslessBridgeClient({
				chain: chainName,
				apiKey,
				policyId,
			});

			const { ownerAddress, smartAccountAddress } =
				await gaslessClient.connect();

			// Create wallet client for balance fetching
			if (!window.ethereum) {
				throw new Error("No ethereum provider found");
			}

			const walletClient = createWalletClient({
				chain,
				transport: custom(window.ethereum),
			}).extend(publicActions);

			set({
				gaslessClient,
				ownerAddress,
				smartAccountAddress,
				walletClient,
				status: "",
				isConnecting: false,
			});
		} catch (error) {
			console.error("Connection error:", error);
			set({
				status: error instanceof Error ? error.message : "Failed to connect",
				isConnecting: false,
			});
		}
	},

	fetchBalances: async () => {
		const { ownerAddress, smartAccountAddress, walletClient } = get();
		if (!ownerAddress || !smartAccountAddress || !walletClient) return;

		set({ isLoading: true });

		const safeErc20Balance = async (token: Address, account: Address) => {
			try {
				return (await walletClient.readContract({
					address: token,
					abi: erc20Abi,
					functionName: "balanceOf",
					args: [account],
				})) as bigint;
			} catch {
				return 0n;
			}
		};

		try {
			const [eoaEth, eoaWeth, eoaUsdt, smartEth, smartWeth, smartUsdt] =
				await Promise.all([
					walletClient.getBalance({ address: ownerAddress }),
					safeErc20Balance(wethToken.address as Address, ownerAddress),
					safeErc20Balance(usdtToken.address as Address, ownerAddress),
					walletClient.getBalance({ address: smartAccountAddress }),
					safeErc20Balance(wethToken.address as Address, smartAccountAddress),
					safeErc20Balance(usdtToken.address as Address, smartAccountAddress),
				]);

			set({
				eoaBalances: { eth: eoaEth, weth: eoaWeth, usdt: eoaUsdt },
				smartBalances: { eth: smartEth, weth: smartWeth, usdt: smartUsdt },
				isLoading: false,
			});
		} catch (error) {
			console.error("Error fetching balances:", error);
			set({ isLoading: false });
		}
	},

	testGasless: async () => {
		const { gaslessClient, ownerAddress } = get();
		if (!gaslessClient || !ownerAddress) return;

		set({
			isProcessing: true,
			status: "Sending test gasless tx (0 ETH to self)...",
		});

		try {
			console.log("🔄 Sending test gasless transaction...");
			const result = await gaslessClient.sendGasless({
				to: ownerAddress,
				value: 0n,
			});
			console.log("✅ Test gasless tx result:", {
				userOperationHash: result.userOperationHash,
				transactionHash: result.transactionHash,
				smartAccountAddress: result.smartAccountAddress,
			});
			set({ status: "Test gasless tx successful!", isProcessing: false });
		} catch (error) {
			console.error("❌ Test gasless error:", error);
			set({
				status: error instanceof Error ? error.message : "Test tx failed",
				isProcessing: false,
			});
		}
	},

	fundEth: async (fundEthAmount: string) => {
		const { ownerAddress, smartAccountAddress, eoaBalances, walletClient } =
			get();
		if (!ownerAddress || !smartAccountAddress || !walletClient) return;

		set({ isProcessing: true, status: "Sending ETH to smart account..." });

		try {
			const amount = parseEther(fundEthAmount);
			console.log("💰 Funding ETH to smart account:", {
				amount: amount.toString(),
				amountEth: fundEthAmount,
				from: ownerAddress,
				to: smartAccountAddress,
			});

			if (amount > eoaBalances.eth) {
				set({
					status: "Insufficient ETH balance",
					isProcessing: false,
				});
				return;
			}

			const hash = await walletClient.sendTransaction({
				account: ownerAddress,
				to: smartAccountAddress,
				value: amount,
				chain,
			});
			console.log("📤 Fund ETH tx hash:", hash);

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			const receipt = await walletClient.waitForTransactionReceipt({ hash });
			console.log("✅ Fund ETH receipt:", {
				transactionHash: receipt.transactionHash,
				blockNumber: receipt.blockNumber,
				status: receipt.status,
			});
			set({ status: "ETH sent to smart account!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Fund ETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Fund failed",
				isProcessing: false,
			});
		}
	},

	fundWeth: async (fundWethAmount: string) => {
		const { ownerAddress, smartAccountAddress, eoaBalances, walletClient } =
			get();
		if (
			!ownerAddress ||
			!smartAccountAddress ||
			!window.ethereum ||
			!walletClient
		)
			return;

		set({ isProcessing: true, status: "Sending WETH to smart account..." });

		try {
			const amount = parseEther(fundWethAmount);
			console.log("💰 Funding WETH to smart account:", {
				amount: amount.toString(),
				amountEth: fundWethAmount,
				from: ownerAddress,
				to: smartAccountAddress,
			});

			if (amount > eoaBalances.weth) {
				set({
					status: "Insufficient WETH balance",
					isProcessing: false,
				});
				return;
			}

			const hash = await walletClient.writeContract({
				account: ownerAddress,
				address: wethToken.address as Address,
				abi: erc20Abi,
				functionName: "transfer",
				args: [smartAccountAddress, amount],
				chain,
			});
			console.log("📤 Fund WETH tx hash:", hash);

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			const receipt = await walletClient.waitForTransactionReceipt({ hash });
			console.log("✅ Fund WETH receipt:", {
				transactionHash: receipt.transactionHash,
				blockNumber: receipt.blockNumber,
				status: receipt.status,
			});
			set({ status: "WETH sent to smart account!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Fund WETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Fund failed",
				isProcessing: false,
			});
		}
	},

	withdrawEth: async (withdrawEthAmount?: string) => {
		const { gaslessClient, ownerAddress, smartBalances } = get();
		if (!gaslessClient || !ownerAddress || smartBalances.eth === 0n) return;

		set({ isProcessing: true, status: "Withdrawing ETH (gasless)..." });

		try {
			const amount = withdrawEthAmount
				? parseEther(withdrawEthAmount)
				: smartBalances.eth;
			console.log("🔄 Withdrawing ETH (gasless):", {
				amount: amount.toString(),
				amountEth: withdrawEthAmount || "all",
				to: ownerAddress,
			});

			if (amount > smartBalances.eth) {
				set({
					status: "Insufficient ETH in smart account",
					isProcessing: false,
				});
				return;
			}

			const result = await gaslessClient.sendGasless({
				to: ownerAddress,
				value: amount,
			});
			console.log("✅ Withdraw ETH result:", {
				userOperationHash: result.userOperationHash,
				transactionHash: result.transactionHash,
				smartAccountAddress: result.smartAccountAddress,
			});
			set({ status: "ETH withdrawn (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Withdraw ETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Withdraw failed",
				isProcessing: false,
			});
		}
	},

	withdrawWeth: async (withdrawWethAmount?: string) => {
		const { gaslessClient, ownerAddress, smartBalances } = get();
		if (!gaslessClient || !ownerAddress || smartBalances.weth === 0n) return;

		set({ isProcessing: true, status: "Withdrawing WETH (gasless)..." });

		try {
			const amount = withdrawWethAmount
				? parseEther(withdrawWethAmount)
				: smartBalances.weth;
			console.log("🔄 Withdrawing WETH (gasless):", {
				amount: amount.toString(),
				amountEth: withdrawWethAmount || "all",
				to: ownerAddress,
			});

			if (amount > smartBalances.weth) {
				set({
					status: "Insufficient WETH in smart account",
					isProcessing: false,
				});
				return;
			}

			const transferCalldata = encodeFunctionData({
				abi: erc20Abi,
				functionName: "transfer",
				args: [ownerAddress, amount],
			});

			const result = await gaslessClient.sendGasless({
				to: wethToken.address as Address,
				data: transferCalldata,
			});
			console.log("✅ Withdraw WETH result:", {
				userOperationHash: result.userOperationHash,
				transactionHash: result.transactionHash,
				smartAccountAddress: result.smartAccountAddress,
			});
			set({ status: "WETH withdrawn (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Withdraw WETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Withdraw failed",
				isProcessing: false,
			});
		}
	},

	wrapEthFromEoa: async (wrapEoaEthAmount: string) => {
		const { ownerAddress, eoaBalances, walletClient } = get();
		if (
			!ownerAddress ||
			!window.ethereum ||
			eoaBalances.eth === 0n ||
			!walletClient
		)
			return;

		set({ isProcessing: true, status: "Wrapping ETH to WETH (EOA)..." });

		try {
			const amount = parseEther(wrapEoaEthAmount);
			console.log("🔄 Wrapping ETH to WETH (EOA):", {
				amount: amount.toString(),
				amountEth: wrapEoaEthAmount,
				from: ownerAddress,
			});

			if (amount > eoaBalances.eth) {
				set({
					status: "Insufficient ETH balance",
					isProcessing: false,
				});
				return;
			}

			const hash = await walletClient.writeContract({
				account: ownerAddress,
				address: wethToken.address as Address,
				abi: erc20WethAbi,
				functionName: "deposit",
				args: [],
				value: amount,
				chain,
			});
			console.log("📤 Wrap ETH tx hash:", hash);

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			const receipt = await walletClient.waitForTransactionReceipt({ hash });
			console.log("✅ Wrap ETH receipt:", {
				transactionHash: receipt.transactionHash,
				blockNumber: receipt.blockNumber,
				status: receipt.status,
			});
			set({ status: "ETH wrapped to WETH!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Wrap ETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Wrap failed",
				isProcessing: false,
			});
		}
	},

	wrapEthFromSmartAccount: async (wrapSmartEthAmount?: string) => {
		const { gaslessClient, smartBalances } = get();
		if (!gaslessClient || !smartBalances.eth || smartBalances.eth === 0n)
			return;

		set({
			isProcessing: true,
			status: "Wrapping ETH to WETH (gasless)...",
		});

		try {
			const amount = wrapSmartEthAmount
				? parseEther(wrapSmartEthAmount)
				: smartBalances.eth;
			console.log("🔄 Wrapping ETH to WETH (gasless):", {
				amount: amount.toString(),
				amountEth: wrapSmartEthAmount || "all",
			});

			if (amount > smartBalances.eth) {
				set({
					status: "Insufficient ETH in smart account",
					isProcessing: false,
				});
				return;
			}

			const depositCalldata = encodeFunctionData({
				abi: erc20WethAbi,
				functionName: "deposit",
				args: [],
			});

			const result = await gaslessClient.sendGasless({
				to: wethToken.address as Address,
				data: depositCalldata,
				value: amount,
			});
			console.log("✅ Wrap ETH (gasless) result:", {
				userOperationHash: result.userOperationHash,
				transactionHash: result.transactionHash,
				smartAccountAddress: result.smartAccountAddress,
			});

			set({ status: "ETH wrapped to WETH (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Wrap ETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Wrap failed",
				isProcessing: false,
			});
		}
	},

	unwrapWethFromEoa: async (unwrapEoaWethAmount?: string) => {
		const { ownerAddress, eoaBalances, walletClient } = get();
		if (
			!ownerAddress ||
			!window.ethereum ||
			eoaBalances.weth === 0n ||
			!walletClient
		)
			return;

		set({ isProcessing: true, status: "Unwrapping WETH to ETH (EOA)..." });

		try {
			const amount = unwrapEoaWethAmount
				? parseEther(unwrapEoaWethAmount)
				: eoaBalances.weth;
			console.log("🔄 Unwrapping WETH to ETH (EOA):", {
				amount: amount.toString(),
				amountEth: unwrapEoaWethAmount || "all",
				from: ownerAddress,
			});

			if (amount > eoaBalances.weth) {
				set({
					status: "Insufficient WETH balance",
					isProcessing: false,
				});
				return;
			}

			const hash = await walletClient.writeContract({
				account: ownerAddress,
				address: wethToken.address as Address,
				abi: erc20WethAbi,
				functionName: "withdraw",
				args: [amount],
				chain,
			});
			console.log("📤 Unwrap WETH tx hash:", hash);

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			const receipt = await walletClient.waitForTransactionReceipt({ hash });
			console.log("✅ Unwrap WETH receipt:", {
				transactionHash: receipt.transactionHash,
				blockNumber: receipt.blockNumber,
				status: receipt.status,
			});
			set({ status: "WETH unwrapped to ETH!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Unwrap WETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Unwrap failed",
				isProcessing: false,
			});
		}
	},

	unwrapWethFromSmartAccount: async (unwrapSmartWethAmount?: string) => {
		const { gaslessClient, smartBalances } = get();
		if (!gaslessClient || !smartBalances.weth || smartBalances.weth === 0n)
			return;

		set({
			isProcessing: true,
			status: "Unwrapping WETH to ETH (gasless)...",
		});

		try {
			const amount = unwrapSmartWethAmount
				? parseEther(unwrapSmartWethAmount)
				: smartBalances.weth;
			console.log("🔄 Unwrapping WETH to ETH (gasless):", {
				amount: amount.toString(),
				amountEth: unwrapSmartWethAmount || "all",
			});

			if (amount > smartBalances.weth) {
				set({
					status: "Insufficient WETH in smart account",
					isProcessing: false,
				});
				return;
			}

			const withdrawCalldata = encodeFunctionData({
				abi: erc20WethAbi,
				functionName: "withdraw",
				args: [amount],
			});

			const result = await gaslessClient.sendGasless({
				to: wethToken.address as Address,
				data: withdrawCalldata,
			});
			console.log("✅ Unwrap WETH (gasless) result:", {
				userOperationHash: result.userOperationHash,
				transactionHash: result.transactionHash,
				smartAccountAddress: result.smartAccountAddress,
			});

			set({ status: "WETH unwrapped to ETH (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Unwrap WETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Unwrap failed",
				isProcessing: false,
			});
		}
	},

	peggyBridgeWethFromEOA: async (peggyBridgeWethFromEOAAmount: string) => {
		const { ownerAddress, eoaBalances } = get();
		if (!ownerAddress || !window.ethereum || eoaBalances.weth === 0n) return;

		const amount = parseEther(peggyBridgeWethFromEOAAmount);
		console.log("🌉 Starting Peggy Bridge from EOA:", {
			amount: amount.toString(),
			amountEth: peggyBridgeWethFromEOAAmount,
			from: ownerAddress,
		});

		if (amount > eoaBalances.weth) {
			set({
				status: "Insufficient WETH balance",
				isProcessing: false,
			});
			return;
		}
		const chainConfig = getInjNetworkToChain(NETWORK);

		const walletClient = createWalletClient({
			chain: chainConfig,
			transport: custom(window.ethereum),
		}).extend(publicActions);

		const [address] = await walletClient.getAddresses();
		const injectiveAddress = getInjectiveAddress(address);
		console.log("🎯 Destination Injective address:", injectiveAddress);

		// Check the ERC20 allowance for the token
		const allowance = await walletClient.readContract({
			address: wethToken.address as Address,
			abi: erc20Abi,
			functionName: "allowance",
			args: [ownerAddress, getInjectivePeggyBridgeAddress(NETWORK)],
		});
		console.log("🔍 Current WETH allowance:", allowance.toString());

		if (allowance < amount || allowance !== maxUint256) {
			console.log("📝 Approving WETH allowance...");
			const hash = await walletClient.writeContract({
				account: ownerAddress,
				address: wethToken.address as Address,
				abi: erc20Abi,
				functionName: "approve",
				args: [getInjectivePeggyBridgeAddress(NETWORK), maxUint256],
			});
			console.log("📤 Approval tx hash:", hash);
			set({ isProcessing: true, status: "Approving WETH allowance..." });

			const result = await walletClient
				.waitForTransactionReceipt({ hash })
				.catch((error) => {
					console.error("❌ Approval failed:", error);
					set({
						isProcessing: false,
						status: "Failed to approve WETH allowance",
					});
					return null;
				});
			console.log("✅ Approval receipt:", result);
		}

		const destinationBytes32 =
			PeggyContract.convertInjectiveAddressToBytes32(injectiveAddress);
		console.log("🔄 Sending bridge transaction...");

		const hash = await walletClient.writeContract({
			account: ownerAddress,
			address: getInjectivePeggyBridgeAddress(NETWORK),
			abi: PEGGY_ABI,
			functionName: "sendToInjective",
			args: [wethToken.address as Address, destinationBytes32, amount, ""],
		});
		console.log("📤 Bridge tx hash:", hash);
		set({ isProcessing: true, status: "Bridging WETH to Injective (EOA)..." });

		await walletClient
			.waitForTransactionReceipt({ hash })
			.then((receipt) => {
				console.log("✅ Bridge receipt:", {
					transactionHash: receipt.transactionHash,
					blockNumber: receipt.blockNumber,
					status: receipt.status,
				});
				set({
					isProcessing: false,
					status: "WETH bridged to Injective (EOA)!",
				});
			})
			.catch((error) => {
				console.error("❌ Bridge transaction failed:", error);
				set({
					isProcessing: false,
					status: "Failed to bridge WETH to Injective",
				});
			});
	},

	peggyBridgeWethFromSmartAccount: async (
		peggyBridgeWethFromSmartAccountAmount?: string,
	) => {
		const { gaslessClient, smartBalances } = get();

		if (!gaslessClient || smartBalances.weth === 0n) {
			set({
				status: "Insufficient WETH balance in smart account",
				isProcessing: false,
			});
			return;
		}

		if (!window.ethereum) {
			set({
				status: "No wallet connected",
				isProcessing: false,
			});
			return;
		}

		set({
			isProcessing: true,
			status: "Bridging WETH to Injective (gasless)...",
		});

		try {
			const amount = peggyBridgeWethFromSmartAccountAmount
				? parseEther(peggyBridgeWethFromSmartAccountAmount)
				: smartBalances.weth;

			const walletClient = createWalletClient({
				chain,
				transport: custom(window.ethereum),
			}).extend(publicActions);

			const [address] = await walletClient.getAddresses();
			const injectiveAddress = getInjectiveAddress(address);

			console.log("🌉 Starting Peggy Bridge from Smart Account (gasless):", {
				amount: amount.toString(),
				amountEth: peggyBridgeWethFromSmartAccountAmount || "all",
				tokenAddress: wethToken.address,
				destinationInjAddress: injectiveAddress,
			});

			const result = await gaslessClient.bridgeToInjective({
				tokenAddress: wethToken.address as Address,
				amount,
				injectiveAddress,
			});

			console.log("✅ Bridge (gasless) result:", {
				userOperationHash: result.userOperationHash,
				transactionHash: result.transactionHash,
				smartAccountAddress: result.smartAccountAddress,
			});

			set({
				isProcessing: false,
				status: "WETH bridged to Injective (gasless)!",
			});
			await get().fetchBalances();
		} catch (error) {
			console.error("❌ Bridge WETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Bridge failed",
				isProcessing: false,
			});
		}
	},
}));
