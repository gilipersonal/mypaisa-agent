// A single-page app (ARCHITECTURE §8.4): rendered in the browser, served by adapter-static's index.html fallback.
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { devSwitched, redirectFor } from '#lib/auth/guard.ts';
import { browserSession } from '#lib/auth/session.ts';

export const ssr = false;
export const prerender = false;

// Signed out, every page of the app goes to the sign-in page (MA-185, on the stubbed session); the dev switches count
// as signed in for the life of the page, so every earlier review link still opens.
export const load = ({ url }: { url: URL }): void => {
	const session = browserSession();
	if (devSwitched(url.search)) session.passForPage();
	const to = redirectFor(url.pathname, url.search, session.signedIn);
	if (to) redirect(307, resolve(to));
};
