import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { createWalletClient, custom } from "viem";
import { polygon } from "viem/chains";

// Create wallet
const wallet = createWalletClient({
	chain: polygon,
	transport: custom(window.ethereum),
});

// Configure remote signing
const builderConfig = new BuilderConfig({
	remoteBuilderConfig: {
		url: "http://localhost:3001/sign",
	},
});

const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137;

export const client = new RelayClient(
	RELAYER_URL,
	CHAIN_ID,
	wallet,
	builderConfig,
);
