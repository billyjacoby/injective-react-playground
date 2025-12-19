import type { PriceQuote } from "../../../lib/services/priceService";
import { priceService } from "../../../lib/services/priceService";
import { formatWethAmount } from "../utils/format";

type QuotePreviewProps = {
	quote: PriceQuote;
	usdAmount: number;
	isQuoteLoading: boolean;
};

export function QuotePreview({
	quote,
	usdAmount,
	isQuoteLoading,
}: QuotePreviewProps) {
	return (
		<div className="bg-gray-800/50 rounded-xl p-5 space-y-4 border border-gray-700/50">
			<h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
				Preview
			</h3>

			{isQuoteLoading ? (
				<div className="flex items-center justify-center py-4">
					<div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
				</div>
			) : (
				<>
					{/* Main output */}
					<div className="flex items-center justify-between">
						<span className="text-gray-400">You'll receive</span>
						<div className="text-right">
							<p className="text-2xl font-bold text-white">
								{formatWethAmount(quote.wethAmount)} wETH
							</p>
							<p className="text-sm text-gray-500">
								≈ {priceService.formatUsd(quote.estimatedUsdtAmount)} USDT
								<span className="text-xs ml-1">(after swap)</span>
							</p>
						</div>
					</div>

					{/* Fee breakdown */}
					<div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
						<div className="flex justify-between text-gray-400">
							<span>Input amount</span>
							<span>{priceService.formatUsd(usdAmount)}</span>
						</div>
						<div className="flex justify-between text-gray-400">
							<span>Moonpay fee (~{quote.fees.moonpayFeePercent}%)</span>
							<span className="text-red-400">
								-
								{priceService.formatUsd(
									(usdAmount * quote.fees.moonpayFeePercent) / 100,
								)}
							</span>
						</div>
						<div className="flex justify-between text-gray-400">
							<span>Est. gas costs</span>
							<span className="text-red-400">
								-{priceService.formatUsd(quote.fees.estimatedGasCostUsd)}
							</span>
						</div>
						<div className="flex justify-between text-gray-400">
							<span>wETH/USDT price</span>
							<span>{priceService.formatUsd(quote.pricePerWeth)}</span>
						</div>
						{quote.slippagePercent > 0.1 && (
							<div className="flex justify-between text-yellow-400">
								<span>Est. slippage</span>
								<span>{quote.slippagePercent.toFixed(2)}%</span>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
