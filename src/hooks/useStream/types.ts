import type { RpcOptions, ServerStreamingCall } from "@protobuf-ts/runtime-rpc";

// Stream function signature
export type StreamFunction<
	TRequest extends object,
	TResponse extends object,
> = (
	input: TRequest,
	options?: RpcOptions,
) => ServerStreamingCall<TRequest, TResponse>;

// Infer response type from stream function
export type InferStreamResponse<T> = T extends StreamFunction<object, infer R>
	? R
	: never;

// Infer request type from stream function
export type InferStreamRequest<T> = T extends StreamFunction<infer R, object>
	? R
	: never;

export type UseStreamOptions<
	TRequest extends object,
	TResponse extends object,
> = {
	streamFn: StreamFunction<TRequest, TResponse>;
	request: TRequest;
	onData: (data: TResponse) => void;
	onError?: (error: Error) => void;
	enabled?: boolean;
	/** If true, stream starts automatically on mount. Default: true */
	autoStart?: boolean;
};

export type UseStreamReturn = {
	/** Start the stream manually */
	start: () => void;
	/** Stop the stream manually */
	stop: () => void;
	/** Whether the stream is currently active */
	isActive: boolean;
};
