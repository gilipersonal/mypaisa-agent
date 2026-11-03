/** The one QueryClient (MA-194): reads are fresh for 30 s, retried twice with backoff, and never retried on a 4xx
 * the api meant (a missing record stays missing), except a timeout (408) or too many requests (429), which pass.
 * The SSE stream writes into this cache from MA-30 on. */
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '#lib/api/client.ts';

export function shouldRetry(failureCount: number, error: unknown): boolean {
	const transient = error instanceof ApiError && (error.status === 408 || error.status === 429);
	if (error instanceof ApiError && error.status >= 400 && error.status < 500 && !transient) return false;
	return failureCount < 2;
}

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: true },
			mutations: { retry: false }
		}
	});
}
