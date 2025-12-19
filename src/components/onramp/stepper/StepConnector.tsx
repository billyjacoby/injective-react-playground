type StepStatus = "completed" | "current" | "pending" | "error";

type StepConnectorProps = {
	status: StepStatus;
};

export function StepConnector({ status }: StepConnectorProps) {
	const baseClasses = "flex-1 h-1 mx-2 rounded transition-all duration-300";

	switch (status) {
		case "completed":
			return <div className={`${baseClasses} bg-emerald-500`} />;
		case "current":
			return (
				<div
					className={`${baseClasses} bg-gradient-to-r from-emerald-500 to-blue-500`}
				/>
			);
		default:
			return <div className={`${baseClasses} bg-gray-700`} />;
	}
}
