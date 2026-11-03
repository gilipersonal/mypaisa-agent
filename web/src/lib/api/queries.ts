/** TanStack Query definitions over the api client: one place for each query's key and its fetch, shared by the web
 * app and the iOS app's React Native shell. */
import { queryOptions } from '@tanstack/svelte-query';
import { toApiError, type ApiClient } from './client';
import type { components } from '../api-types';

export type Liveness = components['schemas']['LivenessOut'];
export type Readiness = components['schemas']['ReadinessOut'];

export const keys = {
	health: ['health'] as const,
	ready: ['health', 'ready'] as const
};

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
			if (response.status === 503) return error;
			throw toApiError(response.status, error);
		}
	});
}
