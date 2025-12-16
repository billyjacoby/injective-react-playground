import { useDerivativeMarket } from "../hooks/useDerivativeMarkets";
import { useDerivativeMarketSummary } from "../hooks/useDerivativeMarketsSummary";

export function DerivativeMarket({ ticker }: { ticker: string }) {
	const { data: market } = useDerivativeMarket(ticker);
	const { data: marketSummary } = useDerivativeMarketSummary(market?.marketId);

	if (!market) {
		console.warn("🪵 | DerivativeMarket | market not found:", ticker);
		return null;
	}

	return (
		<li key={market.ticker}>
			{market.ticker} - {marketSummary?.price} -{" "}
			{market.updatedAt?.toLocaleString()}
		</li>
	);
}
