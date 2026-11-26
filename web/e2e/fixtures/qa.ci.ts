/** GitHub's QA run only (MA-304, MA-362): axe at WCAG 2.2 AA, then Argos's screenshot with its ARIA snapshot. This is
 * the one file that imports axe (scripts/web_gates.sh fails otherwise), and it refuses to load off GitHub Actions:
 * "No AXE testing should be done on local" (Arun, 26 Nov 2026). It is reached only through checkpoint() in test.ts. */
import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// The guard comes before axe and Argos are even loaded: off GitHub Actions their code never reaches the process.
if (process.env.GITHUB_ACTIONS !== 'true') {
	throw new Error('qa.ci.ts runs axe and Argos on GitHub Actions only (MA-362: no axe on the laptop).');
}
const { default: AxeBuilder } = await import('@axe-core/playwright');
const { argosScreenshot } = await import('@argos-ci/playwright');

/** WCAG 2.2 AA, with the A and AA rules of 2.0 and 2.1 it includes. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** axe, failing closed on any violation, then the capture. The project (engine, width, theme) prefixes the name, so
 * every capture in a build is unique. The full axe result is saved beside the test's output and attached to it. */
export async function auditAndCapture(page: Page, name: string): Promise<void> {
	const info = test.info();
	const label = `${info.project.name}/${name}`;
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	const report = info.outputPath(`axe-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);
	await writeFile(report, JSON.stringify({ name: label, url: page.url(), violations: results.violations }, null, 2));
	await info.attach(`axe: ${name}`, { path: report, contentType: 'application/json' });
	const found = results.violations.map((v) => ({
		rule: v.id,
		impact: v.impact,
		help: v.help,
		targets: v.nodes.map((n) => n.target.join(' '))
	}));
	expect(found, `axe: WCAG 2.2 AA violations on ${label}`).toEqual([]);
	await argosScreenshot(page, label, { ariaSnapshot: true });
}
