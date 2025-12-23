import { getInjectiveAddress } from "@injectivelabs/sdk-ts";
import type { Address, Chain, Hex, PublicClient, WalletClient } from "viem";
import {
	createWalletClient,
	custom,
	encodeFunctionData,
	erc20Abi,
	maxUint256,
	parseEther,
	publicActions,
} from "viem";
import { BundlerClient, SmartAccount } from "viem/account-abstraction";
import { create } from "zustand";
import { NETWORK } from "../constants/setup";
import { usdtToken, wethToken } from "../constants/tokens";
import { erc20WethAbi } from "../lib/contracts/Erc20WethContract";
import {
	getInjectivePeggyBridgeAddress,
	PeggyContract,
	peggyAbi,
} from "../lib/contracts/PeggyContract";
import { getDefaultConfig, getGaslessClient } from "../lib/gasless/client";
import { sendGasless } from "../lib/gasless/transactions";
import { handleCommonErrors } from "../lib/utils/common-errors";
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

	// Clients (memoized)
	smartAccount: SmartAccount | null;
	bundlerClient: BundlerClient | null;
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
	smartAccount: null,
	bundlerClient: null,
	walletClient: null,

	// Actions
	connectWallet: async () => {
		const config = getDefaultConfig();

		const error = handleCommonErrors(config);

		if (error) {
			set({ status: error });
			return;
		}

		set({ isConnecting: true, status: "Connecting..." });

		try {
			const {
				smartAccount,
				bundlerClient,
				ownerAddress,
				smartAccountAddress,
				walletClient,
			} = await getGaslessClient(config);

			set({
				smartAccount,
				bundlerClient,
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
		const { ownerAddress, smartAccountAddress, walletClient } = get();
		if (
			!ownerAddress ||
			!smartAccountAddress ||
			!walletClient ||
			!walletClient.account
		)
			return;

		set({
			isProcessing: true,
			status: "Sending test gasless tx (0 ETH to self)...",
		});

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const hashedData = await walletClient.signTransaction({
				account: walletClient.account,
				chain,
				to: ownerAddress,
				value: 0n,
			});

			await sendGasless({ to: ownerAddress, data: hashedData });
			set({ status: "Test gasless tx successful!", isProcessing: false });
		} catch (error) {
			console.error("Test gasless error:", error);
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

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await walletClient.waitForTransactionReceipt({ hash });
			set({ status: "ETH sent to smart account!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Fund ETH error:", error);
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

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await walletClient.waitForTransactionReceipt({ hash });
			set({ status: "WETH sent to smart account!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Fund WETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Fund failed",
				isProcessing: false,
			});
		}
	},

	withdrawEth: async (withdrawEthAmount?: string) => {
		const { ownerAddress, smartAccountAddress, smartBalances, walletClient } =
			get();
		if (
			!ownerAddress ||
			!smartAccountAddress ||
			smartBalances.eth === 0n ||
			!walletClient
		)
			return;

		set({ isProcessing: true, status: "Withdrawing ETH (gasless)..." });

		try {
			const amount = withdrawEthAmount
				? parseEther(withdrawEthAmount)
				: smartBalances.eth;
			if (amount > smartBalances.eth) {
				set({
					status: "Insufficient ETH in smart account",
					isProcessing: false,
				});
				return;
			}

			await sendGasless({ to: ownerAddress, value: amount });
			set({ status: "ETH withdrawn (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Withdraw ETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Withdraw failed",
				isProcessing: false,
			});
		}
	},

	withdrawWeth: async (withdrawWethAmount?: string) => {
		const { ownerAddress, smartAccountAddress, smartBalances, walletClient } =
			get();
		if (
			!ownerAddress ||
			!smartAccountAddress ||
			smartBalances.weth === 0n ||
			!walletClient
		)
			return;

		set({ isProcessing: true, status: "Withdrawing WETH (gasless)..." });

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = withdrawWethAmount
				? parseEther(withdrawWethAmount)
				: smartBalances.weth;
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

			await sendGasless({
				to: wethToken.address as Address,
				data: transferCalldata,
			});
			set({ status: "WETH withdrawn (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Withdraw WETH error:", error);
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

			console.log("🪵 | hash:", hash);

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await walletClient.waitForTransactionReceipt({ hash });
			set({ status: "ETH wrapped to WETH!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Wrap ETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Wrap failed",
				isProcessing: false,
			});
		}
	},

	wrapEthFromSmartAccount: async (wrapSmartEthAmount?: string) => {
		const { smartBalances } = get();
		if (!smartBalances.eth || smartBalances.eth === 0n) return;

		set({
			isProcessing: true,
			status: "Wrapping ETH to WETH (gasless)...",
		});

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = wrapSmartEthAmount
				? parseEther(wrapSmartEthAmount)
				: smartBalances.eth;
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

			await sendGasless({
				to: wethToken.address as Address,
				data: depositCalldata,
				value: amount,
			});

			set({ status: "ETH wrapped to WETH (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Wrap ETH error:", error);
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

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await walletClient.waitForTransactionReceipt({ hash });
			set({ status: "WETH unwrapped to ETH!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Unwrap WETH error:", error);
			set({
				status: error instanceof Error ? error.message : "Unwrap failed",
				isProcessing: false,
			});
		}
	},

	unwrapWethFromSmartAccount: async (unwrapSmartWethAmount?: string) => {
		const { smartBalances } = get();
		if (!smartBalances.weth || smartBalances.weth === 0n) return;

		set({
			isProcessing: true,
			status: "Unwrapping WETH to ETH (gasless)...",
		});

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = unwrapSmartWethAmount
				? parseEther(unwrapSmartWethAmount)
				: smartBalances.weth;
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

			await sendGasless({
				to: wethToken.address as Address,
				data: withdrawCalldata,
			});

			set({ status: "WETH unwrapped to ETH (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Unwrap WETH error:", error);
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

		// Check the ERC20 allowance for the token
		const allowance = await walletClient.readContract({
			address: wethToken.address as Address,
			abi: erc20Abi,
			functionName: "allowance",
			args: [ownerAddress, getInjectivePeggyBridgeAddress(NETWORK)],
		});

		if (allowance < amount || allowance !== maxUint256) {
			const hash = await walletClient.writeContract({
				account: ownerAddress,
				address: wethToken.address as Address,
				abi: erc20Abi,
				functionName: "approve",
				args: [getInjectivePeggyBridgeAddress(NETWORK), maxUint256],
			});
			set({ isProcessing: true, status: "Approving WETH allowance..." });
			const result = await walletClient
				.waitForTransactionReceipt({ hash })
				.catch(() => {
					set({
						isProcessing: false,
						status: "Failed to approve WETH allowance",
					});
					return null;
				});
			console.log("🪵 | result:", result);
		}

		const destinationBytes32 = PeggyContract.convertInjectiveAddressToBytes32(
			getInjectiveAddress(address),
		);

		const hash = await walletClient.writeContract({
			account: ownerAddress,
			address: getInjectivePeggyBridgeAddress(NETWORK),
			abi: peggyAbi,
			functionName: "sendToInjective",
			args: [wethToken.address as Address, destinationBytes32, amount, ""],
		});
		console.log("🪵 | hash:", hash);
		set({ isProcessing: true, status: "Bridging WETH to Injective (EOA)..." });

		const result2 = await walletClient
			.waitForTransactionReceipt({ hash })
			.then((receipt) => {
				set({
					isProcessing: false,
					status: "WETH bridged to Injective (EOA)!",
				});
				return receipt;
			})
			.catch(() => {
				set({
					isProcessing: false,
					status: "Failed to bridge WETH to Injective",
				});
				return null;
			});
		console.log("🪵 | result2:", result2);
	},

	peggyBridgeWethFromSmartAccount: async (
		peggyBridgeWethFromSmartAccountAmount?: string,
	) => {
		const { ownerAddress, smartAccountAddress, smartBalances } = get();
		const { bundlerClient } = await getGaslessClient(getDefaultConfig());

		if (!ownerAddress || !smartAccountAddress || smartBalances.weth === 0n) {
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

		const chainConfig = getInjNetworkToChain(NETWORK);

		const amount = peggyBridgeWethFromSmartAccountAmount
			? parseEther(peggyBridgeWethFromSmartAccountAmount)
			: smartBalances.weth;

		const walletClient = createWalletClient({
			chain: chainConfig,
			transport: custom(window.ethereum),
		}).extend(publicActions);

		const [address] = await walletClient.getAddresses();

		const destinationBytes32 = PeggyContract.convertInjectiveAddressToBytes32(
			getInjectiveAddress(address),
		);

		// Check the ERC20 allowance for the token
		const allowance = await walletClient.readContract({
			address: wethToken.address as Address,
			abi: erc20Abi,
			functionName: "allowance",
			args: [smartAccountAddress, getInjectivePeggyBridgeAddress(NETWORK)],
		});

		let approveData: Hex | null = null;

		if (allowance < amount || allowance !== maxUint256) {
			set({ isProcessing: true, status: "Approving WETH allowance..." });
			approveData = encodeFunctionData({
				abi: erc20Abi,
				functionName: "approve",
				args: [getInjectivePeggyBridgeAddress(NETWORK), maxUint256],
			});
		}

		const bridgeCallData = encodeFunctionData({
			abi: peggyAbi,
			functionName: "sendToInjective",
			args: [wethToken.address as Address, destinationBytes32, amount, ""],
		});

		bundlerClient.batch = {
			multicall: true,
		};
		const hash = await bundlerClient.sendUserOperation({
			calls: [
				...(approveData
					? [
							{
								data: approveData,
								to: wethToken.address as Address,
								value: 0n,
							},
						]
					: []),
				{
					data: bridgeCallData,
					to: getInjectivePeggyBridgeAddress(NETWORK),
					value: 0n,
				},
			],
		});

		set({ status: `UserOp sent: ${hash.slice(0, 10)}...` });

		const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
		console.log("🪵 | receipt:", receipt);

		set({
			isProcessing: false,
			status: "WETH bridged to Injective (gasless)!",
		});
		await get().fetchBalances();
	},
}));
