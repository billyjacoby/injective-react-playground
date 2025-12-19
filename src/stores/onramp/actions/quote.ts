import { gasCalculator } from "../../../lib/services/gasCalculator";
import { priceService } from "../../../lib/services/priceService";
import { OnrampActions, OnrampStoreApi } from "../types";

export function createQuoteActions({
	set,
	get,
}: OnrampStoreApi): Pick<OnrampActions, "fetchQuote"> {
	return {
		fetchQuote: async (amount, speed) => {
			const gasSpeedToUse = speed ?? get().gasSpeed;
			set({ isQuoteLoading: true });

			try {
				const [quote, gasEstimate, gasPricesBySpeed] = await Promise.all([
					priceService.getOnrampQuote(amount, gasSpeedToUse),
					gasCalculator.calculateGasReserve(gasSpeedToUse),
					gasCalculator.getGasPricesBySpeed(),
				]);
				set({
					quote,
					gasEstimate,
					gasPricesBySpeed,
					isQuoteLoading: false,
				});
			} catch (error) {
				console.error("Failed to fetch quote:", error);
				set({
					isQuoteLoading: false,
					error: "Failed to fetch price quote",
				});
			}
		},
	};
}
