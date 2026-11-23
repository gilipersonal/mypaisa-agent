import { describe, expect, it } from 'vitest';
import { route, shellFiles, type RequestLike } from './shell.ts';

const origin = 'https://dashboard.mypaisapp.com';
const shell = ['/_app/immutable/entry/start.js', '/icons/icon.svg', '/index.html'];
const req = (path: string, mode = 'cors', method = 'GET', base = origin): RequestLike => ({
	method,
	mode,
	url: new URL(path, base)
});

describe('how the service worker answers', () => {
	it('serves a shell file from the cache, its query string ignored', () => {
		expect(route(req('/_app/immutable/entry/start.js'), origin, shell)).toBe('asset');
		expect(route(req('/_app/immutable/entry/start.js?v=1'), origin, shell)).toBe('asset');
	});

	it('answers a navigation to a route as the page (network first, cached index.html offline)', () => {
		expect(route(req('/budget', 'navigate'), origin, shell)).toBe('page');
		expect(route(req('/', 'navigate'), origin, shell)).toBe('page');
	});

	it('never answers a request that is not a navigation with the page', () => {
		expect(route(req('/auth/callback'), origin, shell)).toBe('network');
		expect(route(req('/avatar', 'no-cors'), origin, shell)).toBe('network');
	});

	it('always sends the api, the association file, another origin, a write and an unknown file to the network', () => {
		for (const path of ['/v1', '/v1/health', '/.well-known', '/.well-known/apple-app-site-association']) {
			expect(route(req(path, 'navigate'), origin, shell)).toBe('network');
		}
		expect(route(req('/x', 'navigate', 'GET', 'https://fonts.googleapis.com'), origin, shell)).toBe('network');
		expect(route(req('/budget', 'navigate', 'POST'), origin, shell)).toBe('network');
		expect(route(req('/secret.json'), origin, shell)).toBe('network');
	});
});

describe('what the service worker stores', () => {
	it('stores the shell and the page, never the association file', () => {
		const files = shellFiles(['/_app/a.js', '/.well-known/apple-app-site-association', '/icons/icon.svg']);
		expect(files).toEqual(['/_app/a.js', '/icons/icon.svg', '/index.html']);
	});
});
