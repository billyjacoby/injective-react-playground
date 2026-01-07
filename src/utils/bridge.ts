import { formatUnits } from "viem";

/**
 * Format bridge amount with token symbol
 */
export function formatBridgeAmount(
	amount: string,
	decimals: number,
	symbol: string,
): string {
	const formatted = formatUnits(BigInt(amount), decimals);
	return `${formatted} ${symbol}`;
}

/**
 * Format time remaining as MM:SS
 */
export function formatTimeRemaining(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}
