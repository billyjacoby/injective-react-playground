import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";

export function getSafeWallet(eoaAddress: string) {
	const config = getContractConfig(137); // Polygon
	const safeAddress = deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);

	return safeAddress;
}
