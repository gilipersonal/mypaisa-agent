/** The Projection (MA-224): selected by its test ids (web/src/lib/test-ids.ts). The horizon's chips have no id of their
 * own; each is the button inside mp.projection.horizon that the chip's own words name ("10 yrs"). */
import type { Locator, Page } from '@playwright/test';
import { TestIDs } from '#lib/test-ids.ts';

export class ProjectionPage {
	readonly hero: Locator;
	readonly fan: Locator;
	/** The fan's picture, whose label is the sentence a screen reader gets: the horizon's year and the figures. */
	readonly fanPicture: Locator;
	readonly horizon: Locator;
	readonly milestones: Locator;
	readonly plan: Locator;
	readonly assumptions: Locator;

	constructor(readonly page: Page) {
		this.hero = page.getByTestId(TestIDs.projectionHero);
		this.fan = page.getByTestId(TestIDs.projectionFan);
		this.fanPicture = this.fan.getByRole('img').first();
		this.horizon = page.getByTestId(TestIDs.projectionHorizon);
		this.milestones = page.getByTestId(TestIDs.projectionMilestones);
		this.plan = page.getByTestId(TestIDs.projectionPlan);
		this.assumptions = page.getByTestId(TestIDs.projectionAssumptions);
	}

	/** The horizon chip for so many years. */
	chip(years: number): Locator {
		return this.horizon.getByRole('button', { name: `${String(years)} yrs`, exact: true });
	}

	/** The chips that say they are chosen. */
	chosen(): Locator {
		return this.horizon.locator('button[aria-pressed="true"]');
	}
}
