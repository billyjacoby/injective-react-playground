import type { Address, Chain, Hex, PublicClient, WalletClient } from "viem";
import type { BundlerClient, SmartAccount } from "viem/account-abstraction";
import { mainnet, sepolia } from "viem/chains";

/**
 * Configuration for the gasless transaction client
 */
export type GaslessClientConfig = {
	/** The chain to use - defaults based on IS_MAINNET */
	chain?: typeof sepolia | typeof mainnet | Chain;
	/** Alchemy API key - defaults to env vars */
	apiKey?: string;
	/** Gas Manager Policy ID from Alchemy dashboard */
	policyId: string;
};

/**
 * Result from creating a gasless client
 */
export type GaslessClientResult = {
	/** The smart account instance */
	smartAccount: SmartAccount;
	/** The bundler client for sending user operations */
	bundlerClient: BundlerClient;
	/** The EOA address that owns the smart account */
	ownerAddress: Address;
	/** The smart account (contract) address */
	smartAccountAddress: Address;
	/** The wallet client */
	walletClient: WalletClient & PublicClient;
};

/**
 * A single call to be executed by the smart account
 */
export type GaslessCall =
	| {
			/** Target contract/address to call */
			to: Address;
			/** Calldata to send (use "0x" for no data) */
			data: Hex;
			value?: bigint;
	  }
	| {
			to: Address;
			/** Value in wei to send (defaults to 0) */
			data?: Hex;
			value: bigint;
	  };

/**
 * Options for sending gasless transactions
 */
export type SendGaslessOptions = {
	/** Whether to wait for the transaction to be mined (default: true) */
	waitForTransaction?: boolean;
};

/**
 * Result from sending a gasless transaction
 */
export type GaslessTransactionResult = {
	/** The user operation hash */
	userOperationHash: Hex;
	/** The on-chain transaction hash (only if waitForTransaction is true) */
	transactionHash?: Hex;
	/** The smart account address that sent the transaction */
	smartAccountAddress: Address;
};
