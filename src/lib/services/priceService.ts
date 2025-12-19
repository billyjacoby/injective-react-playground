import { IndexerGrpcSpotApi } from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";
import { ENDPOINTS } from "../../constants/setup";
import {
	usdtToken,
	WETH_USDT_MARKET_ID,
	wethToken,
} from "../../constants/tokens";
import { GasSpeed, type GasSpeedType, gasCalculator } from "./gasCalculator";

// Price conversion for spot markets
// Chain price needs to be converted based on token decimals
// Formula: humanPrice = chainPrice * 10^(baseDecimals - quoteDecimals)
const BASE_DECIMALS = wethToken.decimals; // 18 for wETH
const QUOTE_DECIMALS = usdtToken.decimals; // 6 for USDT
const PRICE_MULTIPLIER = 10 ** (BASE_DECIMALS - QUOTE_DECIMALS); // 10^12

export type PriceQuote = {
	ethAmount: string;
	wethAmount: string;
	estimatedUsdtAmount: string;
	pricePerWeth: string;
	slippagePercent: number;
	fees: {
		moonpayFeePercent: number;
		bridgeFeePercent: number;
		estimatedGasCostUsd: number;
	};
};

// Fallback ETH price if API calls fail
const FALLBACK_ETH_PRICE_USD = 3800;

class PriceService {
	private spotApi: IndexerGrpcSpotApi;
	private cachedEthPrice: number | null = null;
	private cacheTimestamp: number = 0;
	private readonly CACHE_DURATION_MS = 30000; // 30 seconds

	constructor() {
		this.spotApi = new IndexerGrpcSpotApi(ENDPOINTS.indexer);
	}

	/**
	 * Fetch ETH price from CoinGecko (more reliable for USD price)
	 */
	private async fetchEthPriceFromCoinGecko(): Promise<number> {
		try {
			const response = await fetch(
				"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
			);
			const data = await response.json();
			const price = data?.ethereum?.usd;

			if (typeof price === "number" && price > 0) {
				return price;
			}
			throw new Error("Invalid price from CoinGecko");
		} catch (error) {
			console.error("Failed to fetch ETH price from CoinGecko:", error);
			return FALLBACK_ETH_PRICE_USD;
		}
	}

	/**
	 * Fetch the current wETH/USDT price from Injective DEX orderbook
	 */
	private async fetchWethUsdtPriceFromDex(): Promise<number | null> {
		try {
			const orderbook =
				await this.spotApi.fetchOrderbookV2(WETH_USDT_MARKET_ID);

			// Get best bid and ask
			const bestBid = orderbook.buys[0];
			const bestAsk = orderbook.sells[0];

			if (!bestBid || !bestAsk) {
				console.warn("No liquidity in wETH/USDT market");
				return null;
			}

			// Calculate mid price and convert from chain format to human readable
			// Chain prices are scaled by 10^(quoteDecimals - baseDecimals)
			const bidPrice = new BigNumberInBase(bestBid.price).times(
				PRICE_MULTIPLIER,
			);
			const askPrice = new BigNumberInBase(bestAsk.price).times(
				PRICE_MULTIPLIER,
			);
			const midPrice = bidPrice.plus(askPrice).div(2);

			const price = midPrice.toNumber();

			console.log(
				"DEX price (converted):",
				price,
				"from chain prices:",
				bestBid.price,
				bestAsk.price,
			);

			// Sanity check - ETH should be between $100 and $100,000
			if (price < 100 || price > 100000) {
				console.warn("DEX price out of expected range:", price);
				return null;
			}

			return price;
		} catch (error) {
			console.error("Failed to fetch wETH/USDT price from DEX:", error);
			return null;
		}
	}

	/**
	 * Get the best available ETH price
	 */
	async getEthPrice(): Promise<number> {
		const now = Date.now();

		// Return cached price if still valid
		if (
			this.cachedEthPrice &&
			now - this.cacheTimestamp < this.CACHE_DURATION_MS
		) {
			return this.cachedEthPrice;
		}

		// Try DEX first, then CoinGecko, then fallback
		let price = await this.fetchWethUsdtPriceFromDex();

		if (!price) {
			price = await this.fetchEthPriceFromCoinGecko();
		}

		// Cache the price
		this.cachedEthPrice = price;
		this.cacheTimestamp = now;

		return price;
	}

	/**
	 * Get the estimated USDT value for a given wETH amount
	 * For this PoC, we simply use ETH price since wETH bridges 1:1
	 * and the swap to USDT will happen separately on Injective
	 */
	async getExecutionPrice(wethAmount: string): Promise<{
		avgPrice: string;
		worstPrice: string;
		totalUsdt: string;
		slippagePercent: number;
	}> {
		const ethPrice = await this.getEthPrice();
		const wethAmountNum = parseFloat(wethAmount);

		// If amount is invalid, return zeros
		if (Number.isNaN(wethAmountNum) || wethAmountNum <= 0) {
			return {
				avgPrice: ethPrice.toFixed(2),
				worstPrice: ethPrice.toFixed(2),
				totalUsdt: "0.00",
				slippagePercent: 0,
			};
		}

		// Simple calculation: wETH amount * ETH price = estimated USD value
		// This is the value of wETH you'll receive on Injective
		const totalUsdt = wethAmountNum * ethPrice;

		// Try to get more accurate price from DEX orderbook
		try {
			const orderbook =
				await this.spotApi.fetchOrderbookV2(WETH_USDT_MARKET_ID);

			if (orderbook.buys && orderbook.buys.length > 0) {
				const wethAmountBn = new BigNumberInBase(wethAmount);
				let remainingAmount = wethAmountBn;
				let filledUsdt = new BigNumberInBase(0);
				let worstPrice = new BigNumberInBase(ethPrice);

				// Walk through the bid side (buys) to simulate selling wETH
				for (const bid of orderbook.buys) {
					if (remainingAmount.lte(0)) break;

					// Convert chain price to human readable
					const bidPrice = new BigNumberInBase(bid.price).times(
						PRICE_MULTIPLIER,
					);
					const bidQuantity = new BigNumberInBase(bid.quantity);

					const fillAmount = BigNumberInBase.min(remainingAmount, bidQuantity);
					const fillValue = fillAmount.times(bidPrice);

					filledUsdt = filledUsdt.plus(fillValue);
					remainingAmount = remainingAmount.minus(fillAmount);
					worstPrice = bidPrice;
				}

				// Add any unfilled portion at mid price
				if (remainingAmount.gt(0)) {
					filledUsdt = filledUsdt.plus(
						remainingAmount.times(new BigNumberInBase(ethPrice)),
					);
				}

				const filledUsdtNum = filledUsdt.toNumber();
				if (Number.isFinite(filledUsdtNum) && filledUsdtNum > 0) {
					const avgPrice = filledUsdtNum / wethAmountNum;
					const slippage = ((ethPrice - avgPrice) / ethPrice) * 100;

					return {
						avgPrice: avgPrice.toFixed(2),
						worstPrice: worstPrice.toFixed(2),
						totalUsdt: filledUsdtNum.toFixed(2),
						slippagePercent: Math.max(0, Math.min(slippage, 100)),
					};
				}
			}
		} catch (error) {
			console.warn(
				"DEX orderbook fetch failed, using simple calculation:",
				error,
			);
		}

		// Fallback: simple calculation
		return {
			avgPrice: ethPrice.toFixed(2),
			worstPrice: ethPrice.toFixed(2),
			totalUsdt: totalUsdt.toFixed(2),
			slippagePercent: 0,
		};
	}

	/**
	 * Calculate the full quote for an onramp from USD to USDT on Injective
	 *
	 * Flow: USD -> ETH (Moonpay) -> wETH (wrap) -> Bridge -> wETH on INJ -> (future) USDT on INJ
	 */
	async getOnrampQuote(
		usdAmount: number,
		gasSpeed: GasSpeedType = GasSpeed.NORMAL,
	): Promise<PriceQuote> {
		// Moonpay fees (approximately 4.5% for card payments)
		const MOONPAY_FEE_PERCENT = 4.5;
		// Bridge fee is minimal
		const BRIDGE_FEE_PERCENT = 0;

		// Validate input
		if (usdAmount <= 0 || Number.isNaN(usdAmount)) {
			return {
				ethAmount: "0",
				wethAmount: "0",
				estimatedUsdtAmount: "0",
				pricePerWeth: "0",
				slippagePercent: 0,
				fees: {
					moonpayFeePercent: MOONPAY_FEE_PERCENT,
					bridgeFeePercent: BRIDGE_FEE_PERCENT,
					estimatedGasCostUsd: 0,
				},
			};
		}

		// Get current ETH price and gas estimate
		const [ethPriceUsd, gasEstimate] = await Promise.all([
			this.getEthPrice(),
			gasCalculator.calculateGasReserve(gasSpeed),
		]);

		// Calculate gas cost in USD
		// Convert gas cost from ETH to USD
		const gasCostEth = parseFloat(gasEstimate.safeEthToReserve);
		const ESTIMATED_GAS_COST_USD = gasCostEth * ethPriceUsd;

		console.log(`[PriceService] Gas cost for ${gasSpeed}:`, {
			gasCostEth,
			gasCostUsd: ESTIMATED_GAS_COST_USD,
			ethPriceUsd,
		});

		// Calculate ETH amount after Moonpay fees
		const afterMoonpayFees = usdAmount * (1 - MOONPAY_FEE_PERCENT / 100);

		// Subtract gas costs and calculate ETH amount
		const netUsdForPurchase = Math.max(
			0,
			afterMoonpayFees - ESTIMATED_GAS_COST_USD,
		);
		const ethAmount = netUsdForPurchase / ethPriceUsd;

		// Validate ETH amount
		if (!Number.isFinite(ethAmount) || ethAmount <= 0) {
			return {
				ethAmount: "0",
				wethAmount: "0",
				estimatedUsdtAmount: "0",
				pricePerWeth: ethPriceUsd.toFixed(2),
				slippagePercent: 0,
				fees: {
					moonpayFeePercent: MOONPAY_FEE_PERCENT,
					bridgeFeePercent: BRIDGE_FEE_PERCENT,
					estimatedGasCostUsd: ESTIMATED_GAS_COST_USD,
				},
			};
		}

		// The wETH amount is the same (minus some for gas reserve which we'll handle separately)
		const wethAmount = ethAmount.toFixed(6);

		// Get execution price for selling wETH to USDT on Injective (for future swap preview)
		const execution = await this.getExecutionPrice(wethAmount);

		return {
			ethAmount: ethAmount.toFixed(6),
			wethAmount,
			estimatedUsdtAmount: execution.totalUsdt,
			pricePerWeth: ethPriceUsd.toFixed(2),
			slippagePercent: execution.slippagePercent,
			fees: {
				moonpayFeePercent: MOONPAY_FEE_PERCENT,
				bridgeFeePercent: BRIDGE_FEE_PERCENT,
				estimatedGasCostUsd: ESTIMATED_GAS_COST_USD,
			},
		};
	}

	/**
	 * Format USD amount for display
	 */
	formatUsd(amount: string | number): string {
		const num = typeof amount === "string" ? parseFloat(amount) : amount;
		if (!Number.isFinite(num)) return "$0.00";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(num);
	}

	/**
	 * Format crypto amount for display
	 */
	formatCrypto(amount: string | number, decimals: number = 6): string {
		const num = typeof amount === "string" ? parseFloat(amount) : amount;
		if (!Number.isFinite(num)) return "0";
		return num.toFixed(decimals);
	}
}

export const priceService = new PriceService();
