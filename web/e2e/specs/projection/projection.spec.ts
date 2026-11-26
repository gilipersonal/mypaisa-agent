/** The Projection (MA-304 AC5, @regression): signed in, the page opened from the navigation shows the fan with its
 * horizon and the milestones; choosing another horizon redraws the fan to it, and only one horizon is ever chosen. */
import { checkpoint, expect, test } from '../../fixtures/test.ts';
import { AppShell, place } from '../../pages/app-shell.ts';
import { ProjectionPage } from '../../pages/projection.ts';

/** The page opens on 20 years (Projection 1a). */
const OPENS_ON = 20;

async function openProjection(page: import('@playwright/test').Page): Promise<ProjectionPage> {
	await new AppShell(page).goTo(place('Projection'));
	const projection = new ProjectionPage(page);
	await expect(projection.hero).toBeVisible();
	return projection;
}

test.describe('the Projection', () => {
	test('MA-304 AC5: the Projection shows the fan, its horizon and the milestones @regression', async ({
		signedInPage: page
	}) => {
		const p = await openProjection(page);
		await expect(p.fan).toBeVisible();
		await expect(p.horizon).toBeVisible();
		await expect(p.milestones).toBeVisible();
		await expect(p.plan).toBeVisible();
		await expect(p.assumptions).toBeVisible();
		await expect(p.horizon.getByRole('button')).toHaveText(['5 yrs', '10 yrs', '20 yrs', '30 yrs']);
		await expect(p.chosen()).toHaveCount(1);
		await expect(p.chip(OPENS_ON)).toHaveAttribute('aria-pressed', 'true');
		await expect(p.hero).toHaveAccessibleName(`The fan: net worth to ${String(OPENS_ON)} years`);
		await checkpoint(page, `projection ${String(OPENS_ON)} yrs`);
	});

	test('MA-304 AC5: choosing a horizon redraws the fan to it @regression', async ({ signedInPage: page }) => {
		const p = await openProjection(page);
		// The fan's sentence names the year it ends: so many years after the year 20 years ends on, less 20, whatever the
		// stub's today is.
		const endOf = async (): Promise<{ sentence: string; end: number }> => {
			const sentence = (await p.fanPicture.getAttribute('aria-label')) ?? '';
			const end = /^Net worth to (\d{4}):/.exec(sentence)?.[1];
			expect(end, `the fan's sentence names its last year: "${sentence}"`).toBeDefined();
			return { sentence, end: Number(end) };
		};
		const opened = await endOf();
		const seen = new Set<string>([opened.sentence]);
		for (const years of [10, 5, 30, OPENS_ON]) {
			await test.step(`${String(years)} yrs`, async () => {
				await p.chip(years).click();
				await expect(p.chip(years)).toHaveAttribute('aria-pressed', 'true');
				await expect(p.chosen(), 'one horizon is chosen').toHaveCount(1);
				await expect(p.hero).toHaveAccessibleName(`The fan: net worth to ${String(years)} years`);
				const { sentence, end } = await endOf();
				expect(end, 'the fan ends the horizon’s years on').toBe(opened.end - OPENS_ON + years);
				if (years === OPENS_ON) expect(sentence, 'back on 20 years, the same fan').toBe(opened.sentence);
				else {
					expect(seen.has(sentence), 'a new horizon draws a new fan').toBe(false);
					seen.add(sentence);
				}
				await checkpoint(page, `projection ${String(years)} yrs`);
			});
		}
	});

	test('MA-304 AC5: the same horizon twice, or two in quick succession, leaves the last one chosen @regression', async ({
		signedInPage: page
	}) => {
		const p = await openProjection(page);
		const before = await p.fanPicture.getAttribute('aria-label');
		await p.chip(OPENS_ON).click();
		await expect(p.chip(OPENS_ON)).toHaveAttribute('aria-pressed', 'true');
		await expect(p.fanPicture).toHaveAttribute('aria-label', before ?? '');
		await p.chip(5).click();
		await p.chip(30).click();
		await expect(p.chip(30)).toHaveAttribute('aria-pressed', 'true');
		await expect(p.chosen()).toHaveCount(1);
		await expect(p.hero).toHaveAccessibleName('The fan: net worth to 30 years');
		await checkpoint(page, 'projection after quick choices');
	});
});
