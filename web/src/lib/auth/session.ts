/** The stubbed sign-in (MA-185, option 1b "The navy door", picked by Arun on 25 Nov 2026): who is signed in on this
 * browser, kept in its storage, with no network and no real sign-in. MA-109, MA-143 and MA-73 put the real one behind
 * the same calls. Storage may be blocked: the session then lasts as long as the page, and nothing throws. */
import type { KeyValue } from '#lib/chat/outbox.ts';

/** How a member signs in: Apple's or Google's account, or a passkey added after the first of those (§4.5). */
export type Way = 'apple' | 'google' | 'passkey';

export interface SignedIn {
	member: string;
	way: Way;
	/** When, as an ISO time. */
	at: string;
}

const SESSION = 'mp.session';
/** The passkey offer is made once per browser, straight after the first Apple or Google sign-in there; Not now is
 * remembered (decision.md, default 2). */
const OFFERED = 'mp.passkey.offered';

const WAYS: readonly Way[] = ['apple', 'google', 'passkey'];

function parse(raw: string | null | undefined): SignedIn | undefined {
	if (!raw) return undefined;
	try {
		const v = JSON.parse(raw) as unknown;
		if (typeof v !== 'object' || v === null) return undefined;
		const s = v as Record<string, unknown>;
		const way = WAYS.find((w) => w === s.way);
		if (typeof s.member !== 'string' || !s.member || !way || typeof s.at !== 'string') return undefined;
		return { member: s.member, way, at: s.at };
	} catch {
		return undefined;
	}
}

export class StubSession {
	/** What the page holds when storage is blocked, or as well as it: read when storage has nothing. */
	private readonly memory = new Map<string, string>();
	/** A dev switch in the address (`?as=asha`, `?stub=empty`, ...) counts as signed in for the life of this page. */
	private passed = false;

	constructor(private readonly store?: KeyValue) {}

	private read(key: string): string | null {
		try {
			const v = this.store?.getItem(key);
			if (v !== null && v !== undefined) return v;
		} catch {
			// blocked: the page's own copy below
		}
		return this.memory.get(key) ?? null;
	}

	private write(key: string, value: string | undefined): void {
		if (value === undefined) this.memory.delete(key);
		else this.memory.set(key, value);
		try {
			if (value === undefined) this.store?.removeItem(key);
			else this.store?.setItem(key, value);
		} catch {
			// blocked: the session lasts as long as the page
		}
	}

	/** Who is signed in on this browser, if anyone. */
	current(): SignedIn | undefined {
		return parse(this.read(SESSION));
	}

	/** Signed in, or let in for this page by a dev switch. */
	get signedIn(): boolean {
		return this.passed || this.current() !== undefined;
	}

	/** Lets this page in without a session: the dev switches keep working with nothing stored. */
	passForPage(): void {
		this.passed = true;
	}

	/** Signs in, and says whether to make the passkey offer: only after Apple or Google, and only the first time on this
	 * browser. Making the offer is remembered at once, so a reload or a second sign-in never makes it again. */
	signIn(way: Way, member = 'arun', now: Date = new Date()): { offer: boolean } {
		this.write(SESSION, JSON.stringify({ member, way, at: now.toISOString() } satisfies SignedIn));
		const offer = way !== 'passkey' && !this.offered();
		if (offer) this.markOffered();
		return { offer };
	}

	/** The offer was made on this browser (Add a passkey, or Not now). */
	offered(): boolean {
		return this.read(OFFERED) === '1';
	}

	markOffered(): void {
		this.write(OFFERED, '1');
	}

	/** Signs out: the session and the page's pass go; the offer stays made, as it is per browser, not per sign-in. */
	signOut(): void {
		this.passed = false;
		this.write(SESSION, undefined);
	}
}

/** This browser's storage, or nothing when it is blocked. */
export function browserStorage(): KeyValue | undefined {
	try {
		return window.localStorage;
	} catch {
		return undefined; // blocked: the session lives only as long as the page
	}
}

let shared: StubSession | undefined;

/** The browser's one session, made the first time it is asked for. */
export function browserSession(): StubSession {
	shared ??= new StubSession(browserStorage());
	return shared;
}
