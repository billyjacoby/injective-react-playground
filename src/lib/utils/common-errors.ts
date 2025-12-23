import { GaslessClientConfig } from "../gasless/types";

export function handleCommonErrors(config: GaslessClientConfig) {
	if (!window.ethereum) {
		return "No wallet connected";
	}

	if (!config.policyId) {
		return "Missing policy ID";
	}

	return null;
}
