import { InjectiveDerivativeExchangeRpcPb } from "@injectivelabs/grpc-web-indexer";
import {
	DerivativeMarket,
	IndexerGrpcDerivativeTransformer,
} from "@injectivelabs/sdk-ts";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, eq, useLiveQuery } from "@tanstack/react-db";
import { injectiveClients } from "../injective-clients";
import { queryClient } from "../lib/query-client";
import { useStream } from "./useStream";

type DerivativeMarketWithPriceInfo = DerivativeMarket & {
	updatedAt: Date;
};

export const derivativeMarketCollection = createCollection(
	queryCollectionOptions({
		queryKey: ["derivative-markets"],
		queryFn: async () => {
			const markets =
				await injectiveClients.indexerGrpcDerivativesApi.fetchMarkets();

			return markets.map<DerivativeMarketWithPriceInfo>((market) => ({
				...market,
				updatedAt: new Date(),
			}));
		},
		queryClient,
		getKey: (data) => data.marketId,
	}),
);

export function useDerivativeMarketStream() {
	return useStream({
		streamFn: (req, opts) =>
			injectiveClients.derivativeExchangeRPCClient.streamMarket(req, opts),
		request: InjectiveDerivativeExchangeRpcPb.StreamMarketRequest.create(),
		onData: (response) => {
			console.log("📈 | New market update received:", {
				...response,
				timestamp: new Date().toISOString(),
			});
			if (!response.market) {
				return console.warn("⚠️  | No market found in response");
			}
			if (!derivativeMarketCollection.isReady()) {
				derivativeMarketCollection.startSyncImmediate();
				return console.warn(
					"⚠️  | Derivative market collection is not initialized",
				);
			}
			switch (response.operationType) {
				case "update": {
					const transformedMarket =
						IndexerGrpcDerivativeTransformer.grpcMarketToMarket({
							// TODO: fix this transformer
							...(response.market as any),
						});
					derivativeMarketCollection.utils.writeUpsert({
						...transformedMarket,
						updatedAt: new Date(),
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

export const useDerivativeMarketTickers = () => {
	return useLiveQuery((q) =>
		q
			.from({ derivativeMarkets: derivativeMarketCollection })
			.where(({ derivativeMarkets }) =>
				eq(derivativeMarkets.marketStatus, "active"),
			)
			.select(({ derivativeMarkets }) => ({
				ticker: derivativeMarkets.ticker,
				updatedAt: derivativeMarkets.updatedAt,
			}))
			.orderBy(({ derivativeMarkets }) => derivativeMarkets.updatedAt, "desc"),
	);
};

export function useDerivativeMarket(tickerOrId: string) {
	return useLiveQuery((q) =>
		q
			.from({ derivativeMarkets: derivativeMarketCollection })
			.where(
				({ derivativeMarkets }) =>
					eq(derivativeMarkets.ticker, tickerOrId) ||
					eq(derivativeMarkets.marketId, tickerOrId),
			)
			.findOne(),
	);
}

export function useActiveDerivativeMarketIds() {
	return useLiveQuery((q) =>
		q
			.from({ derivativeMarkets: derivativeMarketCollection })
			.where(({ derivativeMarkets }) =>
				eq(derivativeMarkets.marketStatus, "active"),
			)
			.select(({ derivativeMarkets }) => ({
				marketId: derivativeMarkets.marketId,
			})),
	);
}

export function refetchDerivativeMarkets() {
	return derivativeMarketCollection.utils.refetch();
}
