import { useDerivativeMarketStream } from "../hooks/useDerivativeMarkets";
import { useDerivativeTradeStream } from "../hooks/useDerivativeMarketsSummary";
import { useManagedStream } from "../hooks/useStream";

/**
 * Individual stream components - each manages a single stream's lifecycle.
 * Add new streams here as separate components, then include them in StreamManager.
 */

function DerivativeMarketStream() {
	useManagedStream(useDerivativeMarketStream);
	return null;
}

function DerivativeTradeStream() {
	useManagedStream(useDerivativeTradeStream);
	return null;
}

/**
 * StreamManager - renders all active streams.
 * To add a new stream:
 * 1. Create a stream hook in the appropriate hooks file (with autoStart: false)
 * 2. Create a stream component above that uses useManagedStream
 * 3. Add the component to the list below
 */
export function StreamManager() {
	return (
		<>
			<DerivativeMarketStream />
			<DerivativeTradeStream />
		</>
	);
}
