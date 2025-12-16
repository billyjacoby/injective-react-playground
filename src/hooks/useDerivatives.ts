import { InjectiveDerivativeExchangeRpcPb } from "@injectivelabs/grpc-web-indexer";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { injectiveClients } from "../injective-clients";
import { useStream } from "./useStream";

const useDerivativeMarketSummaryOptions = queryOptions({
	queryKey: ["derivative-markets-summary"],
	queryFn: async () => {
		const markets =
			await injectiveClients.indexerRestDerivativesChronosApi.fetchMarketsSummary();
		return markets;
	},
});

export const useDerivativeMarketsSummary = () => {
	return useQuery(useDerivativeMarketSummaryOptions);
};

const useDerivativeMarketOptions = queryOptions({
	queryKey: ["derivative-markets"],
	queryFn: async () => {
		const markets =
			await injectiveClients.indexerGrpcDerivativesApi.fetchMarkets();
		return markets;
	},
});

export const useDerivativeMarkets = () => {
	return useQuery(useDerivativeMarketOptions);
};

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
		},
		onError: (error) => {
			console.error("❌ | Stream error:", error);
		},
		autoStart: false,
	});
}
