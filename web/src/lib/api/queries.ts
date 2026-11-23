/** The TanStack Query definitions over the api client, shared by both doors (MA-165): one place for each query's key and
 * its fetch. Plain option objects with no framework import, so Svelte Query and React Query take the same definitions. */
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
	return {
		queryKey: keys.health,
		queryFn: async (): Promise<Liveness> => {
			const { data, error, response } = await api.GET('/v1/health');
			if (data === undefined) throw toApiError(response.status, error);
			return data;
		}
	};
}

export function readinessQuery(api: ApiClient) {
	return {
		queryKey: keys.ready,
		// 503 is an answer, not a failure: the body names the check that failed.
		queryFn: async (): Promise<Readiness> => {
			const { data, error, response } = await api.GET('/v1/health/ready');
			if (data !== undefined) return data;
			if (response.status === 503 && isReadiness(error)) return error;
			throw toApiError(response.status, error);
		}
	};
}
