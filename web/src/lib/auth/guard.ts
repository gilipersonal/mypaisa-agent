/** Who may open which page (MA-185): signed out, every page of the app goes to the sign-in page; the sign-in page and an
 * invite link open for anyone. The dev switches that open the stub in a state (`?as=asha`, `?stub=empty`,
 * `?checkin=emi|several`, `?forecast=pot|wedding`, `?local`) count as signed in, so every earlier review link still
 * opens its page. */

export const SIGN_IN = '/sign-in' as const;
export const HOME = '/' as const;

/** The query switches the stub already reads (MA-198, MA-205, MA-208, MA-262). */
export const DEV_SWITCHES: readonly string[] = ['as', 'stub', 'checkin', 'forecast', 'local'];

/** The sign-in page and an invite link (`/join/<token>`): the pages drawn without the app's shell. */
export function isDoor(pathname: string): boolean {
	const p = pathname.replace(/\/+$/, '') || '/';
	return p === SIGN_IN || /^\/join\/[^/]+$/.test(p);
}

export function devSwitched(search: string): boolean {
	const q = new URLSearchParams(search);
	return DEV_SWITCHES.some((k) => q.has(k));
}

/** Where to send a page instead, or nothing to let it open. A signed-in member who opens the bare sign-in page goes
 * Home; with a `?state=` review switch the page shows that state whoever is signed in. An invite link always opens. */
export function redirectFor(
	pathname: string,
	search: string,
	signedIn: boolean
): typeof SIGN_IN | typeof HOME | undefined {
	if (isDoor(pathname)) {
		const p = pathname.replace(/\/+$/, '');
		if (p === SIGN_IN && signedIn && !new URLSearchParams(search).has('state')) return HOME;
		return undefined;
	}
	return signedIn || devSwitched(search) ? undefined : SIGN_IN;
}
