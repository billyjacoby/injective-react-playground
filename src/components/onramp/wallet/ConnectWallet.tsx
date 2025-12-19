import { RabbyIcon } from "./RabbyIcon";

type ConnectWalletProps = {
	isConnecting: boolean;
	onConnect: () => void;
};

export function ConnectWallet({ isConnecting, onConnect }: ConnectWalletProps) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
			<div className="max-w-md w-full mx-4">
				<div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-8">
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-white mb-3">
							<span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
								Onramp to Injective
							</span>
						</h1>
						<p className="text-gray-400">Connect your wallet to get started</p>
					</div>

					<button
						type="button"
						onClick={onConnect}
						disabled={isConnecting}
						className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-3"
					>
						{isConnecting ? (
							<>
								<div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
								Connecting...
							</>
						) : (
							<>
								<RabbyIcon />
								Connect Rabby Wallet
							</>
						)}
					</button>

					<p className="text-xs text-gray-500 text-center mt-4">
						Make sure you have Rabby wallet installed
					</p>
				</div>
			</div>
		</div>
	);
}
