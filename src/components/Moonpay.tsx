import { Network } from "@injectivelabs/networks";
import { MoonPayBuyWidget } from "@moonpay/moonpay-react";
import { useState } from "react";
import { NETWORK } from "../constants/setup";
import { useGaslessStore } from "../stores/gaslessStore";

async function getSignedUrl(url: string) {
	const response = await fetch(
		`${import.meta.env.VITE_API_URL}/api/v1/moonpay/sign-url`,
		{
			method: "POST",
			body: JSON.stringify({ url }),
		},
	);

	if (!response.ok) {
		throw new Error("Failed to get signed url");
	}

	return response.json();
}

export function Moonpay() {
	const { ownerAddress, smartAccountAddress } = useGaslessStore();
	const [isVisible, setIsVisible] = useState(false);

	if (!ownerAddress || !smartAccountAddress) return null;

	async function handleSignUrl(url: string) {
		const signedUrl = await getSignedUrl(url);
		return signedUrl.signature;
	}

	return (
		<div className="bg-gray-800 rounded-lg p-4 space-y-1 text-sm m-auto">
			<button
				type="button"
				onClick={() => setIsVisible(true)}
				className="w-full"
			>
				Onramp with Moonpay
			</button>
			<MoonPayBuyWidget
				variant="overlay"
				onUrlSignatureRequested={(url) => {
					return handleSignUrl(url);
				}}
				onClose={async () => {
					await new Promise((resolve) => setTimeout(resolve, 1000));
					setIsVisible(false);
				}}
				baseCurrencyCode="usd"
				baseCurrencyAmount="100"
				defaultCurrencyCode={NETWORK === Network.Mainnet ? "usdt" : "usdc"}
				paymentMethod="credit_debit_card"
				walletAddress={smartAccountAddress}
				visible={isVisible}
			/>
		</div>
	);
}
