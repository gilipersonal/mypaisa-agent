/** What the Projection's Plans view shows (MA-222; ARCHITECTURE §4.10 and §6; board Web v4 · Plans tab, 3a bars on a
 * timeline, and its states): each plan item on a lane across the horizon, what an admin may correct in place, and the
 * pause, resume and end an admin may do there. Nothing is created here: a new plan starts in the chat. Every amount
 * in a line of words is written by whatever stands behind the seam and masked at the door; the door places what it is
 * given and works out no figure. Types only: no framework, no Intl. */
import type { EditSpec, FanTick } from './projection.ts';

/** A lane's shapes, never colour alone: a bar for a flow (out, in, or into a pot), a diamond for a one-off, a circle
 * for an event on a record, a tick each year, a step where a flow changes from a date. */
export type BarKind = 'out' | 'in' | 'pot';
export type LaneMark = 'dia' | 'evt' | 'tick' | 'step';

export interface LaneBar {
	kind: BarKind;
	/** From and to, as fractions of the lane. */
	from: number;
	to: number;
}

export interface LanePoint {
	shape: LaneMark;
	at: number;
}

/** One figure of a plan as its sheet lists it: what it is, its value in words, and how an admin corrects it. */
export interface PlanFigure {
	label: string;
	/** "£4,000 a month", "Jul 2041", "4.5% a year"; its amounts are masked at the door. */
	value: string;
	/** Where the figure comes from, when the board names it: "Prior · UK school fees". */
	source?: { icon: string; label: string };
	edit?: EditSpec;
}

/** A plan opened: the admin's own words, its figures, what the engine says of it, and its history. */
export interface PlanSheet {
	title: string;
	icon: string;
	/** "A new flow · money out · Education · for your kid". */
	effect: string;
	status: 'Active' | 'Paused';
	words: string;
	/** "Arun · Mon 26 Oct 10:05 · in the chat · version 1". */
	wordsMeta: string;
	figures: PlanFigure[];
	/** What the figure set's stored run says of it, in words; empty when it holds nothing for this plan as it stands. */
	engine: string[];
	/** Where those words come from, or why there are none. */
	engineFoot: string;
	history: string[];
	/** Set once a figure of this plan has just been corrected: the line the sheet shows. */
	saved?: string;
}

export interface PlanRow {
	id: string;
	icon: string;
	name: string;
	/** The plan in a few words, its amounts masked at the door: "−£4,000 a month, Jan 2029 to Jul 2041". */
	sub: string;
	bars: LaneBar[];
	points: LanePoint[];
	/** It runs past the horizon. */
	past: boolean;
	paused: boolean;
	/** What a screen reader hears for the lane. */
	aria: string;
	sheet: PlanSheet;
}

export interface EndedRow {
	id: string;
	icon: string;
	name: string;
	/** "−£25,000 once, Jun 2031 · ended by Arun, Mon 26 Oct 10:12". */
	sub: string;
}

/** What a change made on the page says once it is kept, with the audit row's own line. */
export interface PlanBanner {
	kind: 'pause' | 'resume' | 'end';
	text: string;
	audit: string;
}

export interface Plans {
	/** True while the household has no records. */
	empty: boolean;
	/** Under the title: how many plans, whose, and which stored run they stand on. */
	head: string;
	/** "3 plans · yours to change, as an admin", "4 plans · 1 paused", "3 plans · Arun’s, the admin’s". */
	title: string;
	/** The run they make, in words with its amounts; or why the preview has none. */
	summary: string;
	/** Only an admin corrects, pauses or ends a plan, and adds one in the chat. */
	canEdit: boolean;
	timeline: {
		/** "Each plan, to 2046". */
		title: string;
		/** "from today, Mon 26 Oct". */
		from: string;
		axis: FanTick[];
		/** The gridlines, as fractions of the lane. */
		grid: number[];
		/** The last year on the axis, for "Runs past 2046". */
		last: string;
		/** The legend's words for a tick: "Each March", the month the yearly plans fall in. */
		each: string;
		rows: PlanRow[];
	};
	/** The line under the lanes: the admin's hint, or a member's lock line. */
	foot: string;
	ended: EndedRow[];
	banner?: PlanBanner;
	/** The page's last line. */
	note: string;
}

/** Pause, resume or end, as the door sends it. Ending may carry a word for the audit. */
export interface PlanChange {
	id: string;
	action: 'pause' | 'resume' | 'end';
	word?: string;
}
