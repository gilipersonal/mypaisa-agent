/** The scripted journey both doors run on the local stack (MA-198, ARCHITECTURE §17): sign in, say hello, read the
 * reply as it streams. Each door passes its own transport; nothing here reaches a deployed build. */
import { createSseParser, type StreamFrame } from '#lib/api/stream.ts';

export interface JourneyResult {
	reply: string;
	/** The words as they arrived, before the finished message. */
	streamed: string;
	cards: number;
}

/** Opens the stream and feeds it to `onChunk` until `signal` aborts, or rejects if it cannot open. */
export type OpenStream = (
	url: string,
	headers: Record<string, string>,
	onChunk: (chunk: string) => void,
	signal: AbortSignal
) => Promise<void>;

interface FinishedMessage {
	text: string;
	cards: unknown[];
}

async function postJson(base: string, path: string, body: unknown, token?: string): Promise<Response> {
	const response = await fetch(`${base}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
		body: JSON.stringify(body)
	});
	if (!response.ok) throw new Error(`${path} answered ${String(response.status)}`);
	return response;
}

export async function runJourney(
	base: string,
	member: string,
	clientId: string,
	open: OpenStream,
	timeoutMs = 15_000
): Promise<JourneyResult> {
	const session = (await (await postJson(base, '/v1/auth/local', { member })).json()) as { token: string };
	const headers = { Authorization: `Bearer ${session.token}` };
	const stop = new AbortController();
	let streamed = '';
	return new Promise<JourneyResult>((resolve, reject) => {
		const timer = setTimeout(() => {
			stop.abort();
			reject(new Error('no reply arrived'));
		}, timeoutMs);
		const finish = (result: JourneyResult) => {
			clearTimeout(timer);
			stop.abort();
			resolve(result);
		};
		const parse = createSseParser((frame: StreamFrame) => {
			if (frame.event === 'delta') streamed += (frame.data as { text: string }).text;
			if (frame.event === 'message' && (frame.data as { id: string }).id === clientId) {
				const message = frame.data as FinishedMessage;
				finish({ reply: message.text, streamed, cards: message.cards.length });
			}
		});
		const fail = (error: unknown) => {
			clearTimeout(timer);
			reject(error instanceof Error ? error : new Error(String(error)));
		};
		open(`${base}/v1/stream`, headers, parse, stop.signal).catch((error: unknown) => {
			if (!stop.signal.aborted) fail(error);
		});
		postJson(base, '/v1/chat/messages', { client_id: clientId, text: 'Hello' }, session.token).catch(fail);
	});
}
