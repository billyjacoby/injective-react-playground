import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";
import { RpcError } from "@protobuf-ts/runtime-rpc";
import React from "react";
import type { StreamHook, UseStreamOptions, UseStreamReturn } from "./types";

export type { StreamConfig, StreamHook } from "./types";

function handleStreamErrors(error: Error, onError?: (error: Error) => void) {
	if (error.name === "AbortError" || error.message.includes("[Abort]")) {
		// AbortError is expected on cleanup
		return;
	}
	if (error.message.includes("BodyStreamBuffer was aborted")) {
		return console.warn("⚠️  | BodyStreamBuffer was aborted");
	}
	if (error instanceof RpcError) {
		return console.warn("⚠️  | RPC Error:", error.message);
	}

	return onError?.(error);
}

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
			if (error instanceof Error) {
				handleStreamErrors(error, onError);
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
			abortControllerRef.current.abort("[Abort]: unmounted");
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

/**
 * Wraps a stream hook and ensures it starts exactly once on mount
 * and stops on unmount. Use this in StreamManager to avoid the
 * boilerplate of managing refs and effects for each stream.
 */
export function useManagedStream(useStreamHook: StreamHook, enabled = true) {
	const { start, stop, isActive } = useStreamHook();
	const hasStartedRef = React.useRef(false);

	React.useEffect(() => {
		if (enabled && !hasStartedRef.current) {
			start();
			hasStartedRef.current = true;
		}

		return () => {
			if (hasStartedRef.current) {
				stop();
				hasStartedRef.current = false;
			}
		};
	}, [enabled, start, stop]);

	return { isActive };
}
