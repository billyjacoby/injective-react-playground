import {
	getNetworkChainInfo,
	getNetworkEndpoints,
	isDevnet,
	isMainnet,
	isTestnet,
	Network,
} from "@injectivelabs/networks";
import { EvmChainId } from "@injectivelabs/ts-types";

// Set network based on environment variable, default to testnet for development
export const NETWORK =
	(import.meta.env.VITE_NETWORK as Network | undefined) ?? Network.Testnet;
export const NETWORK_INFO = getNetworkChainInfo(NETWORK);

export const ETHEREUM_CHAIN_ID = isMainnet(NETWORK)
	? EvmChainId.Mainnet
	: EvmChainId.Sepolia;

export const CHAIN_ID = NETWORK_INFO.chainId;

export const IS_MAINNET = isMainnet(NETWORK);
export const IS_TESTNET = isTestnet(NETWORK);
export const IS_DEVNET = isDevnet(NETWORK);

export const ENDPOINTS = getNetworkEndpoints(NETWORK);

export const ALCHEMY_MAINNET_BASE_URL = "https://eth-mainnet.g.alchemy.com/v2/";
export const ALCHEMY_SEPOLIA_BASE_URL = "https://eth-sepolia.g.alchemy.com/v2/";

export const APP_NAME = "Injective Onramp";

// Alchemy API keys - should be set via environment variables
export const ALCHEMY_KEY = (import.meta.env.VITE_ALCHEMY_KEY || "") as string;
export const ALCHEMY_SEPOLIA_KEY = (import.meta.env.VITE_ALCHEMY_SEPOLIA_KEY ||
	"") as string;

export const getAlchemyUrl = (network: Network): string => {
	if (isMainnet(network)) {
		return `${ALCHEMY_MAINNET_BASE_URL}${ALCHEMY_KEY}`;
	}

	if (isTestnet(network)) {
		return `${ALCHEMY_SEPOLIA_BASE_URL}${ALCHEMY_SEPOLIA_KEY}`;
	}

	return `${ALCHEMY_SEPOLIA_BASE_URL}${ALCHEMY_SEPOLIA_KEY}`;
};

export const getAlchemyRpcEndpointForChainId = (chainId: EvmChainId) => {
	if (chainId === EvmChainId.Mainnet) {
		return `${ALCHEMY_MAINNET_BASE_URL}${ALCHEMY_KEY}`;
	}

	if (chainId === EvmChainId.Sepolia) {
		return `${ALCHEMY_SEPOLIA_BASE_URL}${ALCHEMY_SEPOLIA_KEY}`;
	}

	return `${ALCHEMY_SEPOLIA_BASE_URL}${ALCHEMY_SEPOLIA_KEY}`;
};
