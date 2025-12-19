import { BigNumberInBase } from "@injectivelabs/utils";
import { createPublicClient, formatEther, http, parseGwei } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { getAlchemyUrl, IS_MAINNET, NETWORK } from "../../constants/setup";

// Gas speed options
export const GasSpeed = {
	SLOW: "slow",
	NORMAL: "normal",
	FAST: "fast",
} as const;

export type GasSpeedType = (typeof GasSpeed)[keyof typeof GasSpeed];

// Gas speed configuration
export type GasSpeedConfig = {
	id: GasSpeedType;
	label: string;
	description: string;
	estimatedTime: string;
	baseFeeMultiplier: number; // Multiplier for base fee (affects total cost significantly)
	priorityFeeMultiplier: number; // Multiplier for maxPriorityFeePerGas (affects priority)
};

export const GAS_SPEED_CONFIG: Record<GasSpeedType, GasSpeedConfig> = {
	[GasSpeed.SLOW]: {
		id: GasSpeed.SLOW,
		label: "Slow",
		description: "Lower fee, longer wait",
		estimatedTime: "~5-10 min",
		baseFeeMultiplier: 1.0, // Use 1x base fee - may wait for lower gas
		priorityFeeMultiplier: 0.5,
	},
	[GasSpeed.NORMAL]: {
		id: GasSpeed.NORMAL,
		label: "Normal",
		description: "Standard fee",
		estimatedTime: "~1-3 min",
		baseFeeMultiplier: 1.5, // Standard 1.5x base fee buffer
		priorityFeeMultiplier: 1.0,
	},
	[GasSpeed.FAST]: {
		id: GasSpeed.FAST,
		label: "Fast",
		description: "Higher fee, faster",
		estimatedTime: "~15-30 sec",
		baseFeeMultiplier: 2.0, // Higher buffer ensures quick inclusion
		priorityFeeMultiplier: 2.0,
	},
};

// Gas limits for each transaction type (with buffer)
export const GAS_LIMITS = {
	// WETH deposit is simple, around 45k gas
	WRAP_ETH: 60000n,
	// ERC20 approve is around 45k gas
	APPROVE_WETH: 60000n,
	// Peggy sendToInjective is more complex, around 100k gas
	BRIDGE_TO_INJECTIVE: 150000n,
};

// Total gas needed for all transactions
export const TOTAL_GAS_LIMIT =
	GAS_LIMITS.WRAP_ETH +
	GAS_LIMITS.APPROVE_WETH +
	GAS_LIMITS.BRIDGE_TO_INJECTIVE;

export type GasEstimate = {
	wrapGas: bigint;
	approveGas: bigint;
	bridgeGas: bigint;
	totalGasLimit: bigint;
	gasPrice: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	totalGasCostWei: bigint;
	totalGasCostEth: string;
	ethToReserve: string;
	safeEthToReserve: string;
	gasSpeed: GasSpeedType;
};

export type GasPricesBySpeed = {
	[key in GasSpeedType]: {
		maxFeePerGas: bigint;
		maxPriorityFeePerGas: bigint;
		estimatedCostWei: bigint;
		estimatedCostEth: string;
	};
};

class GasCalculator {
	private publicClient;

	constructor() {
		this.publicClient = createPublicClient({
			chain: IS_MAINNET ? mainnet : sepolia,
			transport: http(getAlchemyUrl(NETWORK)),
		});
	}

	/**
	 * Get current base gas prices from the network
	 */
	async getBaseGasPrices(): Promise<{
		gasPrice: bigint;
		baseFee: bigint;
		maxPriorityFeePerGas: bigint;
	}> {
		try {
			const [gasPrice, feeData] = await Promise.all([
				this.publicClient.getGasPrice(),
				this.publicClient.estimateFeesPerGas(),
			]);

			// Extract base fee from maxFeePerGas - maxPriorityFeePerGas
			const priorityFee = feeData.maxPriorityFeePerGas ?? parseGwei("2");
			const maxFee = feeData.maxFeePerGas ?? gasPrice;
			const baseFee = maxFee - priorityFee;

			return {
				gasPrice,
				baseFee: baseFee > 0n ? baseFee : parseGwei("20"),
				maxPriorityFeePerGas: priorityFee,
			};
		} catch (error) {
			console.error("Failed to get gas prices:", error);
			return {
				gasPrice: parseGwei("30"),
				baseFee: parseGwei("20"),
				maxPriorityFeePerGas: parseGwei("2"),
			};
		}
	}

	/**
	 * Get gas prices for all speed options
	 */
	async getGasPricesBySpeed(): Promise<GasPricesBySpeed> {
		const { baseFee, maxPriorityFeePerGas } = await this.getBaseGasPrices();

		console.log("[GasCalculator] Base gas prices:", {
			baseFee: `${Number(baseFee) / 1e9} gwei`,
			maxPriorityFeePerGas: `${Number(maxPriorityFeePerGas) / 1e9} gwei`,
		});

		const result: GasPricesBySpeed = {} as GasPricesBySpeed;

		for (const speed of Object.values(GasSpeed)) {
			const config = GAS_SPEED_CONFIG[speed];

			// Apply base fee multiplier for different speeds
			const adjustedBaseFee = BigInt(
				Math.floor(Number(baseFee) * config.baseFeeMultiplier),
			);

			// Apply priority fee multiplier
			const adjustedPriorityFee = BigInt(
				Math.floor(Number(maxPriorityFeePerGas) * config.priorityFeeMultiplier),
			);

			// maxFeePerGas = adjustedBaseFee + priorityFee
			const maxFeePerGas = adjustedBaseFee + adjustedPriorityFee;

			const estimatedCostWei = TOTAL_GAS_LIMIT * maxFeePerGas;

			console.log(`[GasCalculator] ${speed}:`, {
				baseFeeMultiplier: config.baseFeeMultiplier,
				priorityFeeMultiplier: config.priorityFeeMultiplier,
				maxFeePerGas: `${Number(maxFeePerGas) / 1e9} gwei`,
				estimatedCostEth: formatEther(estimatedCostWei),
			});

			result[speed] = {
				maxFeePerGas,
				maxPriorityFeePerGas: adjustedPriorityFee,
				estimatedCostWei,
				estimatedCostEth: formatEther(estimatedCostWei),
			};
		}

		return result;
	}

	/**
	 * Get gas prices for a specific speed
	 */
	async getGasPricesForSpeed(speed: GasSpeedType): Promise<{
		maxFeePerGas: bigint;
		maxPriorityFeePerGas: bigint;
	}> {
		const prices = await this.getGasPricesBySpeed();
		return {
			maxFeePerGas: prices[speed].maxFeePerGas,
			maxPriorityFeePerGas: prices[speed].maxPriorityFeePerGas,
		};
	}

	/**
	 * Calculate the total gas cost for all onramp transactions
	 */
	async calculateGasReserve(
		speed: GasSpeedType = GasSpeed.NORMAL,
	): Promise<GasEstimate> {
		const {
			gasPrice,
			baseFee,
			maxPriorityFeePerGas: basePriorityFee,
		} = await this.getBaseGasPrices();

		const config = GAS_SPEED_CONFIG[speed];

		// Apply multipliers based on speed
		const adjustedBaseFee = BigInt(
			Math.floor(Number(baseFee) * config.baseFeeMultiplier),
		);
		const adjustedPriorityFee = BigInt(
			Math.floor(Number(basePriorityFee) * config.priorityFeeMultiplier),
		);
		const maxFeePerGas = adjustedBaseFee + adjustedPriorityFee;

		// Calculate gas cost for each transaction
		const wrapGas = GAS_LIMITS.WRAP_ETH * maxFeePerGas;
		const approveGas = GAS_LIMITS.APPROVE_WETH * maxFeePerGas;
		const bridgeGas = GAS_LIMITS.BRIDGE_TO_INJECTIVE * maxFeePerGas;

		const totalGasCostWei = wrapGas + approveGas + bridgeGas;
		const totalGasCostEth = formatEther(totalGasCostWei);

		// Add 20% buffer for safety
		const safeGasCostWei = (totalGasCostWei * 120n) / 100n;
		const safeEthToReserve = formatEther(safeGasCostWei);

		console.log(`[GasCalculator] Reserve for ${speed}:`, {
			maxFeePerGas: `${Number(maxFeePerGas) / 1e9} gwei`,
			totalGasCostEth,
			safeEthToReserve,
		});

		return {
			wrapGas,
			approveGas,
			bridgeGas,
			totalGasLimit: TOTAL_GAS_LIMIT,
			gasPrice,
			maxFeePerGas,
			maxPriorityFeePerGas: adjustedPriorityFee,
			totalGasCostWei,
			totalGasCostEth,
			ethToReserve: totalGasCostEth,
			safeEthToReserve,
			gasSpeed: speed,
		};
	}

	/**
	 * Calculate how much ETH to wrap (total ETH minus gas reserve)
	 */
	async calculateWrapAmount(
		totalEthBalance: string,
		speed: GasSpeedType = GasSpeed.NORMAL,
	): Promise<{
		amountToWrap: string;
		gasReserve: string;
		isValid: boolean;
		error?: string;
	}> {
		const gasEstimate = await this.calculateGasReserve(speed);

		const totalEth = new BigNumberInBase(totalEthBalance);
		const gasReserve = new BigNumberInBase(gasEstimate.safeEthToReserve);

		if (totalEth.lte(gasReserve)) {
			return {
				amountToWrap: "0",
				gasReserve: gasEstimate.safeEthToReserve,
				isValid: false,
				error: `Insufficient ETH. You need at least ${gasEstimate.safeEthToReserve} ETH for gas fees.`,
			};
		}

		const amountToWrap = totalEth.minus(gasReserve);

		return {
			amountToWrap: amountToWrap.toFixed(18),
			gasReserve: gasEstimate.safeEthToReserve,
			isValid: true,
		};
	}

	/**
	 * Format gas cost for display
	 */
	formatGasCost(weiAmount: bigint): string {
		const ethAmount = formatEther(weiAmount);
		return `${parseFloat(ethAmount).toFixed(6)} ETH`;
	}

	/**
	 * Format gas price in gwei for display
	 */
	formatGwei(weiAmount: bigint): string {
		const gweiAmount = Number(weiAmount) / 1e9;
		return `${gweiAmount.toFixed(2)} gwei`;
	}

	/**
	 * Get gas estimate breakdown for UI display
	 */
	async getGasBreakdown(speed: GasSpeedType = GasSpeed.NORMAL): Promise<{
		wrap: string;
		approve: string;
		bridge: string;
		total: string;
		totalWithBuffer: string;
		maxFeePerGas: string;
		priorityFee: string;
	}> {
		const estimate = await this.calculateGasReserve(speed);

		return {
			wrap: this.formatGasCost(estimate.wrapGas),
			approve: this.formatGasCost(estimate.approveGas),
			bridge: this.formatGasCost(estimate.bridgeGas),
			total: `${parseFloat(estimate.totalGasCostEth).toFixed(6)} ETH`,
			totalWithBuffer: `${parseFloat(estimate.safeEthToReserve).toFixed(6)} ETH`,
			maxFeePerGas: this.formatGwei(estimate.maxFeePerGas),
			priorityFee: this.formatGwei(estimate.maxPriorityFeePerGas),
		};
	}
}

export const gasCalculator = new GasCalculator();
