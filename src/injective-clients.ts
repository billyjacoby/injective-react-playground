import { InjectiveDerivativeExchangeRPCClient } from "@injectivelabs/grpc-web-indexer";
import {
	getNetworkEndpoints,
	Network,
	type NetworkEndpoints,
} from "@injectivelabs/networks";
import {
	ChainGrpcAuthApi,
	ChainGrpcAuthZApi,
	ChainGrpcBankApi,
	ChainGrpcExchangeApi,
	ChainGrpcWasmApi,
	ChainRestAuthApi,
	IndexerGrpcAccountPortfolioApi,
	IndexerGrpcArchiverApi,
	IndexerGrpcDerivativesApi,
	IndexerGrpcExplorerApi,
	IndexerGrpcOracleApi,
	IndexerGrpcSpotApi,
	IndexerGrpcWeb3GwApi,
	IndexerRestDerivativesChronosApi,
	IndexerRestExplorerApi,
	IndexerRestMarketChronosApi,
	IndexerRestSpotChronosApi,
	TxGrpcApi,
} from "@injectivelabs/sdk-ts";
import { TokenFactory } from "@injectivelabs/token-metadata";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

export function getInjectiveClients(network: Network) {
	const endpoints = (() => {
		if (network === "mainnet") {
			const endpoints: NetworkEndpoints = {
				...getNetworkEndpoints(Network.Mainnet),
				cacheGrpc: "https://k8s.bm.mainnet.chain.grpc-web.injective.network",
				grpc: "https://k8s.bm.mainnet.chain.grpc-web.injective.network",
				rest: "https://k8s.bm.mainnet.lcd.injective.network",
				// indexer: 'https://k8s.mainnet.exchange.grpc-web.injective.network',
			};
			return endpoints;
		}
		return getNetworkEndpoints(network);
	})();

	const IS_MAINNET = network === "mainnet";
	const IS_TESTNET = network === "testnet";

	console.log(
		"🪵 | getInjectiveClients | endpoints.indexer:",
		endpoints.indexer,
	);

	const indexerTransport = new GrpcWebFetchTransport({
		baseUrl: endpoints.indexer,
	});

	return {
		network,
		endpoints,
		chainGrpcWasmApi: new ChainGrpcWasmApi(endpoints.grpc),
		chainBankGrpcApi: new ChainGrpcBankApi(endpoints.grpc),
		chainGrpcAuthZApi: new ChainGrpcAuthZApi(endpoints.grpc),
		chainGrpcAuthApi: new ChainGrpcAuthApi(endpoints.grpc),
		chainRestAuthApi: new ChainRestAuthApi(endpoints.rest),
		chainGrpcExchangeApi: new ChainGrpcExchangeApi(endpoints.grpc),
		indexerRestDerivativesChronosApi: new IndexerRestDerivativesChronosApi(
			`${endpoints.chronos}/api/chronos/v1/derivative`,
		),
		indexerRestSpotChronosApi: new IndexerRestSpotChronosApi(
			`${endpoints.chronos}/api/chronos/v1/spot`,
		),
		indexerGrpcOracleApi: new IndexerGrpcOracleApi(endpoints.indexer),
		indexerGrpcSpotApi: new IndexerGrpcSpotApi(endpoints.indexer),
		indexerGrpcArchiverApi: new IndexerGrpcArchiverApi(
			IS_MAINNET
				? "https://k8s.mainnet.archiver.grpc-web.injective.network"
				: IS_TESTNET
					? "https://k8s.testnet.archiver.grpc-web.injective.network"
					: endpoints.indexer,
		),
		indexerGrpcWeb3GwApi: new IndexerGrpcWeb3GwApi(
			endpoints.web3gw ?? endpoints.indexer,
		),
		txGrpcApi: new TxGrpcApi(endpoints.grpc),
		indexerGrpcDerivativesApi: new IndexerGrpcDerivativesApi(endpoints.indexer),
		indexerGrpcAccountPortfolioApi: new IndexerGrpcAccountPortfolioApi(
			endpoints.indexer,
		),
		indexerGrpcExplorerApi: new IndexerGrpcExplorerApi(endpoints.indexer),
		indexerRestExplorerApi: new IndexerRestExplorerApi(endpoints.indexer),
		indexerRestMarketChronosApi: new IndexerRestMarketChronosApi(
			`${endpoints.chronos}/api/chronos/v1/market`,
		),
		tokenFactory: TokenFactory.make(network),
		// tokenFactoryStatic: new TokenFactoryStatic(getTokens(network)),
		indexerTransport,
		derivativeExchangeRPCClient: new InjectiveDerivativeExchangeRPCClient(
			indexerTransport,
		),
	};
}

export const injectiveClients = getInjectiveClients(Network.Mainnet);
export type InjectiveClients = ReturnType<typeof getInjectiveClients>;
