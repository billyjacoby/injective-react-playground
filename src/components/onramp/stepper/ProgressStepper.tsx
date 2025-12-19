import React from "react";
import {
	OnrampStep,
	OnrampStepType,
	STEP_INFO,
} from "../../../context/onrampContext";
import { useOnrampStore } from "../../../stores/onramp";
import { StepConnector } from "./StepConnector";
import { StepIcon } from "./StepIcon";
import { TransactionLink } from "./TransactionLink";

// Visual steps to show (excluding IDLE and ERROR)
const VISIBLE_STEPS: OnrampStepType[] = [
	OnrampStep.BUYING_ETH,
	OnrampStep.WAITING_FOR_ETH,
	OnrampStep.WRAPPING_ETH,
	OnrampStep.APPROVING_WETH,
	OnrampStep.BRIDGING,
	OnrampStep.COMPLETE,
];

type StepStatus = "completed" | "current" | "pending" | "error";

function getStepStatus(
	step: OnrampStepType,
	currentStep: OnrampStepType,
): StepStatus {
	if (currentStep === OnrampStep.ERROR) {
		// Find the step that failed (the one we were on before error)
		return "error";
	}

	const currentOrder = STEP_INFO[currentStep]?.order ?? 0;
	const stepOrder = STEP_INFO[step]?.order ?? 0;

	if (stepOrder < currentOrder) return "completed";
	if (stepOrder === currentOrder) return "current";
	return "pending";
}

export function ProgressStepper() {
	const currentStep = useOnrampStore((state) => state.currentStep);
	const error = useOnrampStore((state) => state.error);
	const transactions = useOnrampStore((state) => state.transactions);

	// Don't show stepper in idle state
	if (currentStep === OnrampStep.IDLE) {
		return null;
	}

	return (
		<div className="w-full py-6">
			{/* Step indicators */}
			<div className="flex items-center justify-between mb-4">
				{VISIBLE_STEPS.map((step, index) => {
					const status = getStepStatus(step, currentStep);

					return (
						<React.Fragment key={step}>
							<div className="flex flex-col items-center">
								<StepIcon status={status} stepNumber={index + 1} />
							</div>
							{index < VISIBLE_STEPS.length - 1 && (
								<StepConnector status={status} />
							)}
						</React.Fragment>
					);
				})}
			</div>

			{/* Current step label */}
			<div className="text-center">
				<h3 className="text-lg font-semibold text-white">
					{STEP_INFO[currentStep]?.label}
				</h3>
				<p className="text-sm text-gray-400 mt-1">
					{STEP_INFO[currentStep]?.description}
				</p>
			</div>

			{/* Error message */}
			{error && (
				<div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
					<p className="text-sm text-red-400">{error}</p>
				</div>
			)}

			{/* Transaction hashes */}
			{(transactions.wrapTx ||
				transactions.approveTx ||
				transactions.bridgeTx) && (
				<div className="mt-4 space-y-2">
					<p className="text-xs text-gray-500 uppercase tracking-wider">
						Transactions
					</p>
					{transactions.wrapTx && (
						<TransactionLink label="Wrap" hash={transactions.wrapTx} />
					)}
					{transactions.approveTx &&
						transactions.approveTx !== "already-approved" && (
							<TransactionLink label="Approve" hash={transactions.approveTx} />
						)}
					{transactions.bridgeTx && (
						<TransactionLink label="Bridge" hash={transactions.bridgeTx} />
					)}
				</div>
			)}
		</div>
	);
}

export default ProgressStepper;
