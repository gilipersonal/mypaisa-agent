import { describe, expect, it } from 'vitest';
import { devSwitched, isDoor, redirectFor } from './guard.ts';

describe('the pages drawn without the shell', () => {
	it.each(['/sign-in', '/sign-in/', '/join/8Kq2Xw', '/join/used', '/join/expired'])('%s is a door', (p) => {
		expect(isDoor(p)).toBe(true);
	});

	it.each(['/', '/more', '/join', '/join/', '/join/a/b', '/sign-in/more', '/signin'])('%s is not', (p) => {
		expect(isDoor(p)).toBe(false);
	});
});

describe('the dev switches', () => {
	it.each([
		'?as=asha',
		'?stub=empty',
		'?checkin=emi',
		'?checkin=several',
		'?forecast=pot',
		'?forecast=wedding',
		'?local'
	])('%s counts as signed in', (q) => {
		expect(devSwitched(q)).toBe(true);
		expect(redirectFor('/', q, false)).toBeUndefined();
	});

	it('nothing else does', () => {
		expect(devSwitched('')).toBe(false);
		expect(devSwitched('?state=paused')).toBe(false);
	});
});

describe('the redirect rule', () => {
	it.each(['/', '/more', '/projection', '/chat', '/nowhere'])('signed out, %s goes to the sign-in page', (p) => {
		expect(redirectFor(p, '', false)).toBe('/sign-in');
	});

	it.each(['/', '/more', '/projection'])('signed in, %s opens', (p) => {
		expect(redirectFor(p, '', true)).toBeUndefined();
	});

	it('signed out, the sign-in page and an invite open', () => {
		expect(redirectFor('/sign-in', '', false)).toBeUndefined();
		expect(redirectFor('/join/8Kq2Xw', '', false)).toBeUndefined();
	});

	it('signed in, the bare sign-in page goes Home, but a review state still shows', () => {
		expect(redirectFor('/sign-in', '', true)).toBe('/');
		expect(redirectFor('/sign-in/', '', true)).toBe('/');
		expect(redirectFor('/sign-in', '?state=paused', true)).toBeUndefined();
	});

	it('signed in, an invite link still opens', () => {
		expect(redirectFor('/join/used', '', true)).toBeUndefined();
	});
});
