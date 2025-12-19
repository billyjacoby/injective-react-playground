import { isMainnet, Network } from "@injectivelabs/networks";
import { IS_MAINNET } from "./setup";

export const INJ_LOGO_URL =
	"https://imagedelivery.net/lPzngbR8EltRfBOi_WYaXw/efaa2c96-5463-4707-0d2b-19e5b63df000/public";
export const USDT_LOGO_URL =
	"https://imagedelivery.net/lPzngbR8EltRfBOi_WYaXw/e46e1742-fb16-4393-cc40-83b20e875400/public";
export const WETH_LOGO_URL =
	"https://imagedelivery.net/lPzngbR8EltRfBOi_WYaXw/a8d72344-01e4-4471-3098-2fd58f179b00/public";
export const UNKNOWN_LOGO_URL =
	"https://imagedelivery.net/lPzngbR8EltRfBOi_WYaXw/6f015260-c589-499f-b692-a57964af9900/public";

export const INJ_DENOM = "inj";
export const ETH_DENOM = "peggy0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
export const WETH_DENOM = "peggy0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const USDT_DENOM = "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7";

export type TokenInfo = {
	address: string;
	decimals: number;
	symbol: string;
	name: string;
	logo: string;
	coinGeckoId: string;
	denom: string;
};

export const wethToken: TokenInfo = {
	address: IS_MAINNET
		? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
		: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
	decimals: 18,
	symbol: "wETH",
	name: "Wrapped Ethereum",
	logo: WETH_LOGO_URL,
	coinGeckoId: "ethereum",
	denom: WETH_DENOM,
};

export const usdtToken: TokenInfo = {
	address: IS_MAINNET
		? "0xdAC17F958D2ee523a2206206994597C13D831ec7"
		: "0x87aB3B4C8661e07D6372361211B96ed4Dc36B1B5",
	decimals: 6,
	symbol: "USDT",
	name: "Tether",
	logo: USDT_LOGO_URL,
	coinGeckoId: "tether",
	denom: USDT_DENOM,
};

// wETH/USDT spot market ID on Injective mainnet
export const WETH_USDT_MARKET_ID =
	"0xd1956e20d74eeb1febe31cd37060781ff1cb266f49e0512b446a5fafa9a16034";

// WETH contract address on Ethereum mainnet
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// WETH contract address on Sepolia testnet
export const WETH_ADDRESS_SEPOLIA =
	"0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

export const getWethAddress = (network: Network) => {
	if (isMainnet(network)) {
		return WETH_ADDRESS;
	}
	return WETH_ADDRESS_SEPOLIA;
};
