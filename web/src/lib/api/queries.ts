/** The web app's TanStack Query definitions over the api client: one place for each query's key and its fetch. The iOS
 * app's React Native shell shares the client and these keys, and builds its own options with React Query (MA-165). */
import { queryOptions } from '@tanstack/svelte-query';
import type { components } from '../api-types.d.ts';
import { toApiError, type ApiClient } from './client.ts';

export type Liveness = components['schemas']['LivenessOut'];
export type Readiness = components['schemas']['ReadinessOut'];

export const keys = {
	health: ['health'] as const,
	ready: ['health', 'ready'] as const
};

/** A 503 is an answer only when its body is the api's readiness report, not a CDN's error page. */
function isReadiness(body: unknown): body is Readiness {
	return typeof body === 'object' && body !== null && 'checks' in body && 'status' in body;
}

export function livenessQuery(api: ApiClient) {
	return queryOptions({
		queryKey: keys.health,
		queryFn: async (): Promise<Liveness> => {
			const { data, error, response } = await api.GET('/v1/health');
			if (data === undefined) throw toApiError(response.status, error);
			return data;
		}
	});
}

export function readinessQuery(api: ApiClient) {
	return queryOptions({
		queryKey: keys.ready,
		// 503 is an answer, not a failure: the body names the check that failed.
		queryFn: async (): Promise<Readiness> => {
			const { data, error, response } = await api.GET('/v1/health/ready');
			if (data !== undefined) return data;
			if (response.status === 503 && isReadiness(error)) return error;
			throw toApiError(response.status, error);
		}
	});
}
