import { describe, expect, it } from 'vitest';
import { SWITCHED, WAY_NAMES, momentOf, navyOf, takesFocus, waysLive, type Moment } from './door.ts';

describe('the review switches', () => {
	it.each(SWITCHED)('?state=%s shows that moment', (m) => {
		expect(momentOf(`?state=${m}`)).toBe(m);
	});

	it('anything else is the sign-in page itself', () => {
		expect(momentOf('')).toBe('ready');
		expect(momentOf('?state=ready')).toBe('ready');
		expect(momentOf('?state=nonsense')).toBe('ready');
	});

	it('names the six moments the board draws beside signing in', () => {
		expect([...SWITCHED].sort()).toEqual(['noanswer', 'offline', 'passkey', 'paused', 'unlinked', 'waiting']);
	});
});

describe('the navy half', () => {
	it.each<Moment>(['ready', 'waiting', 'offline', 'noanswer'])('%s keeps the welcome at every width', (m) => {
		expect(navyOf(m)).toEqual({ kind: 'welcome', slim: false });
	});

	it.each(['unlinked', 'passkey', 'used', 'expired'] as const)('%s drops the welcome on a phone', (m) => {
		expect(navyOf(m)).toEqual({ kind: 'welcome', slim: true });
	});

	it('a paused member gets the mark alone; an invite, the invitation', () => {
		expect(navyOf('paused')).toEqual({ kind: 'quiet', slim: false });
		expect(navyOf('invite')).toEqual({ kind: 'invite', slim: false });
	});
});

describe('focus and the ways in', () => {
	it('a refusal, a pause and the offer take the focus to their message', () => {
		expect(SWITCHED.filter(takesFocus).sort()).toEqual(['passkey', 'paused', 'unlinked']);
		expect(takesFocus('ready')).toBe(false);
	});

	it('the ways do nothing while signing in or offline', () => {
		expect(waysLive('waiting')).toBe(false);
		expect(waysLive('offline')).toBe(false);
		expect(waysLive('ready')).toBe(true);
		expect(waysLive('noanswer')).toBe(true);
		expect(waysLive('unlinked')).toBe(true);
	});

	it('names each way as the page says it', () => {
		expect(WAY_NAMES).toEqual({ apple: 'Apple', google: 'Google', passkey: 'a passkey' });
	});
});
