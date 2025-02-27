import { getNetworkChainInfo, getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { ChainGrpcBankApi } from "@injectivelabs/sdk-ts";
export const SERVER_HOSTNAME = '10.0.1.60';

export const NETWORK = Network.Mainnet;
export const NETWORK_INFO = getNetworkChainInfo(NETWORK);
export const ENDPOINTS = getNetworkEndpoints(NETWORK);

export const chainGrpcBankApi = new ChainGrpcBankApi(ENDPOINTS.grpc);