import { isMainnet, isTestnet, Network } from "@injectivelabs/networks";
import { bech32 } from "bech32";
import type { Address, Chain, PublicClient } from "viem";
import {
	createPublicClient,
	encodeFunctionData,
	http,
	padHex,
	parseAbi,
	toHex,
} from "viem";
import { getAlchemyUrl, NETWORK } from "../../constants/setup";
import { estimateGasAndNonce } from "../utils/gas";
import { getInjNetworkToChain } from "../utils/network";

export const peggyAbi = parseAbi([
	"function sendToInjective(address _tokenContract, bytes32 _destination, uint256 _amount, string _data) external",
]);

export const getInjectivePeggyBridgeAddress = (network: Network) => {
	if (isMainnet(network)) {
		return "0xF955C57f9EA9Dc8781965FEaE0b6A2acE2BAD6f3";
	}

	if (isTestnet(network)) {
		// return "0x12e1181a741b70BE6A9D81f85af3E92B6ba41897";
		return "0x69a8b9f6e25b8d2550c3abc41e84929feaa2cbaf";
	}

	return "0x430544ca09F7914077a0E8F405Da62292428F49D";
};

export const injectivePeggyBridgeAddress =
	getInjectivePeggyBridgeAddress(NETWORK);

export class PeggyContract {
	private publicClient: PublicClient;
	private peggyAddress: string;
	private chain: Chain;

	constructor(params: { network: Network }) {
		this.chain = getInjNetworkToChain(params.network);
		this.peggyAddress = injectivePeggyBridgeAddress;
		this.publicClient = createPublicClient({
			chain: this.chain,
			transport: http(getAlchemyUrl(params.network)),
		});
	}

	/**
	 * Convert Injective bech32 address to bytes32 format for Peggy bridge
	 */
	public static convertInjectiveAddressToBytes32(
		bech32Address: string,
	): `0x${string}` {
		try {
			// Decode bech32 address
			const decoded = bech32.decode(bech32Address);
			// Convert words (5-bit) to bytes (8-bit)
			const bytes = bech32.fromWords(decoded.words);
			// Convert bytes array to hex string
			const hexString = `0x${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
			// Pad to 32 bytes (64 hex characters)
			return padHex(hexString as `0x${string}`, { size: 32 });
		} catch (error) {
			console.error("Failed to convert Injective address:", error);
			throw new Error(`Invalid Injective address: ${bech32Address}`);
		}
	}

	async sendToInjective({
		amount,
		fromAddress,
		tokenAddress,
		destinationAddress,
	}: {
		amount: string;
		fromAddress: string;
		tokenAddress: string;
		destinationAddress: string;
	}) {
		// Log the amount being bridged for debugging
		const amountBigInt = BigInt(amount);
		const amountEth = Number(amountBigInt) / 1e18;
		console.log(`[PeggyContract] Bridge amount:`, {
			wei: amount,
			eth: amountEth.toFixed(6),
			bigInt: amountBigInt.toString(),
		});

		// Convert Injective bech32 address to bytes32
		const destinationBytes32 =
			PeggyContract.convertInjectiveAddressToBytes32(destinationAddress);

		const calldata = encodeFunctionData({
			abi: peggyAbi,
			functionName: "sendToInjective",
			args: [tokenAddress as Address, destinationBytes32, amountBigInt, ""],
		});

		const { gas, fees, nonce } = await estimateGasAndNonce({
			from: fromAddress as Address,
			to: this.peggyAddress as Address,
			value: 0n,
			calldata,
			publicClient: this.publicClient,
		});

		const tx = {
			from: fromAddress as Address,
			to: this.peggyAddress as Address,
			data: calldata,
			value: toHex(0n),
			gas: toHex(gas),
			maxFeePerGas: toHex(fees.maxFeePerGas),
			maxPriorityFeePerGas: toHex(fees.maxPriorityFeePerGas),
			nonce: toHex(nonce),
		};

		return tx;
	}
}

export const peggyContract = new PeggyContract({
	network: NETWORK,
});
