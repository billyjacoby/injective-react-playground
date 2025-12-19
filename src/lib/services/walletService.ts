import { EvmChainId } from "@injectivelabs/ts-types";
import type { BaseWalletStrategy } from "@injectivelabs/wallet-core";
import { Web3Broadcaster } from "@injectivelabs/wallet-core";
import { ETHEREUM_CHAIN_ID, NETWORK } from "../../constants/setup";

export type EvmTx = {
	from: string;
	to: string;
	gas: string;
	maxFeePerGas: string;
	maxPriorityFeePerGas: string;
	data: string;
	value?: string;
	nonce?: string;
};

export function createWeb3Broadcaster(walletStrategy: BaseWalletStrategy) {
	return new Web3Broadcaster({
		walletStrategy,
		network: NETWORK,
		evmChainId: ETHEREUM_CHAIN_ID as unknown as EvmChainId,
	});
}

export async function sendTransaction(
	broadcaster: Web3Broadcaster,
	tx: EvmTx,
	address: string,
): Promise<string> {
	const txHash = await broadcaster.sendTransaction({
		tx,
		address,
	});
	return txHash;
}

export function createSendTransactionFn(
	walletStrategy: BaseWalletStrategy,
	address: string,
): (tx: EvmTx) => Promise<string> {
	const broadcaster = createWeb3Broadcaster(walletStrategy);

	return async (tx: EvmTx) => {
		return sendTransaction(broadcaster, tx, address);
	};
}
