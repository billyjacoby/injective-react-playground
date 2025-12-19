import type { Address, Chain, PublicClient } from "viem";
import {
	createPublicClient,
	createWalletClient,
	custom,
	encodeFunctionData,
	erc20Abi,
	http,
	parseEther,
	parseUnits,
} from "viem";
import { create } from "zustand";
import { getAlchemyUrl, NETWORK } from "../constants/setup";
import { usdtToken, wethToken } from "../constants/tokens";
import { erc20WethAbi } from "../lib/contracts/Erc20WethContract";
import { createGaslessClient, getDefaultConfig } from "../lib/gasless/client";
import {
	sendGasless,
	sendGaslessErc20Transfer,
} from "../lib/gasless/transactions";
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
	fundEthAmount: string;
	fundWethAmount: string;
	withdrawEthAmount: string;
	withdrawWethAmount: string;
	withdrawUsdtAmount: string;
	wrapEoaEthAmount: string;
	wrapSmartEthAmount: string;
	unwrapEoaWethAmount: string;
	unwrapSmartWethAmount: string;

	// Clients (memoized)
	chain: Chain;
	publicClient: PublicClient;

	// Actions
	connectWallet: () => Promise<void>;
	fetchBalances: () => Promise<void>;
	testGasless: () => Promise<void>;
	fundEth: () => Promise<void>;
	fundWeth: () => Promise<void>;
	withdrawEth: () => Promise<void>;
	withdrawWeth: () => Promise<void>;
	withdrawUsdt: () => Promise<void>;
	wrapEthFromEoa: () => Promise<void>;
	wrapEthFromSmartAccount: () => Promise<void>;
	unwrapWethFromEoa: () => Promise<void>;
	unwrapWethFromSmartAccount: () => Promise<void>;
	setFundEthAmount: (amount: string) => void;
	setFundWethAmount: (amount: string) => void;
	setWithdrawEthAmount: (amount: string) => void;
	setWithdrawWethAmount: (amount: string) => void;
	setWithdrawUsdtAmount: (amount: string) => void;
	setWrapEoaEthAmount: (amount: string) => void;
	setWrapSmartEthAmount: (amount: string) => void;
	setUnwrapEoaWethAmount: (amount: string) => void;
	setUnwrapSmartWethAmount: (amount: string) => void;
};

const chain = getInjNetworkToChain(NETWORK);
const publicClient = createPublicClient({
	chain,
	transport: http(getAlchemyUrl(NETWORK)),
});

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
	fundEthAmount: "0.001",
	fundWethAmount: "0.001",
	withdrawEthAmount: "0.001",
	withdrawWethAmount: "0.001",
	withdrawUsdtAmount: "10",
	wrapEoaEthAmount: "0.001",
	wrapSmartEthAmount: "0.001",
	unwrapEoaWethAmount: "0.001",
	unwrapSmartWethAmount: "0.001",

	// Clients
	chain,
	publicClient,

	// Actions
	connectWallet: async () => {
		if (!window.ethereum) {
			set({ status: "Please install Rabby or MetaMask" });
			return;
		}

		set({ isConnecting: true, status: "Connecting..." });

		try {
			const config = getDefaultConfig();
			if (!config.policyId) {
				set({
					status: "Missing VITE_ALCHEMY_GAS_POLICY_ID env var",
					isConnecting: false,
				});
				return;
			}

			const { ownerAddress: owner, smartAccountAddress: smartAccount } =
				await createGaslessClient(config);

			set({
				ownerAddress: owner,
				smartAccountAddress: smartAccount,
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
		const { ownerAddress, smartAccountAddress, publicClient: client } = get();
		if (!ownerAddress || !smartAccountAddress) return;

		set({ isLoading: true });

		const safeErc20Balance = async (token: Address, account: Address) => {
			try {
				return (await client.readContract({
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
					client.getBalance({ address: ownerAddress }),
					safeErc20Balance(wethToken.address as Address, ownerAddress),
					safeErc20Balance(usdtToken.address as Address, ownerAddress),
					client.getBalance({ address: smartAccountAddress }),
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
		const { ownerAddress, smartAccountAddress } = get();
		if (!ownerAddress || !smartAccountAddress) return;

		set({
			isProcessing: true,
			status: "Sending test gasless tx (0 ETH to self)...",
		});

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			await sendGasless({ target: ownerAddress, value: 0n }, config);
			set({ status: "Test gasless tx successful!", isProcessing: false });
		} catch (error) {
			console.error("Test gasless error:", error);
			set({
				status: error instanceof Error ? error.message : "Test tx failed",
				isProcessing: false,
			});
		}
	},

	fundEth: async () => {
		const {
			ownerAddress,
			smartAccountAddress,
			eoaBalances,
			fundEthAmount,
			chain: chainConfig,
			publicClient: client,
		} = get();
		if (!ownerAddress || !smartAccountAddress || !window.ethereum) return;

		set({ isProcessing: true, status: "Sending ETH to smart account..." });

		try {
			const walletClient = createWalletClient({
				chain: chainConfig,
				transport: custom(window.ethereum),
			});

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
			});

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await client.waitForTransactionReceipt({ hash });
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

	fundWeth: async () => {
		const {
			ownerAddress,
			smartAccountAddress,
			eoaBalances,
			fundWethAmount,
			publicClient: client,
		} = get();
		if (!ownerAddress || !smartAccountAddress || !window.ethereum) return;

		set({ isProcessing: true, status: "Sending WETH to smart account..." });

		try {
			const walletClient = createWalletClient({
				chain,
				transport: custom(window.ethereum),
			});

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
			});

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await client.waitForTransactionReceipt({ hash });
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

	withdrawEth: async () => {
		const {
			ownerAddress,
			smartAccountAddress,
			smartBalances,
			withdrawEthAmount,
		} = get();
		if (!ownerAddress || !smartAccountAddress || smartBalances.eth === 0n)
			return;

		set({ isProcessing: true, status: "Withdrawing ETH (gasless)..." });

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = parseEther(withdrawEthAmount);
			if (amount > smartBalances.eth) {
				set({
					status: "Insufficient ETH in smart account",
					isProcessing: false,
				});
				return;
			}

			await sendGasless({ target: ownerAddress, value: amount }, config);
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

	withdrawWeth: async () => {
		const {
			ownerAddress,
			smartAccountAddress,
			smartBalances,
			withdrawWethAmount,
		} = get();
		if (!ownerAddress || !smartAccountAddress || smartBalances.weth === 0n)
			return;

		set({ isProcessing: true, status: "Withdrawing WETH (gasless)..." });

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = parseEther(withdrawWethAmount);
			if (amount > smartBalances.weth) {
				set({
					status: "Insufficient WETH in smart account",
					isProcessing: false,
				});
				return;
			}

			await sendGaslessErc20Transfer(
				{ token: wethToken.address as Address, to: ownerAddress, amount },
				config,
			);
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

	withdrawUsdt: async () => {
		const {
			ownerAddress,
			smartAccountAddress,
			smartBalances,
			withdrawUsdtAmount,
		} = get();
		if (!ownerAddress || !smartAccountAddress || smartBalances.usdt === 0n)
			return;

		set({ isProcessing: true, status: "Withdrawing USDT (gasless)..." });

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = parseUnits(withdrawUsdtAmount, 6);
			if (amount > smartBalances.usdt) {
				set({
					status: "Insufficient USDT in smart account",
					isProcessing: false,
				});
				return;
			}

			await sendGaslessErc20Transfer(
				{ token: usdtToken.address as Address, to: ownerAddress, amount },
				config,
			);
			set({ status: "USDT withdrawn (gasless)!", isProcessing: false });
			await get().fetchBalances();
		} catch (error) {
			console.error("Withdraw USDT error:", error);
			set({
				status: error instanceof Error ? error.message : "Withdraw failed",
				isProcessing: false,
			});
		}
	},

	wrapEthFromEoa: async () => {
		const {
			ownerAddress,
			eoaBalances,
			wrapEoaEthAmount,
			chain: chainConfig,
			publicClient: client,
		} = get();
		if (!ownerAddress || !window.ethereum || eoaBalances.eth === 0n) return;

		set({ isProcessing: true, status: "Wrapping ETH to WETH (EOA)..." });

		try {
			const walletClient = createWalletClient({
				chain: chainConfig,
				transport: custom(window.ethereum),
			});

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
			});

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await client.waitForTransactionReceipt({ hash });
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

	wrapEthFromSmartAccount: async () => {
		const { smartBalances, wrapSmartEthAmount } = get();
		if (!smartBalances.eth || smartBalances.eth === 0n) return;

		set({
			isProcessing: true,
			status: "Wrapping ETH to WETH (gasless)...",
		});

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = parseEther(wrapSmartEthAmount);
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

			await sendGasless(
				{
					target: wethToken.address as Address,
					data: depositCalldata,
					value: amount,
				},
				config,
			);

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

	unwrapWethFromEoa: async () => {
		const {
			ownerAddress,
			eoaBalances,
			unwrapEoaWethAmount,
			chain: chainConfig,
			publicClient: client,
		} = get();
		if (!ownerAddress || !window.ethereum || eoaBalances.weth === 0n) return;

		set({ isProcessing: true, status: "Unwrapping WETH to ETH (EOA)..." });

		try {
			const walletClient = createWalletClient({
				chain: chainConfig,
				transport: custom(window.ethereum),
			});

			const amount = parseEther(unwrapEoaWethAmount);
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
			});

			set({ status: `Tx sent: ${hash.slice(0, 10)}...` });
			await client.waitForTransactionReceipt({ hash });
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

	unwrapWethFromSmartAccount: async () => {
		const { smartBalances, unwrapSmartWethAmount } = get();
		if (!smartBalances.weth || smartBalances.weth === 0n) return;

		set({
			isProcessing: true,
			status: "Unwrapping WETH to ETH (gasless)...",
		});

		try {
			const config = getDefaultConfig();
			if (!config.policyId) throw new Error("Missing policy ID");

			const amount = parseEther(unwrapSmartWethAmount);
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

			await sendGasless(
				{
					target: wethToken.address as Address,
					data: withdrawCalldata,
					value: 0n,
				},
				config,
			);

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

	// Setters for input amounts
	setFundEthAmount: (amount: string) => set({ fundEthAmount: amount }),
	setFundWethAmount: (amount: string) => set({ fundWethAmount: amount }),
	setWithdrawEthAmount: (amount: string) => set({ withdrawEthAmount: amount }),
	setWithdrawWethAmount: (amount: string) =>
		set({ withdrawWethAmount: amount }),
	setWithdrawUsdtAmount: (amount: string) =>
		set({ withdrawUsdtAmount: amount }),
	setWrapEoaEthAmount: (amount: string) => set({ wrapEoaEthAmount: amount }),
	setWrapSmartEthAmount: (amount: string) =>
		set({ wrapSmartEthAmount: amount }),
	setUnwrapEoaWethAmount: (amount: string) =>
		set({ unwrapEoaWethAmount: amount }),
	setUnwrapSmartWethAmount: (amount: string) =>
		set({ unwrapSmartWethAmount: amount }),
}));
