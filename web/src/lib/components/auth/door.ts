/** The navy door's moments (MA-185, option 1b, `docs/design/reviews/MA-185/Web sign-in.dc.html`): which moment the
 * sign-in page shows, and what its navy half holds. From 1024 px the window is two halves; under it the navy is a band
 * above the way in, and a refusal, the passkey offer and a used link drop the welcome so the message comes first. */
import type { Way } from '#lib/auth/session.ts';

/** `ready`: the ways in. `waiting`: one way pressed, MyPaisa signing you in. `offline`: no connection. `noanswer`: the
 * sign-in went through but MyPaisa did not answer. `unlinked`: an account linked to no member (a removed member too).
 * `paused`: §4.5's one line. `passkey`: the offer, after the first Apple or Google sign-in on this browser. */
export type Moment = 'ready' | 'waiting' | 'offline' | 'noanswer' | 'unlinked' | 'paused' | 'passkey';

/** The review switches: `/sign-in?state=<moment>` shows that moment. */
export const SWITCHED: readonly Moment[] = ['waiting', 'offline', 'noanswer', 'unlinked', 'paused', 'passkey'];

export function momentOf(search: string): Moment {
	const s = new URLSearchParams(search).get('state');
	return SWITCHED.find((m) => m === s) ?? 'ready';
}

/** The navy half: `welcome` says what MyPaisa is; `invite` is the invitation itself; `quiet` is the mark alone (the
 * paused member). `slim` drops the welcome on a phone. */
export interface Navy {
	kind: 'welcome' | 'invite' | 'quiet';
	slim: boolean;
}

export function navyOf(moment: Moment | 'invite' | 'used' | 'expired'): Navy {
	if (moment === 'paused') return { kind: 'quiet', slim: false };
	if (moment === 'invite') return { kind: 'invite', slim: false };
	const slim = moment === 'unlinked' || moment === 'passkey' || moment === 'used' || moment === 'expired';
	return { kind: 'welcome', slim };
}

/** The moments that take the focus to their message as they arrive, so a screen reader reads it first. */
export function takesFocus(moment: Moment): boolean {
	return moment === 'unlinked' || moment === 'paused' || moment === 'passkey';
}

/** The ways in stay where they are but do nothing while one is signing in, or with no connection. */
export function waysLive(moment: Moment): boolean {
	return moment !== 'waiting' && moment !== 'offline';
}

export const WAY_NAMES: Record<Way, string> = { apple: 'Apple', google: 'Google', passkey: 'a passkey' };
