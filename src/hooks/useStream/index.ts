import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";
import React from "react";
import type { UseStreamOptions, UseStreamReturn } from "./types";

function consumeStream<TResponse extends object>(
	streamCall: ServerStreamingCall<object, TResponse>,
	onData: (data: TResponse) => void,
	onError?: (error: Error) => void,
	onComplete?: () => void,
) {
	(async () => {
		try {
			for await (const response of streamCall.responses) {
				onData(response);
			}
			onComplete?.();
		} catch (error) {
			// AbortError is expected on cleanup
			if ((error as Error)?.name !== "AbortError") {
				if (onError) {
					onError(error as Error);
				} else {
					console.error("❌ | Stream error:", error);
				}
			}
			onComplete?.();
		}
	})();
}

export function useStream<TRequest extends object, TResponse extends object>(
	options: UseStreamOptions<TRequest, TResponse>,
): UseStreamReturn {
	const {
		streamFn,
		request,
		onData,
		onError,
		enabled = true,
		autoStart = true,
	} = options;

	const [isActive, setIsActive] = React.useState(false);
	const abortControllerRef = React.useRef<AbortController | null>(null);

	const stop = React.useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
			setIsActive(false);
		}
	}, []);

	const start = React.useCallback(() => {
		if (!enabled) return;
		// Stop any existing stream before starting a new one
		if (abortControllerRef.current) {
			stop();
		}

		const abortController = new AbortController();
		abortControllerRef.current = abortController;
		setIsActive(true);

		const streamCall = streamFn(request, {
			abort: abortController.signal,
		});

		consumeStream(streamCall, onData, onError, () => {
			// Only update state if this is still the active controller
			if (abortControllerRef.current === abortController) {
				abortControllerRef.current = null;
				setIsActive(false);
			}
		});
	}, [streamFn, request, onData, onError, enabled, stop]);

	// Auto-start on mount if enabled
	React.useEffect(() => {
		if (autoStart && enabled) {
			start();
		}

		return () => {
			stop();
		};
	}, [autoStart, enabled, start, stop]);

	return { start, stop, isActive };
}
