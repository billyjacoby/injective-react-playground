import { OnrampStep } from "../../context/onrampContext";
import { useOnrampStore } from "../../stores/onramp";
import { MoonpayWidget } from "./MoonpayWidget";
import { OnrampForm } from "./OnrampForm";
import { CompletionCard } from "./status/CompletionCard";
import { ErrorCard } from "./status/ErrorCard";
import { ProgressStepper } from "./stepper/ProgressStepper";

type OnrampContentProps = {
	walletAddress: string;
};

export function OnrampContent({ walletAddress }: OnrampContentProps) {
	const currentStep = useOnrampStore((state) => state.currentStep);
	const reset = useOnrampStore((state) => state.reset);

	const isComplete = currentStep === OnrampStep.COMPLETE;
	const hasError = currentStep === OnrampStep.ERROR;
	const isBuyingOrWaiting =
		currentStep === OnrampStep.BUYING_ETH ||
		currentStep === OnrampStep.WAITING_FOR_ETH;

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
			<div className="max-w-2xl mx-auto px-4 py-12">
				{/* Header */}
				<div className="text-center mb-10">
					<h1 className="text-4xl font-bold text-white mb-3">
						<span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
							Onramp to Injective
						</span>
					</h1>
					<p className="text-gray-400">
						Purchase ETH with your card and bridge to Injective in one seamless
						flow
					</p>
				</div>

				{/* Main Card */}
				<div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
					{/* Progress Stepper */}
					<div className="px-6 pt-6">
						<ProgressStepper />
					</div>

					{/* Content */}
					<div className="p-6">
						{isComplete ? (
							<CompletionCard onReset={reset} />
						) : hasError ? (
							<ErrorCard onRetry={reset} />
						) : isBuyingOrWaiting ? (
							<MoonpayWidget walletAddress={walletAddress} />
						) : (
							<OnrampForm />
						)}
					</div>
				</div>

				{/* Footer info */}
				<div className="mt-8 text-center text-sm text-gray-500">
					<p>Powered by Moonpay • Peggy Bridge • Injective</p>
				</div>
			</div>
		</div>
	);
}
