type WalletConnectionButtonProps = {
	onClick: () => void;
	isConnecting: boolean;
	error: string | null;
};

export function WalletConnectionButton({
	onClick,
	isConnecting,
	error,
}: WalletConnectionButtonProps) {
	return (
		<div className="flex flex-col items-center gap-4">
			<button
				type="button"
				onClick={onClick}
				disabled={isConnecting}
				className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isConnecting ? "Connecting..." : "Connect Rabby Wallet"}
			</button>
			{error && (
				<p className="text-red-500 text-sm max-w-md text-center">{error}</p>
			)}
		</div>
	);
}
