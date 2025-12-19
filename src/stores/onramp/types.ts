import type {
	OnrampStepType,
	TransactionHashes,
} from "../../context/onrampContext";
import type {
	GasEstimate,
	GasPricesBySpeed,
	GasSpeedType,
} from "../../lib/services/gasCalculator";
import type { PriceQuote } from "../../lib/services/priceService";
import type { EvmTx } from "../../lib/services/walletService";

// Wallet configuration passed to actions that need it
export type WalletConfig = {
	// EVM address (from Rabby wallet)
	address: string;
	// Injective address (derived from EVM address)
	injectiveAddress: string;
	// Function to send a transaction via the wallet
	sendTransaction: (tx: EvmTx) => Promise<string>;
};

// Onramp state
export type OnrampState = {
	// Current step
	currentStep: OnrampStepType;

	// Input values
	usdAmount: number;

	// Calculated values
	quote: PriceQuote | null;
	gasEstimate: GasEstimate | null;
	gasPricesBySpeed: GasPricesBySpeed | null;

	// Gas speed selection
	gasSpeed: GasSpeedType;

	// Balances
	ethBalance: string;
	wethBalance: string;

	// Transaction tracking
	transactions: TransactionHashes;
	bridgedAmount: string | null; // Actual wETH amount being bridged

	// Wallet configuration
	walletConfig: WalletConfig | undefined;

	// Error handling
	error: string | null;

	// Loading states
	isLoading: boolean;
	isQuoteLoading: boolean;
};

// Store actions
export type OnrampActions = {
	// Step transitions
	setStep: (step: OnrampStepType) => void;

	// Input actions
	setUsdAmount: (amount: number) => void;

	// Gas speed actions
	setGasSpeed: (speed: GasSpeedType) => Promise<void>;
	refreshGasPrices: () => Promise<void>;

	// Quote actions
	fetchQuote: (amount: number, speed?: GasSpeedType) => Promise<void>;

	// Balance actions
	refreshBalances: () => Promise<void>;

	// Wallet config actions
	setWalletConfig: (config: WalletConfig | undefined) => void;

	// Flow actions
	startOnramp: () => void;
	executeWrap: (targetAmount?: string) => Promise<string>;
	executeApprove: () => Promise<string>;
	executeBridge: (targetAmount?: string) => Promise<string>;

	// Auto-execute the full flow after ETH is detected
	executeFullFlow: () => Promise<void>;

	// Skip Moonpay and use existing ETH balance
	useExistingEth: () => Promise<void>;

	// Skip Moonpay and wrap, use existing wETH balance
	useExistingWeth: () => Promise<void>;

	// Reset
	reset: () => void;

	// Error handling
	setError: (error: string | null) => void;
};

export type OnrampStore = OnrampState & OnrampActions;

export type OnrampStoreApi = {
	set: (
		partial:
			| Partial<OnrampState>
			| ((state: OnrampState) => Partial<OnrampState>),
	) => void;
	get: () => OnrampState & OnrampActions;
};
