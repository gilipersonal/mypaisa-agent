// The web app's functional e2e (MA-304, .claude/rules/testing.md): run on the laptop by crew:qa-web when Arun asks, never
// in a gate. `pnpm test:e2e` runs Chromium and WebKit at 390x844 and 1440x900, light and dark; `--grep @sweep` adds the
// width sweep, 320 to 1920 on Chromium. `pnpm test:qa` runs the same specs on GitHub Actions only, with axe and Argos at
// every checkpoint (e2e/fixtures/qa.ci.ts); axe never runs on the laptop (MA-362).
import {
	defineConfig,
	devices,
	type PlaywrightTestConfig,
	type PlaywrightTestOptions,
	type Project
} from '@playwright/test';

const onGitHub = process.env.GITHUB_ACTIONS === 'true';
const ci = Boolean(process.env.CI) || onGitHub;
/** `pnpm test:qa`: axe and Argos at every checkpoint. It refuses to start off GitHub Actions (package.json). */
const qa = process.env.MP_QA === '1';
if (qa && !onGitHub) {
	throw new Error(
		'MP_QA runs axe and Argos, on GitHub Actions only (MA-362: no axe on the laptop). Run test:e2e here.'
	);
}
// The sweep is opt-in: asking for @sweep (`--grep @sweep`, `pnpm test:e2e:sweep`) adds its projects. The flag goes into
// the environment so the workers, which load this file again, see the same projects.
if (process.argv.some((a) => a.includes('@sweep'))) process.env.MP_SWEEP = '1';
const sweep = process.env.MP_SWEEP === '1';

const SWEEP = /@sweep/;
const PORT = 4173;
const baseURL = `http://localhost:${String(PORT)}`;

type Use = Partial<PlaywrightTestOptions>;

const phone: Use = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
const desktop: Use = { viewport: { width: 1440, height: 900 } };

const engines = [
	{ name: 'chromium', base: devices['Desktop Chrome'] },
	{ name: 'webkit', base: devices['Desktop Safari'] }
] as const;
const sizes = [
	{ name: '390', use: phone },
	{ name: '1440', use: desktop }
] as const;
const schemes = ['light', 'dark'] as const;

/** chromium-390-light, chromium-390-dark, ..., webkit-1440-dark: the default run, @sweep left out. */
const functional: Project[] = engines.flatMap((engine) =>
	sizes.flatMap((size) =>
		schemes.map((colorScheme) => ({
			name: `${engine.name}-${size.name}-${colorScheme}`,
			grepInvert: SWEEP,
			use: { ...engine.base, ...size.use, colorScheme }
		}))
	)
);

/** The width sweep (MA-240): one Chromium project per width, light, only the @sweep tests. */
const WIDTHS = [
	[320, 568],
	[375, 812],
	[600, 960],
	[768, 1024],
	[1024, 768],
	[1280, 800],
	[1440, 900],
	[1920, 1080]
] as const;
const sweeps: Project[] = WIDTHS.map(([width, height]) => ({
	name: `sweep-${String(width)}`,
	grep: SWEEP,
	use: { ...devices['Desktop Chrome'], viewport: { width, height }, colorScheme: 'light' }
}));

const reporter: PlaywrightTestConfig['reporter'] = onGitHub
	? [
			['list'],
			['html', { open: 'never' }],
			// Argos's reporter uploads the captures qa.ci.ts takes; on GitHub only, and only in the QA run.
			['@argos-ci/playwright/reporter', { uploadToArgos: qa }]
		]
	: [['list'], ['html', { open: 'never' }]];

export default defineConfig({
	testDir: './e2e/specs',
	outputDir: './test-results',
	fullyParallel: true,
	forbidOnly: ci,
	retries: ci ? 1 : 0,
	...(ci ? { workers: 2 } : {}),
	reporter,
	use: {
		baseURL,
		// The service worker caches the shell; a test reads the build as served, every time.
		serviceWorkers: 'block',
		// Argos stabilises the page with an inline script, which the app's CSP (hashes only) refuses; on GitHub's QA run
		// only. axe evaluates in the page through the driver and needs no exception.
		bypassCSP: qa,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [...functional, ...(sweep ? sweeps : [])],
	webServer: {
		// The build as it ships (adapter-static, the CSP, the service worker), served by Vite's preview. It has no /v1
		// proxy: the api health call fails, as expected, and no test depends on it. pnpm through corepack, at the version
		// package.json pins, as scripts/web_gates.sh runs it: the laptop has no pnpm on its PATH.
		command: `corepack pnpm@12.16.1 build && corepack pnpm@12.16.1 preview --port ${String(PORT)} --strictPort`,
		url: baseURL,
		reuseExistingServer: !ci,
		timeout: 180_000,
		stdout: 'ignore',
		stderr: 'pipe'
	}
});
