// Helper to format wETH amount safely
export function formatWethAmount(amount: string): string {
	const num = parseFloat(amount);
	if (!Number.isFinite(num) || num <= 0) return "0.0000";
	return num.toFixed(4);
}

// Helper to format ETH amount safely
export function formatEthAmount(amount: string): string {
	const num = parseFloat(amount);
	if (!Number.isFinite(num) || num <= 0) return "0.0000";
	return num.toFixed(4);
}
