/** The TanStack Query definitions over the api client, shared by both doors (MA-165): one place for each query's key and
 * its fetch. Plain option objects with no framework import, so Svelte Query and React Query take the same definitions. */
import type { components } from '../api-types.d.ts';
import { emptyTimeline, type Timeline } from '../chat/timeline.ts';
import type { BudgetForecast } from '../wealth/forecast.ts';
import type { DisplayCurrency, InvestedOwed, Overview, OwnOwe } from '../wealth/overview.ts';
import type { Horizon, MoneyBasis, Projection, ProjectionCorrection } from '../wealth/projection.ts';
import type { PlanChange, Plans } from '../wealth/plans.ts';
import { toApiError, type ApiClient } from './client.ts';
import type { WealthSource } from './wealth.ts';

export type Liveness = components['schemas']['LivenessOut'];
export type Readiness = components['schemas']['ReadinessOut'];

export const keys = {
	health: ['health'] as const,
	ready: ['health', 'ready'] as const
};

/** The chat's conversation (MA-199): filled by the stream's frames, never fetched, so it never goes stale. */
export const chatKeys = { timeline: ['chat', 'timeline'] as const };

export function chatTimelineQuery() {
	return {
		queryKey: chatKeys.timeline,
		queryFn: (): Promise<Timeline> => Promise.resolve(emptyTimeline()),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY
	};
}

/** The household's wealth (MA-208): everything under `all` is refetched when the stream says `records.changed`. */
export const wealthKeys = {
	all: ['wealth'] as const,
	overview: (view: string, currency: DisplayCurrency) => ['wealth', 'overview', view, currency] as const,
	ownOwe: (view: string, currency: DisplayCurrency) => ['wealth', 'own-owe', view, currency] as const,
	investedOwed: (view: string, currency: DisplayCurrency) => ['wealth', 'invested-owed', view, currency] as const,
	projection: (horizon: Horizon, money: MoneyBasis, currency: DisplayCurrency) =>
		['wealth', 'projection', horizon, money, currency] as const,
	correctProjection: ['wealth', 'projection', 'correct'] as const,
	plans: (horizon: Horizon, money: MoneyBasis, currency: DisplayCurrency) =>
		['wealth', 'plans', horizon, money, currency] as const,
	changePlan: ['wealth', 'plans', 'change'] as const,
	budgetForecast: (horizon: Horizon, money: MoneyBasis, currency: DisplayCurrency, year: number | undefined) =>
		['wealth', 'forecast', horizon, money, currency, year ?? 'first'] as const
};

export function overviewQuery(source: WealthSource, view: string, currency: DisplayCurrency) {
	return {
		queryKey: wealthKeys.overview(view, currency),
		queryFn: (): Promise<Overview> => source.overview(view, currency)
	};
}

/** Home's What we own and owe (MA-359): its own query, so the card loads and fails by itself. */
export function ownOweQuery(source: WealthSource, view: string, currency: DisplayCurrency) {
	return {
		queryKey: wealthKeys.ownOwe(view, currency),
		queryFn: (): Promise<OwnOwe> => source.ownOwe(view, currency)
	};
}

/** Home's Invested against owed (MA-359): its own query, so the card loads and fails by itself. */
export function investedOwedQuery(source: WealthSource, view: string, currency: DisplayCurrency) {
	return {
		queryKey: wealthKeys.investedOwed(view, currency),
		queryFn: (): Promise<InvestedOwed> => source.investedOwed(view, currency)
	};
}

/** The Projection's Net worth view (MA-224): one entry for each horizon, money and currency a member looks at. */
export function projectionQuery(source: WealthSource, horizon: Horizon, money: MoneyBasis, currency: DisplayCurrency) {
	return {
		queryKey: wealthKeys.projection(horizon, money, currency),
		queryFn: (): Promise<Projection> => source.projection(horizon, money, currency)
	};
}

/** An admin's correction in place on the Projection. Whoever runs it reads the wealth again once it is kept
 * (`wealthKeys.all`), as a `records.changed` frame does. */
export function correctProjectionMutation(source: WealthSource) {
	return {
		mutationKey: wealthKeys.correctProjection,
		mutationFn: (correction: ProjectionCorrection): Promise<void> => source.correctProjection(correction)
	};
}

/** The Projection's Plans view (MA-222): one entry for each horizon, money and currency a member looks at. */
export function plansQuery(source: WealthSource, horizon: Horizon, money: MoneyBasis, currency: DisplayCurrency) {
	return {
		queryKey: wealthKeys.plans(horizon, money, currency),
		queryFn: (): Promise<Plans> => source.plans(horizon, money, currency)
	};
}

/** An admin's pause, resume or end of a plan item. Whoever runs it reads the wealth again once it is kept. */
export function changePlanMutation(source: WealthSource) {
	return {
		mutationKey: wealthKeys.changePlan,
		mutationFn: (change: PlanChange): Promise<void> => source.changePlan(change)
	};
}

/** The Projection's Budget forecast view (MA-262): one entry for each horizon, money, currency and year looked at. */
export function budgetForecastQuery(
	source: WealthSource,
	horizon: Horizon,
	money: MoneyBasis,
	currency: DisplayCurrency,
	year?: number
) {
	return {
		queryKey: wealthKeys.budgetForecast(horizon, money, currency, year),
		queryFn: (): Promise<BudgetForecast> => source.budgetForecast(horizon, money, currency, year)
	};
}

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
