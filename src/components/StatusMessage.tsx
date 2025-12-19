import { useGaslessStore } from "../stores/gaslessStore";

export function StatusMessage() {
	const { status } = useGaslessStore();

	if (!status) return null;

	const isSuccess =
		status.includes("successful") || status.includes("!");

	return (
		<div
			className={`p-3 rounded-lg text-sm text-center ${
				isSuccess
					? "bg-emerald-900/50 text-emerald-300"
					: "bg-amber-900/50 text-amber-300"
			}`}
		>
			{status}
		</div>
	);
}

