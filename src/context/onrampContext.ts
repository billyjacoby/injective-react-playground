// Onramp flow states
export const OnrampStep = {
	IDLE: "idle",
	BUYING_ETH: "buying_eth",
	WAITING_FOR_ETH: "waiting_for_eth",
	WRAPPING_ETH: "wrapping_eth",
	APPROVING_WETH: "approving_weth",
	BRIDGING: "bridging",
	COMPLETE: "complete",
	ERROR: "error",
} as const;

export type OnrampStepType = (typeof OnrampStep)[keyof typeof OnrampStep];

// Step metadata for UI
export type StepInfo = {
	id: OnrampStepType;
	label: string;
	description: string;
	order: number;
};

export const STEP_INFO: Record<OnrampStepType, StepInfo> = {
	[OnrampStep.IDLE]: {
		id: OnrampStep.IDLE,
		label: "Start",
		description: "Enter amount to onramp",
		order: 0,
	},
	[OnrampStep.BUYING_ETH]: {
		id: OnrampStep.BUYING_ETH,
		label: "Purchase ETH",
		description: "Complete purchase via Moonpay",
		order: 1,
	},
	[OnrampStep.WAITING_FOR_ETH]: {
		id: OnrampStep.WAITING_FOR_ETH,
		label: "Receiving ETH",
		description: "Waiting for ETH to arrive in wallet",
		order: 2,
	},
	[OnrampStep.WRAPPING_ETH]: {
		id: OnrampStep.WRAPPING_ETH,
		label: "Wrap ETH",
		description: "Converting ETH to wETH",
		order: 3,
	},
	[OnrampStep.APPROVING_WETH]: {
		id: OnrampStep.APPROVING_WETH,
		label: "Approve wETH",
		description: "Approving wETH for bridge",
		order: 4,
	},
	[OnrampStep.BRIDGING]: {
		id: OnrampStep.BRIDGING,
		label: "Bridge",
		description: "Bridging wETH to Injective",
		order: 5,
	},
	[OnrampStep.COMPLETE]: {
		id: OnrampStep.COMPLETE,
		label: "Complete",
		description: "wETH received on Injective",
		order: 6,
	},
	[OnrampStep.ERROR]: {
		id: OnrampStep.ERROR,
		label: "Error",
		description: "An error occurred",
		order: -1,
	},
};

// Transaction hashes for each step
export type TransactionHashes = {
	wrapTx?: string;
	approveTx?: string;
	bridgeTx?: string;
};
