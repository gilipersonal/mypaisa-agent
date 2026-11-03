// The service worker caches the shell only (ARCHITECTURE §8.4): the built app, the static files and the page itself.
// A member's data (/v1), the association file (/.well-known) and anything else always go to the network; a page is
// fetched from the network first, and the cached index.html is the fallback only offline. See #lib/sw/shell.ts.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';
import { route, shellFiles } from '#lib/sw/shell.ts';

const CACHE = `shell-${version}`;
const SHELL = shellFiles([...immutable, ...assets].map((file) => new URL(file.path, self.location.origin).pathname));

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(SHELL))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

async function fromCache(request: RequestInfo, fallback: () => Promise<Response>): Promise<Response> {
	return (await caches.match(request, { ignoreSearch: true })) ?? fallback();
}

self.addEventListener('fetch', (event) => {
	const request = event.request;
	const kind = route(
		{ method: request.method, mode: request.mode, url: new URL(request.url) },
		self.location.origin,
		SHELL
	);
	if (kind === 'asset') event.respondWith(fromCache(request, () => fetch(request)));
	if (kind === 'page') {
		event.respondWith(
			fetch(request).catch(() => fromCache('/index.html', () => Promise.reject(new Error('offline, no cached page'))))
		);
	}
});
