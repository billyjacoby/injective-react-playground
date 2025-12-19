import type { Address } from "viem";
import { formatEther } from "viem";
import { create } from "zustand";
import { OnrampStep } from "../../context/onrampContext";
import { erc20WethContract } from "../../lib/contracts/Erc20WethContract";
import { GasSpeed } from "../../lib/services/gasCalculator";
import { createFlowActions } from "./actions/flow";
import { createGasActions } from "./actions/gas";
import { createQuoteActions } from "./actions/quote";
import { createTransactionActions } from "./actions/transactions";
import type { OnrampActions, OnrampState, OnrampStoreApi } from "./types";

const initialState: OnrampState = {
	currentStep: OnrampStep.IDLE,
	usdAmount: 100,
	quote: null,
	gasEstimate: null,
	gasPricesBySpeed: null,
	gasSpeed: GasSpeed.NORMAL,
	ethBalance: "0",
	wethBalance: "0",
	transactions: {},
	bridgedAmount: null,
	walletConfig: undefined,
	error: null,
	isLoading: false,
	isQuoteLoading: false,
};

function createStepActions({
	set,
}: Pick<OnrampStoreApi, "set">): Pick<OnrampActions, "setStep"> {
	return {
		setStep: (step) => {
			set({ currentStep: step, error: null });
		},
	};
}

function createInputActions({
	set,
}: Pick<OnrampStoreApi, "set">): Pick<OnrampActions, "setUsdAmount"> {
	return {
		setUsdAmount: (amount) => {
			set({ usdAmount: amount });
		},
	};
}

function createBalanceActions({
	set,
	get,
}: OnrampStoreApi): Pick<OnrampActions, "refreshBalances"> {
	return {
		refreshBalances: async () => {
			const { walletConfig } = get();
			if (!walletConfig?.address) return;

			try {
				const [ethBalanceWei, wethBalanceWei] = await Promise.all([
					erc20WethContract.getBalance(walletConfig.address as Address),
					erc20WethContract.getWethBalance(walletConfig.address as Address),
				]);

				set({
					ethBalance: formatEther(ethBalanceWei),
					wethBalance: formatEther(wethBalanceWei),
				});
			} catch (error) {
				console.error("Failed to refresh balances:", error);
			}
		},
	};
}

function createWalletConfigActions({
	set,
}: Pick<OnrampStoreApi, "set">): Pick<OnrampActions, "setWalletConfig"> {
	return {
		setWalletConfig: (config) => {
			set({ walletConfig: config });
		},
	};
}

function createUtilityActions({
	set,
}: Pick<OnrampStoreApi, "set">): Pick<OnrampActions, "reset" | "setError"> {
	return {
		reset: () => {
			set(initialState);
		},

		setError: (error) => {
			set({ error });
		},
	};
}

export const useOnrampStore = create<OnrampState & OnrampActions>(
	(set, get) => ({
		...initialState,
		...createStepActions({ set }),
		...createInputActions({ set }),
		...createBalanceActions({ set, get }),
		...createWalletConfigActions({ set }),
		...createUtilityActions({ set }),
		...createTransactionActions({ set, get }),
		...createFlowActions({ set, get }),
		...createGasActions({ set, get }),
		...createQuoteActions({ set, get }),
	}),
);
