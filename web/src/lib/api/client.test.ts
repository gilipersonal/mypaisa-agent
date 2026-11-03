import { describe, expect, it } from 'vitest';
import { ApiError, createApiClient, toApiError } from './client';
import { livenessQuery, readinessQuery } from './queries';
import { createQueryClient, shouldRetry } from '#lib/query/client.ts';

function fakeFetch(status: number, body: unknown, contentType = 'application/json'): typeof fetch {
	return () =>
		Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } }));
}

/** Runs a query definition's fetch, as TanStack Query would. */
async function run<T>(options: { queryFn?: unknown }): Promise<T> {
	const fn = options.queryFn as () => Promise<T>;
	return fn();
}

describe('the api client and its queries', () => {
	it('reads the liveness', async () => {
		const api = createApiClient(
			'http://api.test',
			fakeFetch(200, { status: 'ok', version: '0.1.0', environment: 'dev' })
		);
		await expect(run(livenessQuery(api))).resolves.toEqual({ status: 'ok', version: '0.1.0', environment: 'dev' });
	});

	it('turns a problem into an ApiError with its code', async () => {
		const problem = { type: 'about:blank#internal', title: 'Internal Server Error', status: 500, detail: 'Logged.' };
		const api = createApiClient('http://api.test', fakeFetch(500, problem, 'application/problem+json'));
		const err = await run(livenessQuery(api)).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect(err).toMatchObject({ status: 500, code: 'internal', message: 'Logged.' });
	});

	it('takes a 503 readiness as an answer naming the failed check', async () => {
		const body = {
			status: 'not_ready',
			checks: [{ name: 'table', status: 'fail', duration_ms: 3, detail: 'timed out' }]
		};
		const api = createApiClient('http://api.test', fakeFetch(503, body));
		await expect(run(readinessQuery(api))).resolves.toEqual(body);
	});

	it('throws on any other readiness failure', async () => {
		const api = createApiClient('http://api.test', fakeFetch(500, { detail: 'down' }));
		await expect(run(readinessQuery(api))).rejects.toBeInstanceOf(ApiError);
	});

	it('reads a ready answer', async () => {
		const api = createApiClient('http://api.test', fakeFetch(200, { status: 'ready', checks: [] }));
		await expect(run(readinessQuery(api))).resolves.toEqual({ status: 'ready', checks: [] });
	});
});

describe('toApiError', () => {
	it('falls back to the status when the body is no problem', () => {
		expect(toApiError(502, 'Bad gateway')).toMatchObject({ code: 'http_502', message: 'The request failed (502).' });
		expect(toApiError(404, null)).toMatchObject({ status: 404, code: 'http_404' });
	});
});

describe('the query client', () => {
	it('never retries a 4xx the api meant, and retries anything else twice', () => {
		expect(shouldRetry(0, new ApiError(404, 'not_found', 'x'))).toBe(false);
		expect(shouldRetry(0, new ApiError(503, 'unavailable', 'x'))).toBe(true);
		expect(shouldRetry(1, new Error('network'))).toBe(true);
		expect(shouldRetry(2, new Error('network'))).toBe(false);
	});

	it('is built with those defaults', () => {
		const qc = createQueryClient();
		expect(qc.getDefaultOptions().queries?.staleTime).toBe(30_000);
		expect(qc.getDefaultOptions().mutations?.retry).toBe(false);
	});
});
