import React from "react";

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

type AmountInputProps = {
	usdAmount: number;
	customAmount: string;
	isDisabled: boolean;
	onPresetClick: (amount: number) => void;
	onCustomAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function AmountInput({
	usdAmount,
	customAmount,
	isDisabled,
	onPresetClick,
	onCustomAmountChange,
}: AmountInputProps) {
	return (
		<div>
			<label
				htmlFor="custom-amount"
				className="block text-sm font-medium text-gray-300 mb-3"
			>
				Amount to Onramp (USD)
			</label>

			{/* Preset buttons */}
			<div className="flex flex-wrap gap-2 mb-3">
				{PRESET_AMOUNTS.map((amount) => (
					<button
						key={amount}
						type="button"
						onClick={() => onPresetClick(amount)}
						disabled={isDisabled}
						className={`px-4 py-2 rounded-lg font-medium transition-all ${
							usdAmount === amount && customAmount === ""
								? "bg-blue-500 text-white"
								: "bg-gray-700 text-gray-300 hover:bg-gray-600"
						} disabled:opacity-50 disabled:cursor-not-allowed`}
					>
						${amount}
					</button>
				))}
			</div>

			{/* Custom amount input */}
			<div className="relative">
				<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
					$
				</span>
				<input
					id="custom-amount"
					type="number"
					value={customAmount}
					onChange={onCustomAmountChange}
					placeholder="Enter custom amount"
					disabled={isDisabled}
					min="10"
					step="10"
					className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
				/>
			</div>
		</div>
	);
}
