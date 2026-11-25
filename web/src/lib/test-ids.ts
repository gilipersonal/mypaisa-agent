/** The one selector dictionary (MA-165, MA-273, MA-274): every element a test reaches, as `mp.<surface>.<component>`.
 * `ios/MyPaisaCore/Testing/TestIDs.swift` mirrors this file and `scripts/ios_gates.sh` fails when they differ, so a
 * Maestro or Playwright flow names the same element at both doors. */
export const TestIDs = {
	tabChat: 'mp.tab.chat',
	tabHome: 'mp.tab.home',
	tabActivity: 'mp.tab.activity',
	tabYou: 'mp.tab.you',
	tabAssets: 'mp.tab.assets',
	tabProjection: 'mp.tab.projection',
	tabMore: 'mp.tab.more',
	homeHero: 'mp.home.hero',
	projectionView: 'mp.projection.view',
	projectionHero: 'mp.projection.hero',
	projectionMoney: 'mp.projection.money',
	projectionFan: 'mp.projection.fan',
	projectionHorizon: 'mp.projection.horizon',
	projectionMilestones: 'mp.projection.milestones',
	projectionPlan: 'mp.projection.plan',
	projectionAssumptions: 'mp.projection.assumptions',
	plansSummary: 'mp.plans.summary',
	plansTimeline: 'mp.plans.timeline',
	plansSheet: 'mp.plans.sheet',
	chatPlanCard: 'mp.chat.planCard',
	forecastChart: 'mp.forecast.chart',
	forecastYear: 'mp.forecast.year',
	forecastMonths: 'mp.forecast.months',
	forecastTrace: 'mp.forecast.trace',
	chatCheckIn: 'mp.chat.checkin',
	chatCheckInConfirm: 'mp.chat.checkin.confirm',
	chatCheckInMore: 'mp.chat.checkin.more',
	chatCheckInUndo: 'mp.chat.checkin.undo'
} as const;

export type TestID = (typeof TestIDs)[keyof typeof TestIDs];
