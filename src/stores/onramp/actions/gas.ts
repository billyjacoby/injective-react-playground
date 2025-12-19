import { gasCalculator } from "../../../lib/services/gasCalculator";
import { OnrampActions, OnrampStoreApi } from "../types";

export function createGasActions({
	set,
	get,
}: OnrampStoreApi): Pick<OnrampActions, "setGasSpeed" | "refreshGasPrices"> {
	return {
		setGasSpeed: async (speed) => {
			console.log(`[OnrampStore] Setting gas speed to: ${speed}`);
			set({ gasSpeed: speed });

			try {
				const [gasEstimate, gasPricesBySpeed] = await Promise.all([
					gasCalculator.calculateGasReserve(speed),
					gasCalculator.getGasPricesBySpeed(),
				]);
				set({ gasEstimate, gasPricesBySpeed });

				// Refresh quote with new gas speed if we have an amount
				const { usdAmount } = get();
				if (usdAmount > 0) {
					await get().fetchQuote(usdAmount, speed);
				}
			} catch (error) {
				console.error("Failed to update gas estimates:", error);
			}
		},

		refreshGasPrices: async () => {
			try {
				console.log("[OnrampStore] Refreshing gas prices...");
				const { gasSpeed } = get();
				const [gasPricesBySpeed, gasEstimate] = await Promise.all([
					gasCalculator.getGasPricesBySpeed(),
					gasCalculator.calculateGasReserve(gasSpeed),
				]);
				set({ gasPricesBySpeed, gasEstimate });
			} catch (error) {
				console.error("Failed to refresh gas prices:", error);
			}
		},
	};
}
