import {
	getNetworkChainInfo,
	getNetworkEndpoints,
	Network,
} from "@injectivelabs/networks";
import { ChainGrpcBankApi } from "@injectivelabs/sdk-ts";
import { Address } from "viem/accounts";
export const SERVER_HOSTNAME = "10.0.1.60";

export const NETWORK = Network.Mainnet;
export const NETWORK_INFO = getNetworkChainInfo(NETWORK);
export const ENDPOINTS = getNetworkEndpoints(NETWORK);

export const chainGrpcBankApi = new ChainGrpcBankApi(ENDPOINTS.grpc);

export const INJ_USDT_ADDRESS =
	"0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13" as Address;
export const POLYGON_USDC_ADDRESS =
	"0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as Address;

export const POLYGON_DESINTATION_ADDRESS =
	"0x5C81191F7934bbBe0908679F11B80fe1D0B9FCeD" as Address;

export const DEBRIDGE_INJ_CHAIN_ID = "100000029";
