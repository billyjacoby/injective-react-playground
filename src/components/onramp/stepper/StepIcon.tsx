type StepStatus = "completed" | "current" | "pending" | "error";

type StepIconProps = {
	status: StepStatus;
	stepNumber: number;
};

export function StepIcon({ status, stepNumber }: StepIconProps) {
	const baseClasses =
		"w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300";

	switch (status) {
		case "completed":
			return (
				<div className={`${baseClasses} bg-emerald-500 text-white`}>
					<svg
						aria-label="Completed icon"
						role="img"
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
			);
		case "current":
			return (
				<div
					className={`${baseClasses} bg-blue-500 text-white ring-4 ring-blue-500/30 animate-pulse`}
				>
					{stepNumber}
				</div>
			);
		case "error":
			return (
				<div className={`${baseClasses} bg-red-500 text-white`}>
					<svg
						aria-label="Error icon"
						role="img"
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
			);
		default:
			return (
				<div className={`${baseClasses} bg-gray-700 text-gray-400`}>
					{stepNumber}
				</div>
			);
	}
}
