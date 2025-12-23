import type { Address, Chain, Hex } from "viem";
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
	account: SmartAccount;
	/** The bundler client for sending user operations */
	bundlerClient: BundlerClient;
	/** The EOA address that owns the smart account */
	ownerAddress: Address;
	/** The smart account (contract) address */
	smartAccountAddress: Address;
};

/**
 * A single call to be executed by the smart account
 */
export type GaslessCall = {
	/** Target contract/address to call */
	to: Address;
	/** Calldata to send (use "0x" for no data) */
	data?: Hex;
	/** Value in wei to send (defaults to 0) */
	value?: bigint;
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

/**
 * Result from the test transaction (includes owner address)
 */
export type GaslessTestResult = GaslessTransactionResult & {
	/** The owner EOA address */
	ownerAddress: Address;
	/** Transaction hash is always present for test results */
	transactionHash: Hex;
};

/**
 * Gas sponsorship eligibility check result
 */
export type SponsorshipEligibility = {
	/** Whether the transaction is eligible for sponsorship */
	eligible: boolean;
};

/**
 * ERC-20 token transfer parameters
 */
export type Erc20TransferParams = {
	/** The token contract address */
	token: Address;
	/** The recipient address */
	to: Address;
	/** The amount to transfer (in token's smallest unit) */
	amount: bigint;
};

/**
 * ERC-20 approve parameters
 */
export type Erc20ApproveParams = {
	/** The token contract address */
	token: Address;
	/** The spender address to approve */
	spender: Address;
	/** The amount to approve (in token's smallest unit) */
	amount: bigint;
};
