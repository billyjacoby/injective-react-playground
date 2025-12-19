type TransactionLinkProps = {
	label: string;
	hash: string;
};

export function TransactionLink({ label, hash }: TransactionLinkProps) {
	const shortHash = `${hash.slice(0, 8)}...${hash.slice(-6)}`;
	const etherscanUrl = `https://etherscan.io/tx/${hash}`;

	return (
		<div className="flex items-center justify-between text-sm">
			<span className="text-gray-400">{label}:</span>
			<a
				href={etherscanUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-400 hover:text-blue-300 font-mono"
			>
				{shortHash} ↗
			</a>
		</div>
	);
}
