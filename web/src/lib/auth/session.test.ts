import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { StubSession, browserSession, browserStorage } from './session.ts';

function memory(): KeyValue & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (k) => data.get(k) ?? null,
		setItem: (k, v) => void data.set(k, v),
		removeItem: (k) => void data.delete(k)
	};
}

const blocked: KeyValue = {
	getItem: () => {
		throw new Error('blocked');
	},
	setItem: () => {
		throw new Error('blocked');
	},
	removeItem: () => {
		throw new Error('blocked');
	}
};

const at = new Date('2026-10-26T09:30:00Z');

describe('the stubbed session', () => {
	it('starts signed out, and signs in with the member, the way and the time', () => {
		const store = memory();
		const s = new StubSession(store);
		expect(s.signedIn).toBe(false);
		expect(s.current()).toBeUndefined();
		s.signIn('apple', 'arun', at);
		expect(s.signedIn).toBe(true);
		expect(s.current()).toEqual({ member: 'arun', way: 'apple', at: '2026-10-26T09:30:00.000Z' });
		// kept in the browser, so a new page finds it
		expect(new StubSession(store).current()?.member).toBe('arun');
	});

	it('signs in as Arun when no member is named', () => {
		const s = new StubSession(memory());
		s.signIn('google');
		expect(s.current()?.member).toBe('arun');
	});

	it('makes the passkey offer once per browser, after the first Apple or Google sign-in', () => {
		const store = memory();
		const s = new StubSession(store);
		expect(s.signIn('apple', 'arun', at)).toEqual({ offer: true });
		expect(s.offered()).toBe(true);
		s.signOut();
		// a second sign-in skips it, on a new page too
		expect(new StubSession(store).signIn('google', 'arun', at)).toEqual({ offer: false });
	});

	it('never offers a passkey to a passkey sign-in, and does not use the offer up', () => {
		const s = new StubSession(memory());
		expect(s.signIn('passkey', 'arun', at)).toEqual({ offer: false });
		expect(s.offered()).toBe(false);
		expect(s.signIn('apple', 'arun', at)).toEqual({ offer: true });
	});

	it('signs out, and keeps the offer made', () => {
		const store = memory();
		const s = new StubSession(store);
		s.signIn('apple', 'arun', at);
		s.signOut();
		expect(s.signedIn).toBe(false);
		expect(store.data.has('mp.session')).toBe(false);
		expect(s.offered()).toBe(true);
	});

	it('lets a page in on a dev switch without storing a session, until sign-out', () => {
		const store = memory();
		const s = new StubSession(store);
		s.passForPage();
		expect(s.signedIn).toBe(true);
		expect(s.current()).toBeUndefined();
		expect(store.data.size).toBe(0);
		expect(new StubSession(store).signedIn).toBe(false);
		s.signOut();
		expect(s.signedIn).toBe(false);
	});

	it('still works when storage is blocked, for the life of the page', () => {
		const s = new StubSession(blocked);
		expect(s.signedIn).toBe(false);
		expect(s.signIn('apple', 'arun', at)).toEqual({ offer: true });
		expect(s.current()?.way).toBe('apple');
		expect(s.signIn('apple', 'arun', at)).toEqual({ offer: false });
		s.signOut();
		expect(s.current()).toBeUndefined();
	});

	it('works with no storage at all', () => {
		const s = new StubSession();
		s.signIn('google', 'asha', at);
		expect(s.current()?.member).toBe('asha');
	});

	it.each([
		['not JSON', '{'],
		['not an object', '"arun"'],
		['null', 'null'],
		['no member', JSON.stringify({ member: '', way: 'apple', at: 'x' })],
		['an unknown way', JSON.stringify({ member: 'arun', way: 'password', at: 'x' })],
		['no time', JSON.stringify({ member: 'arun', way: 'apple' })]
	])('reads a stored session that is %s as signed out', (_name, raw) => {
		const store = memory();
		store.setItem('mp.session', raw);
		expect(new StubSession(store).current()).toBeUndefined();
		expect(new StubSession(store).signedIn).toBe(false);
	});
});

describe("the browser's session", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses the window’s storage', () => {
		const store = memory();
		vi.stubGlobal('window', { localStorage: store });
		expect(browserStorage()).toBe(store);
	});

	it('has no storage when reading it throws', () => {
		vi.stubGlobal('window', {
			get localStorage(): Storage {
				throw new Error('blocked');
			}
		});
		expect(browserStorage()).toBeUndefined();
	});

	it('is one session for the page', () => {
		vi.stubGlobal('window', { localStorage: memory() });
		expect(browserSession()).toBe(browserSession());
	});
});
