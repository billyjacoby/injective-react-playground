import { useEffect, useRef } from "react";
import { useDerivativeMarketStream } from "../hooks/useDerivatives";
export function StreamManager() {
	const { start, stop } = useDerivativeMarketStream();
	const isStarted = useRef(false);
	useEffect(() => {
		if (!isStarted.current) {
			start();
			isStarted.current = true;
		}
		return () => {
			if (isStarted.current) {
				stop();
				isStarted.current = false;
			}
		};
	}, [start, stop]);
	return null;
}
