import { atom, map } from "nanostores";

export type StreamStatus = "active" | "inactive" | "error";

export type StreamInfo = {
	name: string;
	status: StreamStatus;
	startedAt: Date | null;
	lastMessageAt: Date | null;
	messageCount: number;
	error?: string;
};

// Track all registered streams by their unique key
export const $streams = map<Record<string, StreamInfo>>({});

// Set of currently active stream keys (for quick lookup)
export const $activeStreamKeys = atom<Set<string>>(new Set());

export function registerStream(key: string, name: string) {
	$streams.setKey(key, {
		name,
		status: "inactive",
		startedAt: null,
		lastMessageAt: null,
		messageCount: 0,
	});
}

export function setStreamActive(key: string) {
	const stream = $streams.get()[key];
	if (stream) {
		$streams.setKey(key, {
			...stream,
			status: "active",
			startedAt: new Date(),
		});
		$activeStreamKeys.set(new Set([...$activeStreamKeys.get(), key]));
	}
}

export function setStreamInactive(key: string) {
	const stream = $streams.get()[key];
	if (stream) {
		$streams.setKey(key, {
			...stream,
			status: "inactive",
		});
		const keys = $activeStreamKeys.get();
		keys.delete(key);
		$activeStreamKeys.set(new Set(keys));
	}
}

export function setStreamError(key: string, error: string) {
	const stream = $streams.get()[key];
	if (stream) {
		$streams.setKey(key, {
			...stream,
			status: "error",
			error,
		});
		const keys = $activeStreamKeys.get();
		keys.delete(key);
		$activeStreamKeys.set(new Set(keys));
	}
}

export function updateStreamMessage(key: string) {
	const stream = $streams.get()[key];
	if (stream) {
		$streams.setKey(key, {
			...stream,
			lastMessageAt: new Date(),
			messageCount: stream.messageCount + 1,
		});
	}
}

export function isStreamActive(key: string): boolean {
	return $activeStreamKeys.get().has(key);
}
