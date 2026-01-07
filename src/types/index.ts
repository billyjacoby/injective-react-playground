// Input parameters for creating a deBridge order
export interface deBridgeOrderInput {
	srcChainId: string;
	srcChainTokenIn: string;
	srcChainTokenInAmount: string;
	dstChainId: string;
	dstChainTokenOut: string;
	dstChainTokenOutRecipient?: string;
	account?: string;
	dstChainTokenOutAmount?: string;
	slippage?: number;
	additionalTakerRewardBps?: number;
	srcIntermediaryTokenAddress?: string;
	dstIntermediaryTokenAddress?: string;
	dstIntermediaryTokenSpenderAddress?: string;
	intermediaryTokenUSDPrice?: number;
	srcAllowedCancelBeneficiary?: string;
	referralCode?: number;
	affiliateFeePercent?: number;
	srcChainOrderAuthorityAddress?: string;
	srcChainRefundAddress?: string;
	dstChainOrderAuthorityAddress?: string;
	prependOperatingExpenses?: boolean;
	deBridgeApp?: string;
	affiliateFeeRecipient?: string;
}

// Response structure for a deBridge order
export interface deBridgeOrderResponse {
	tx: {
		data: string;
		to: string;
		value: string;
	};
	estimation: {
		srcChainTokenIn: {
			address: string;
			chainId: number;
			decimals: number;
			name: string;
			symbol: string;
			amount: string;
			approximateOperatingExpense: string;
			mutatedWithOperatingExpense: boolean;
			approximateUsdValue: number;
			originApproximateUsdValue: number;
		};
		dstChainTokenOut: {
			address: string;
			chainId: number;
			decimals: number;
			name: string;
			symbol: string;
			amount: string;
			recommendedAmount: string;
			maxTheoreticalAmount: string;
			approximateUsdValue: number;
			recommendedApproximateUsdValue: number;
			maxTheoreticalApproximateUsdValue: number;
		};
		costsDetails: Array<{
			chain: string;
			tokenIn: string;
			tokenOut: string;
			amountIn: string;
			amountOut: string;
			type: string;
			payload: Record<string, unknown>;
		}>;
		recommendedSlippage: number;
	};
	prependedOperatingExpenseCost?: string;
	order?: {
		approximateFulfillmentDelay: number;
		salt: number;
		metadata: string;
	};
	orderId?: string;
	fixFee?: string;
	protocolFee?: string;
	userPoints?: number;
	integratorPoints?: number;
	estimatedTransactionFee?: {
		total: string;
		details: {
			gasLimit: string;
			baseFee: string;
			maxFeePerGas: string;
			maxPriorityFeePerGas: string;
		};
	};
	protocolFeeApproximateUsdValue?: number;
	usdPriceImpact?: number;
}
