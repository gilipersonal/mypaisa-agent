/** The e2e suite's one `test` (MA-304): Playwright's, with a member signed in on the stub data, and `checkpoint`, which
 * every spec calls at each screen worth capturing. On the laptop a checkpoint is a plain screenshot in test-results; in
 * GitHub's QA run (`pnpm test:qa`) it runs axe and takes Argos's capture, from qa.ci.ts, the one file that imports axe
 * (MA-362: no axe on the laptop; scripts/web_gates.sh counts its importers). */
import { test as base, expect, type Page } from '@playwright/test';
import { StubSession } from '#lib/auth/session.ts';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { HomePage } from '../pages/home.ts';

/** When the stub member signs in, a fixed time, so a capture never changes with the clock. */
const SIGNED_IN_AT = new Date('2026-11-26T09:00:00.000Z');

/** What signing in leaves in the browser's storage, written by the app's own StubSession, so the keys and the shape
 * follow the app: the session, and the passkey offer already made (it is made once per browser). */
export function signedInStorage(): Record<string, string> {
	const map = new Map<string, string>();
	const store: KeyValue = {
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => {
			map.set(k, v);
		},
		removeItem: (k) => {
			map.delete(k);
		}
	};
	new StubSession(store).signIn('google', 'arun', SIGNED_IN_AT);
	return Object.fromEntries(map);
}

/** GitHub's QA run: `pnpm test:qa` sets MP_QA, and it refuses to run anywhere else. */
function qaRun(): boolean {
	if (process.env.MP_QA !== '1') return false;
	if (process.env.GITHUB_ACTIONS !== 'true') {
		throw new Error('MP_QA runs axe and Argos, on GitHub Actions only (MA-362). Run test:e2e on the laptop.');
	}
	return true;
}

function slug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/** A screen worth capturing. Locally: a screenshot, attached to the report. In GitHub's QA run: axe (WCAG 2.2 AA, fail
 * closed), then Argos's screenshot with its ARIA snapshot. Names are unique within a test. */
export async function checkpoint(page: Page, name: string): Promise<void> {
	if (qaRun()) {
		const { auditAndCapture } = await import('./qa.ci.ts');
		await auditAndCapture(page, name);
		return;
	}
	const info = base.info();
	const path = info.outputPath(`${slug(name)}.png`);
	await page.screenshot({ path });
	await info.attach(name, { path, contentType: 'image/png' });
}

interface Fixtures {
	/** A page signed in as the stub member, on Home with its hero shown. Signing out in a test sticks: the storage is
	 * written once per tab, on its first page of the app. */
	signedInPage: Page;
}

export const test = base.extend<Fixtures>({
	page: async ({ page }, use) => {
		// An error the page throws and nobody catches fails the test it happened in.
		const errors: Error[] = [];
		page.on('pageerror', (error) => errors.push(error));
		await use(page);
		expect(
			errors.map((e) => e.message),
			'uncaught errors in the page'
		).toEqual([]);
	},
	signedInPage: async ({ page, baseURL }, use) => {
		const origin = new URL(baseURL ?? 'http://localhost:4173').origin;
		await page.addInitScript(
			({ entries, origin }) => {
				if (location.origin !== origin || sessionStorage.getItem('mp.e2e.seeded') === '1') return;
				for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
				sessionStorage.setItem('mp.e2e.seeded', '1');
			},
			{ entries: signedInStorage(), origin }
		);
		await page.goto('/');
		await expect(new HomePage(page).hero).toBeVisible();
		await use(page);
	}
});

export { expect };
