type WalletHeaderProps = {
	evmAddress: string;
	onDisconnect: () => void;
};

export function WalletHeader({ evmAddress, onDisconnect }: WalletHeaderProps) {
	return (
		<div className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 z-50">
			<div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm">
					<div className="w-2 h-2 bg-emerald-500 rounded-full" />
					<span className="text-gray-400">Connected:</span>
					<span className="text-white font-mono">
						{evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
					</span>
				</div>
				<button
					type="button"
					onClick={onDisconnect}
					className="text-sm text-gray-400 hover:text-white transition-colors"
				>
					Disconnect
				</button>
			</div>
		</div>
	);
}
