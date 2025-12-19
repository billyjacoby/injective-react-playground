import { isMainnet, Network } from "@injectivelabs/networks";
import type { Chain } from "viem";
import { mainnet, sepolia } from "viem/chains";

export const getInjNetworkToChain = (network: Network): Chain => {
	if (isMainnet(network)) {
		return mainnet;
	}
	return sepolia;
};
