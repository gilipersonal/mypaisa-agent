/** How the service worker answers a request (ARCHITECTURE §8.4: it caches the shell only).
 * - `network`: the api (/v1), the association file (/.well-known), another origin, any write, any file that is not
 *   part of the shell. Always the network; nothing is stored.
 * - `asset`: a file of the built shell, from the cache (query strings ignored), else the network.
 * - `page`: a navigation to a route of the single-page app. The network first, so a deploy is seen at once; the cached
 *   index.html only when the network fails (offline). */
export type Route = 'network' | 'asset' | 'page';

export interface RequestLike {
	method: string;
	mode: string;
	url: URL;
}

const NEVER_CACHED = ['/v1', '/.well-known'];

function isUnder(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function route(request: RequestLike, origin: string, shell: readonly string[]): Route {
	const { pathname } = request.url;
	if (request.method !== 'GET' || request.url.origin !== origin) return 'network';
	if (NEVER_CACHED.some((p) => isUnder(pathname, p))) return 'network';
	if (shell.includes(pathname)) return 'asset';
	if (request.mode === 'navigate' && !pathname.includes('.')) return 'page';
	return 'network';
}

/** The files the worker stores at install: the built app and the static files, never the association file, plus the
 * page itself (index.html, the fallback for every route). */
export function shellFiles(paths: readonly string[]): string[] {
	const files = paths.filter((p) => !NEVER_CACHED.some((n) => isUnder(p, n)));
	return [...new Set([...files, '/index.html'])];
}
