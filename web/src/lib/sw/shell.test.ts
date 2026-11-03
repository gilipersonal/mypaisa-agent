import { describe, expect, it } from 'vitest';
import { isShellRequest } from './shell';

const origin = 'https://dashboard.mypaisapp.com';
const shell = ['/_app/immutable/entry/start.js', '/icons/icon.svg'];
const at = (path: string, base = origin) => new URL(path, base);

describe('the service worker caches the shell only', () => {
	it('serves a shell file and a route from the cache', () => {
		expect(isShellRequest('GET', at('/_app/immutable/entry/start.js'), origin, shell)).toBe(true);
		expect(isShellRequest('GET', at('/budget'), origin, shell)).toBe(true);
	});

	it('never caches the api, the association file, another origin, a write or an unknown file', () => {
		expect(isShellRequest('GET', at('/v1/health'), origin, shell)).toBe(false);
		expect(isShellRequest('GET', at('/.well-known/apple-app-site-association'), origin, shell)).toBe(false);
		expect(isShellRequest('GET', at('/x', 'https://fonts.googleapis.com'), origin, shell)).toBe(false);
		expect(isShellRequest('POST', at('/budget'), origin, shell)).toBe(false);
		expect(isShellRequest('GET', at('/secret.json'), origin, shell)).toBe(false);
	});
});
