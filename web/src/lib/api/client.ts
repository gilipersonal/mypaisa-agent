/** The api client both doors use (MA-194, MA-266): typed from the backend's OpenAPI schema (`api-types.d.ts`, generated
 * by `pnpm --dir web api:types` from backend/openapi.json), so a renamed field fails svelte-check, not a member's screen.
 * The base URL is the environment's api host, `api(-dev).mypaisapp.com` (ARCHITECTURE §17.2), set with MA-266; until
 * then it is empty, so in development the app calls /v1 on its own origin and Vite proxies it to the local backend. */
import createClient, { type Client } from 'openapi-fetch';
import type { paths } from '../api-types.d.ts';

export type ApiClient = Client<paths>;

export function createApiClient(baseUrl = '', fetchImpl: typeof fetch = (...a) => fetch(...a)): ApiClient {
	return createClient<paths>({ baseUrl, fetch: fetchImpl });
}

/** An error the api answered with: its RFC 9457 problem, or the bare status when the body was not one. */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		detail: string
	) {
		super(detail);
		this.name = 'ApiError';
	}
}

interface Problem {
	type?: string;
	detail?: string;
}

export function toApiError(status: number, body: unknown): ApiError {
	const p = (typeof body === 'object' && body !== null ? body : {}) as Problem;
	const code = p.type?.split('#')[1] ?? `http_${String(status)}`;
	return new ApiError(status, code, p.detail ?? `The request failed (${String(status)}).`);
}
