import { describe, expect, it } from 'vitest';
import { createSseParser, type StreamFrame } from './stream.ts';

function parseAll(...chunks: string[]): StreamFrame[] {
	const frames: StreamFrame[] = [];
	const feed = createSseParser((frame) => frames.push(frame));
	chunks.forEach(feed);
	return frames;
}

describe('createSseParser', () => {
	it('reads an id, an event and its data', () => {
		expect(parseAll('id: 3\nevent: message\ndata: {"a":1}\n\n')).toEqual([{ id: 3, event: 'message', data: { a: 1 } }]);
	});

	it('holds a frame split across chunks until it is whole', () => {
		expect(parseAll('event: del', 'ta\ndata: {"te', 'xt":"hi"}\n', '\n')).toEqual([
			{ id: undefined, event: 'delta', data: { text: 'hi' } }
		]);
	});

	it('reads several frames from one chunk, in order', () => {
		expect(parseAll('data: 1\n\ndata: 2\n\n').map((f) => f.data)).toEqual([1, 2]);
	});

	it('skips heartbeats and retries, which carry nothing for a door', () => {
		expect(parseAll(': heartbeat\n\nretry: 2000\n\n')).toEqual([]);
	});

	it('reads CRLF line ends', () => {
		expect(parseAll('data: 1\r\n\r\n')).toHaveLength(1);
	});

	it('joins a frame with several data lines', () => {
		expect(parseAll('data: [1,\ndata: 2]\n\n')[0]?.data).toEqual([1, 2]);
	});
});
