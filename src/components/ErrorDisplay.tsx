type ErrorDisplayProps = {
	error: string | null;
	className?: string;
};

export function ErrorDisplay({ error, className = "" }: ErrorDisplayProps) {
	if (!error) return null;

	return (
		<p className={`text-red-500 text-sm text-center ${className}`}>{error}</p>
	);
}

