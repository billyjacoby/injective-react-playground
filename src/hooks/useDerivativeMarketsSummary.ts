import { InjectiveDerivativeExchangeRpcPb } from "@injectivelabs/grpc-web-indexer";
import {
	AllChronosDerivativeMarketSummary,
	derivativePriceFromChainPrice,
} from "@injectivelabs/sdk-ts";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { injectiveClients } from "../injective-clients";
import { queryClient } from "../lib/query-client";
import {
	derivativeMarketCollection,
	useActiveDerivativeMarketIds,
} from "./useDerivativeMarkets";
import { useStream } from "./useStream";

type DerivativeMarketSummary = AllChronosDerivativeMarketSummary & {
	updatedAt: Date;
};

export const derivativeMarketSummaryCollection = createCollection(
	queryCollectionOptions({
		queryKey: ["derivative-markets-summary"],
		queryFn: async () => {
			const markets =
				await injectiveClients.indexerRestDerivativesChronosApi.fetchMarketsSummary();

			return markets.map<DerivativeMarketSummary>((market) => ({
				...market,
				updatedAt: new Date(),
			}));
		},
		queryClient,
		getKey: (data) => data.marketId,
	}),
);

export function useDerivativeTradeStream() {
	const { data: activeDerivativeMarketIds } = useActiveDerivativeMarketIds();

	const activeIds = useMemo(() => {
		return activeDerivativeMarketIds?.map((id) => id.marketId) || [];
	}, [activeDerivativeMarketIds]);

	return useStream({
		streamFn: (req, opts) => {
			return injectiveClients.derivativeExchangeRPCClient.streamTradesV2(
				req,
				opts,
			);
		},
		request: InjectiveDerivativeExchangeRpcPb.StreamTradesRequest.create({
			marketIds: activeIds,
		}),
		onData: (response) => {
			console.log("📈 | New Trade received:", {
				...response,
				timestamp: new Date().toISOString(),
			});
			if (!response.trade || !response.trade.positionDelta?.executionPrice) {
				return console.warn("⚠️  | No trade found in response");
			}
			if (!derivativeMarketSummaryCollection.isReady()) {
				derivativeMarketSummaryCollection.startSyncImmediate();
				return console.warn(
					"⚠️  | Derivative market summary collection is not initialized",
				);
			}
			switch (response.operationType) {
				case "insert":
				case "update": {
					const market = derivativeMarketCollection.get(
						response.trade.marketId,
					);
					const formattedPrice = derivativePriceFromChainPrice({
						value: response.trade.positionDelta?.executionPrice,
						quoteDecimals: market?.quoteToken?.decimals,
					}).toNumber();

					derivativeMarketSummaryCollection.utils.writeUpdate({
						marketId: response.trade.marketId,
						updatedAt: new Date(),
						price: formattedPrice,
					});
					derivativeMarketCollection.utils.writeUpdate({
						updatedAt: new Date(),
						marketId: response.trade.marketId,
					});
					break;
				}
				default:
					console.log("Unknown operation type:", response.operationType);
			}
		},
		onError: (error) => {
			console.error("❌ | Stream error:", error);
		},
		autoStart: false,
	});
}

export const useDerivativeMarketsSummary = () => {
	return useLiveQuery((q) =>
		q
			.from({ derivativeMarketsSummary: derivativeMarketSummaryCollection })
			.orderBy(
				({ derivativeMarketsSummary }) => derivativeMarketsSummary.updatedAt,
				"desc",
			),
	);
};

export function useDerivativeMarketSummary(marketId?: string) {
	return useLiveQuery((q) =>
		q
			.from({ derivativeMarketsSummary: derivativeMarketSummaryCollection })
			.where(({ derivativeMarketsSummary }) =>
				eq(derivativeMarketsSummary.marketId, marketId),
			)
			.select(({ derivativeMarketsSummary }) => ({
				price: derivativeMarketsSummary.price,
			}))
			.findOne(),
	);
}

export function refetchDerivativeMarketsSummary() {
	return derivativeMarketSummaryCollection.utils.refetch();
}
