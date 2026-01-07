import { getEthereumAddress } from "@injectivelabs/sdk-ts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { DEBRIDGE_INJ_CHAIN_ID } from "../../constants";
import { createDebridgeBridgeOrder } from "../lib/bridge-order";
import { deBridgeOrderInput, deBridgeOrderResponse } from "../types";

const QUOTE_VALIDITY_SECONDS = 30;

type UseBridgeQuoteParams = {
	injectiveAddress: string;
	account: Address | null;
	srcChainTokenIn: Address;
	dstChainId: string;
	dstChainTokenOut: Address;
	dstChainTokenOutRecipient: Address;
	tokenDecimals?: number;
};

/**
 * Hook for managing bridge quote fetching and staleness tracking
 * Implements 30-second quote validity window per deBridge documentation
 */
export function useBridgeQuote({
	injectiveAddress,
	account,
	srcChainTokenIn,
	dstChainId,
	dstChainTokenOut,
	dstChainTokenOutRecipient,
	tokenDecimals = 6,
}: UseBridgeQuoteParams) {
	const [quote, setQuote] = useState<deBridgeOrderResponse | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [quoteTimestamp, setQuoteTimestamp] = useState<number | null>(null);
	const [currentTime, setCurrentTime] = useState<number>(Date.now());
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const autoRenewTimerRef = useRef<NodeJS.Timeout | null>(null);
	const currentAmountRef = useRef<string>("");

	/**
	 * Fetch bridge quote from deBridge API
	 */
	const fetchQuote = useCallback(
		async (amount: string) => {
			if (!account || !amount || parseFloat(amount) <= 0) {
				setQuote(null);
				setQuoteTimestamp(null);
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const ethereumAddress = getEthereumAddress(injectiveAddress) as Address;
				const amountInAtomicUnit = parseUnits(amount, tokenDecimals);

				const orderInput: deBridgeOrderInput = {
					srcChainId: DEBRIDGE_INJ_CHAIN_ID,
					srcChainTokenIn,
					srcChainTokenInAmount: amountInAtomicUnit.toString(),
					dstChainId,
					dstChainTokenOut,
					dstChainTokenOutRecipient,
					account: ethereumAddress,
					srcChainOrderAuthorityAddress: ethereumAddress,
					srcChainRefundAddress: ethereumAddress,
					dstChainOrderAuthorityAddress: dstChainTokenOutRecipient,
				};

				const order = await createDebridgeBridgeOrder(orderInput);

				// Validate that the response has estimation data
				if (!order?.estimation) {
					throw new Error(
						"Invalid response from deBridge API: missing estimation data",
					);
				}

				setQuote(order);
				const now = Date.now();
				setQuoteTimestamp(now);
				setCurrentTime(now);
				currentAmountRef.current = amount;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to fetch bridge quote";
				setError(errorMessage);
				setQuote(null);
				setQuoteTimestamp(null);
				console.error("Error fetching bridge quote:", err);
			} finally {
				setIsLoading(false);
			}
		},
		[
			account,
			injectiveAddress,
			srcChainTokenIn,
			dstChainId,
			dstChainTokenOut,
			dstChainTokenOutRecipient,
			tokenDecimals,
		],
	);

	/**
	 * Debounced version of fetchQuote
	 */
	const fetchQuoteDebounced = useCallback(
		(amount: string) => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(() => {
				currentAmountRef.current = amount;
				fetchQuote(amount);
			}, 500);
		},
		[fetchQuote],
	);

	/**
	 * Refresh the current quote
	 */
	const refreshQuote = useCallback(async () => {
		if (!quote) return;

		// Extract the amount from the current quote
		const srcAmount = quote.estimation.srcChainTokenIn.amount;
		const decimals = quote.estimation.srcChainTokenIn.decimals;
		const amount = (BigInt(srcAmount) / BigInt(10 ** decimals)).toString();

		await fetchQuote(amount);
	}, [quote, fetchQuote]);

	/**
	 * Check if quote is stale (>30 seconds old)
	 */
	const isStale = quoteTimestamp
		? currentTime - quoteTimestamp > QUOTE_VALIDITY_SECONDS * 1000
		: false;

	/**
	 * Calculate time remaining until quote expires
	 */
	const timeRemaining = quoteTimestamp
		? Math.max(
				0,
				QUOTE_VALIDITY_SECONDS -
					Math.floor((currentTime - quoteTimestamp) / 1000),
			)
		: 0;

	// Update timer every second and auto-renew after 30 seconds
	useEffect(() => {
		if (!quoteTimestamp || !quote || !account) return;

		// Clear any existing auto-renew timer
		if (autoRenewTimerRef.current) {
			clearTimeout(autoRenewTimerRef.current);
		}

		// Set up auto-renewal after 30 seconds
		const timeUntilRenewal = QUOTE_VALIDITY_SECONDS * 1000;
		autoRenewTimerRef.current = setTimeout(async () => {
			// Only auto-renew if we still have a valid amount and account
			if (
				currentAmountRef.current &&
				account &&
				parseFloat(currentAmountRef.current) > 0
			) {
				console.log("Auto-renewing quote after 30 seconds...");
				await fetchQuote(currentAmountRef.current);
			}
		}, timeUntilRenewal);

		// Update current time every second for countdown
		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, 1000);

		return () => {
			clearInterval(interval);
			if (autoRenewTimerRef.current) {
				clearTimeout(autoRenewTimerRef.current);
			}
		};
	}, [quoteTimestamp, quote, account, fetchQuote]);

	// Cleanup debounce timer on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	return {
		quote,
		isLoading,
		error,
		isStale,
		timeRemaining,
		fetchQuote: fetchQuoteDebounced,
		refreshQuote,
		setError,
	};
}
