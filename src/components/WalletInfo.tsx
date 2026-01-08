import { useMemo } from "react";
import type { Address } from "viem";
import { injective } from "viem/chains";
import { getSafeWallet } from "../utils/get-safe-wallet";

type WalletInfoProps = {
	account: Address;
	injectiveAddress: string;
	currentChainId: number | null;
};

export function WalletInfo({
	account,
	injectiveAddress,
	currentChainId,
}: WalletInfoProps) {
	const isOnCorrectChain = currentChainId === injective.id;
	const safeAddress = useMemo(() => getSafeWallet(account), [account]);
	const chainStatus =
		currentChainId !== null
			? `${currentChainId} ${isOnCorrectChain ? "✓ (Injective)" : "⚠ (Wrong chain)"}`
			: "Unknown";

	return (
		<div className="bg-gray-100 p-4 rounded-lg w-full">
			<p className="text-sm text-gray-600">Connected Account:</p>
			<p className="font-mono text-sm break-all text-black">{account}</p>
			<p className="text-sm text-gray-600 mt-2">Injective Address:</p>
			<p className="font-mono text-sm break-all text-black">
				{injectiveAddress}
			</p>
			<p className="text-sm text-gray-600 mt-2">Safe Address:</p>
			<p className="font-mono text-sm break-all text-black">{safeAddress}</p>
			<p className="text-sm text-gray-600 mt-2">Current Chain ID:</p>
			<p className="font-mono text-sm text-black">{chainStatus}</p>
		</div>
	);
}
