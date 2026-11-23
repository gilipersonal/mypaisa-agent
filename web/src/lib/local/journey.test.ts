import { afterEach, describe, expect, it, vi } from 'vitest';
import { runJourney, type OpenStream } from './journey.ts';

const delta = (text: string) => `event: delta\ndata: ${JSON.stringify({ text })}\n\n`;
const message = (id: string) =>
	`id: 1\nevent: message\ndata: ${JSON.stringify({ id, text: 'Hello there', cards: [{}] })}\n\n`;

function stubFetch(status = 200) {
	const fake = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ token: 'local.owner_arun' }), { status })));
	vi.stubGlobal('fetch', fake);
	return fake;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('runJourney', () => {
	it('signs in, sends the message and returns the streamed reply', async () => {
		const fake = stubFetch();
		const open: OpenStream = (url, headers, onChunk) => {
			expect(url).toBe('http://x/v1/stream');
			expect(headers.Authorization).toBe('Bearer local.owner_arun');
			onChunk(delta('Hello '));
			onChunk(delta('there'));
			onChunk(message('c1'));
			return Promise.resolve();
		};
		const result = await runJourney('http://x', 'owner_arun', 'c1', open);
		expect(result).toEqual({ reply: 'Hello there', streamed: 'Hello there', cards: 1 });
		expect(fake.mock.calls.map((call) => (call as unknown as [string])[0])).toEqual([
			'http://x/v1/auth/local',
			'http://x/v1/chat/messages'
		]);
	});

	it("ignores another message's reply", async () => {
		stubFetch();
		const open: OpenStream = (_url, _headers, onChunk) => {
			onChunk(message('someone-else'));
			onChunk(message('c1'));
			return Promise.resolve();
		};
		await expect(runJourney('http://x', 'owner_arun', 'c1', open)).resolves.toMatchObject({ cards: 1 });
	});

	it('fails when sign-in is refused', async () => {
		stubFetch(401);
		await expect(runJourney('http://x', 'nobody', 'c1', () => Promise.resolve())).rejects.toThrow('answered 401');
	});

	it('fails when the stream cannot open', async () => {
		stubFetch();
		const open: OpenStream = () => Promise.reject(new Error('no stream'));
		await expect(runJourney('http://x', 'owner_arun', 'c1', open)).rejects.toThrow('no stream');
	});

	it('gives up when no reply arrives', async () => {
		stubFetch();
		await expect(runJourney('http://x', 'owner_arun', 'c1', () => Promise.resolve(), 5)).rejects.toThrow(
			'no reply arrived'
		);
	});
});
