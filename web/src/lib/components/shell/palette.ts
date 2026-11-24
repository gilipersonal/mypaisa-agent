/** What the ⌘K palette lists (MA-353, Web v4 · Shell and chat 2h): with nothing typed, the pages with ⌘1 to ⌘4, the
 * guided flows that start in the chat, and the settings it can change; typed, "Ask MyPaisa: …" first, whose Return
 * sends the words to the chat, then the pages, flows and settings that match. Nothing is created in the palette: a flow
 * row only opens its flow in the chat. Records join the typed list when phase 2 keeps them. */
import type { PathnameWithSearchOrHash as Pathname } from '$app/types';
import { ADMIN, PAGES } from './nav.ts';

export type Appearance = 'system' | 'light' | 'dark';

export type PaletteAction =
	| { kind: 'go'; href: Pathname }
	| { kind: 'ask'; text: string }
	| { kind: 'flow'; flow: 'statement' | 'log' }
	| { kind: 'appearance' };

export interface PaletteRow {
	id: string;
	label: string;
	sub?: string;
	/** The shortcut shown at the row's end. */
	key?: string;
	icon: string;
	action: PaletteAction;
	/** Words that also find the row. */
	keywords?: readonly string[];
}

export interface PaletteGroup {
	heading: string;
	rows: PaletteRow[];
}

/** The four pages ⌘1 to ⌘4 open while the palette is up, in the board's order. */
export const SHORTCUT_PAGES: readonly Pathname[] = ['/', '/assets', '/projection', '/budget'];

const APPEARANCE_LABEL: Record<Appearance, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export function nextAppearance(a: Appearance): Appearance {
	return a === 'system' ? 'light' : a === 'light' ? 'dark' : 'system';
}

function pageRows(): PaletteRow[] {
	return [...PAGES, ADMIN].map((p) => {
		const n = SHORTCUT_PAGES.indexOf(p.href);
		return {
			id: `go:${p.href}`,
			label: p.label,
			icon: p.icon,
			action: { kind: 'go', href: p.href },
			...(n === -1 ? {} : { key: `⌘${String(n + 1)}` })
		};
	});
}

const FLOWS: PaletteRow[] = [
	{
		id: 'flow:statement',
		label: 'Send a statement',
		sub: 'Starts the guided flow in the chat',
		icon: 'receipt',
		action: { kind: 'flow', flow: 'statement' },
		keywords: ['file', 'upload', 'bank', 'card', 'pdf']
	},
	{
		id: 'flow:log',
		label: 'Log money',
		sub: 'Starts the guided flow in the chat',
		icon: 'banknote',
		action: { kind: 'flow', flow: 'log' },
		keywords: ['transaction', 'payment', 'spend', 'add']
	}
];

function settingRows(appearance: Appearance): PaletteRow[] {
	return [
		{
			id: 'setting:appearance',
			label: 'Appearance',
			sub: APPEARANCE_LABEL[appearance],
			icon: appearance === 'dark' ? 'moon' : appearance === 'light' ? 'sun' : 'monitor',
			action: { kind: 'appearance' },
			keywords: ['theme', 'dark', 'light', 'system']
		}
	];
}

function matches(row: PaletteRow, q: string): boolean {
	return [row.label, ...(row.keywords ?? [])].some((w) => w.toLowerCase().includes(q));
}

export function paletteGroups(query: string, appearance: Appearance): PaletteGroup[] {
	const typed = query.trim();
	if (!typed) {
		const goTo = pageRows().filter((r) => r.key !== undefined);
		goTo.sort((a, b) => (a.key ?? '').localeCompare(b.key ?? ''));
		return [
			{ heading: 'Go to', rows: goTo },
			{ heading: 'Do it in the chat', rows: FLOWS },
			{ heading: 'Settings', rows: settingRows(appearance) }
		];
	}
	const q = typed.toLowerCase();
	const groups: PaletteGroup[] = [
		{
			heading: 'Ask',
			rows: [
				{
					id: 'ask',
					label: `Ask MyPaisa: “${typed}”`,
					sub: 'Return sends it to the chat as a question',
					key: '↵',
					icon: 'message-circle',
					action: { kind: 'ask', text: typed }
				}
			]
		},
		{ heading: 'Go to', rows: pageRows().filter((r) => matches(r, q)) },
		{ heading: 'Do it in the chat', rows: FLOWS.filter((r) => matches(r, q)) },
		{ heading: 'Settings', rows: settingRows(appearance).filter((r) => matches(r, q)) }
	];
	return groups.filter((g) => g.rows.length > 0);
}

/** "⌘K" on a Mac, "Ctrl K" elsewhere: the keys the member presses. */
export function commandKeyLabel(platform: string): string {
	return /mac|iphone|ipad/i.test(platform) ? '⌘K' : 'Ctrl K';
}
