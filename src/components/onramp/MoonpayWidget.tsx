import { MoonPayBuyWidget } from "@moonpay/moonpay-react";
import React from "react";
import { OnrampStep } from "../../context/onrampContext";
import { useOnrampStore } from "../../stores/onramp";

type MoonpayWidgetProps = {
	walletAddress: string | undefined;
};

export function MoonpayWidget({ walletAddress }: MoonpayWidgetProps) {
	const currentStep = useOnrampStore((state) => state.currentStep);
	const usdAmount = useOnrampStore((state) => state.usdAmount);
	const setStep = useOnrampStore((state) => state.setStep);
	const refreshBalances = useOnrampStore((state) => state.refreshBalances);
	const executeFullFlow = useOnrampStore((state) => state.executeFullFlow);

	const [isPolling, setIsPolling] = React.useState(false);
	const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

	// Determine if widget should be visible
	const isVisible = currentStep === OnrampStep.BUYING_ETH;

	// Handle Moonpay widget events
	const handleOnLogin = React.useCallback(async () => {
		console.log("Moonpay: User logged in");
	}, []);

	const handleOnInitiateDeposit = React.useCallback(async () => {
		console.log("Moonpay: Deposit initiated");
		// Start polling for ETH balance
		setStep(OnrampStep.WAITING_FOR_ETH);
		setIsPolling(true);
		// Return required properties as expected by Moonpay API
		return {
			depositId: `deposit-${Date.now()}`,
			cancelTransactionOnError: false,
		};
	}, [setStep]);

	const handleOnTransactionCreated = React.useCallback(
		async (transaction: { id: string; status: string }) => {
			console.log("Moonpay: Transaction created", transaction);
		},
		[],
	);

	const handleOnTransactionCompleted = React.useCallback(
		async (transaction: { id: string; status: string }) => {
			console.log("Moonpay: Transaction completed", transaction);
			// Moonpay purchase complete - ETH should arrive soon
			// Continue polling until balance increases
		},
		[],
	);

	// Poll for balance changes
	React.useEffect(() => {
		if (!isPolling || !walletAddress) return;

		const pollForBalance = async () => {
			try {
				await refreshBalances();
			} catch (error) {
				console.error("Error polling balance:", error);
			}
		};

		// Initial balance check
		pollForBalance();

		// Set up polling interval (every 5 seconds)
		pollIntervalRef.current = setInterval(pollForBalance, 5000);

		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
		};
	}, [isPolling, walletAddress, refreshBalances]);

	// Handle close/dismiss of widget
	const handleOnClose = React.useCallback(() => {
		console.log("Moonpay: Widget closed");
		// If user closed without completing, return to idle
		if (currentStep === OnrampStep.BUYING_ETH) {
			setStep(OnrampStep.IDLE);
		}
	}, [currentStep, setStep]);

	return (
		<>
			{/* Moonpay Widget */}
			<MoonPayBuyWidget
				variant="embedded"
				baseCurrencyCode="usd"
				baseCurrencyAmount={usdAmount.toString()}
				defaultCurrencyCode="eth"
				paymentMethod="credit_debit_card"
				walletAddress={walletAddress}
				visible={isVisible}
				onLogin={handleOnLogin}
				onInitiateDeposit={handleOnInitiateDeposit}
				onTransactionCreated={handleOnTransactionCreated}
				onTransactionCompleted={handleOnTransactionCompleted}
				onCloseOverlay={handleOnClose}
			/>

			{/* Waiting for ETH indicator */}
			{currentStep === OnrampStep.WAITING_FOR_ETH && (
				<WaitingForEthCard
					onManualTrigger={() => {
						setIsPolling(false);
						executeFullFlow();
					}}
				/>
			)}
		</>
	);
}

function WaitingForEthCard({
	onManualTrigger,
}: {
	onManualTrigger: () => void;
}) {
	const ethBalance = useOnrampStore((state) => state.ethBalance);
	const [initialBalance] = React.useState(ethBalance);
	const hasNewEth = parseFloat(ethBalance) > parseFloat(initialBalance);

	return (
		<div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
			<div className="flex items-center gap-4 mb-4">
				<div className="relative">
					<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
						<svg
							aria-label="ETH icon"
							role="img"
							className="w-6 h-6 text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping" />
				</div>
				<div>
					<h3 className="text-lg font-semibold text-white">Waiting for ETH</h3>
					<p className="text-sm text-gray-400">
						Your ETH will arrive shortly after Moonpay confirms your purchase.
					</p>
				</div>
			</div>

			<div className="bg-gray-900/50 rounded-lg p-4 mb-4">
				<div className="flex justify-between items-center">
					<span className="text-gray-400">Current ETH Balance</span>
					<span className="text-white font-mono">
						{parseFloat(ethBalance).toFixed(6)} ETH
					</span>
				</div>
				{hasNewEth && (
					<div className="mt-2 text-emerald-400 text-sm">
						✓ New ETH detected!
					</div>
				)}
			</div>

			{hasNewEth ? (
				<button
					type="button"
					onClick={onManualTrigger}
					className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
				>
					Continue to Wrap & Bridge
				</button>
			) : (
				<div className="space-y-3">
					<div className="flex items-center justify-center gap-2 text-gray-400">
						<div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
						<span className="text-sm">Checking for incoming ETH...</span>
					</div>
					<button
						type="button"
						onClick={onManualTrigger}
						className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-all text-sm"
					>
						I already have ETH - Continue manually
					</button>
				</div>
			)}
		</div>
	);
}

export default MoonpayWidget;
