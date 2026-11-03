// The service worker caches the shell only (ARCHITECTURE §8.4): the built app and the static files. A member's data,
// /v1/* and /.well-known/* always go to the network, and nothing else is stored.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';
import { isShellRequest } from '#lib/sw/shell.ts';

const CACHE = `shell-${version}`;
const SHELL = [...immutable, ...assets].map((file) => new URL(file.path, self.location.origin).pathname);

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

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (!isShellRequest(event.request.method, url, self.location.origin, SHELL)) return;
	event.respondWith(
		caches.match(event.request).then(async (hit) => hit ?? (await caches.match('/index.html')) ?? fetch(event.request))
	);
});
