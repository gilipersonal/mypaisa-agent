import { describe, expect, it } from 'vitest';
import { applyAppearance, readAppearance, saveAppearance } from './appearance.ts';
import { commandKeyLabel, nextAppearance, paletteGroups } from './palette.ts';

const labels = (q: string, a: 'system' | 'light' | 'dark' = 'system') =>
	paletteGroups(q, a).map((g) => [g.heading, g.rows.map((r) => r.label)]);

describe('the ⌘K palette', () => {
	it('lists, with nothing typed, the four pages with ⌘1 to ⌘4, the chat flows and the settings, as board 2h draws them', () => {
		expect(labels('')).toEqual([
			['Go to', ['Home', 'Assets', 'Projection', 'Budget']],
			['Do it in the chat', ['Send a statement', 'Log money']],
			['Settings', ['Appearance']]
		]);
		expect(paletteGroups('', 'system')[0]?.rows.map((r) => r.key)).toEqual(['⌘1', '⌘2', '⌘3', '⌘4']);
	});

	it('puts "Ask MyPaisa" first once something is typed, its Return sending the words to the chat', () => {
		const groups = paletteGroups('  hdfc ', 'system');
		expect(groups[0]?.heading).toBe('Ask');
		expect(groups[0]?.rows[0]).toMatchObject({
			label: 'Ask MyPaisa: “hdfc”',
			key: '↵',
			action: { kind: 'ask', text: 'hdfc' }
		});
		expect(groups).toHaveLength(1); // no page, flow or setting matches; records arrive with phase 2
	});

	it('finds pages, flows and settings by name or keyword, whatever the case', () => {
		expect(labels('ADMIN')).toEqual([
			['Ask', ['Ask MyPaisa: “ADMIN”']],
			['Go to', ['Admin center']]
		]);
		expect(labels('pdf')).toEqual([
			['Ask', ['Ask MyPaisa: “pdf”']],
			['Do it in the chat', ['Send a statement']]
		]);
		expect(labels('dark')).toEqual([
			['Ask', ['Ask MyPaisa: “dark”']],
			['Settings', ['Appearance']]
		]);
		expect(paletteGroups('audit', 'system')[1]?.rows[0]).toMatchObject({ action: { kind: 'go', href: '/audit' } });
		expect(paletteGroups('audit', 'system')[1]?.rows[0]?.key).toBeUndefined();
	});

	it('shows the appearance in force, and steps System, Light, Dark', () => {
		expect(paletteGroups('', 'dark')[2]?.rows[0]).toMatchObject({ sub: 'Dark', icon: 'moon' });
		expect(paletteGroups('', 'light')[2]?.rows[0]).toMatchObject({ sub: 'Light', icon: 'sun' });
		expect(paletteGroups('', 'system')[2]?.rows[0]).toMatchObject({ sub: 'System', icon: 'monitor' });
		expect(['system', 'light', 'dark'].map((a) => nextAppearance(a as 'system'))).toEqual(['light', 'dark', 'system']);
	});

	it('names the keys the member presses', () => {
		expect(commandKeyLabel('MacIntel')).toBe('⌘K');
		expect(commandKeyLabel('iPad')).toBe('⌘K');
		expect(commandKeyLabel('Win32')).toBe('Ctrl K');
	});
});

describe('appearance', () => {
	function memory() {
		const map = new Map<string, string>();
		return {
			map,
			getItem: (k: string) => map.get(k) ?? null,
			setItem: (k: string, v: string) => void map.set(k, v),
			removeItem: (k: string) => void map.delete(k)
		};
	}

	it('keeps a forced theme in this browser, and System as no entry at all', () => {
		const store = memory();
		expect(readAppearance(store)).toBe('system');
		saveAppearance(store, 'dark');
		expect(readAppearance(store)).toBe('dark');
		saveAppearance(store, 'system');
		expect(store.map.size).toBe(0);
		store.map.set('mp.appearance', 'sepia');
		expect(readAppearance(store)).toBe('system');
	});

	it('survives storage that is missing or refuses', () => {
		const refusing = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			},
			removeItem: () => undefined
		};
		expect(readAppearance(undefined)).toBe('system');
		expect(readAppearance(refusing)).toBe('system');
		expect(() => {
			saveAppearance(refusing, 'light');
		}).not.toThrow();
	});

	it('forces the theme with one class on the root, and clears it for System', () => {
		const classes = new Set<string>();
		const root = {
			classList: {
				toggle: (c: string, on?: boolean) => {
					if (on) classes.add(c);
					else classes.delete(c);
					return Boolean(on);
				}
			}
		} as unknown as Pick<Element, 'classList'>;
		applyAppearance(root, 'dark');
		expect([...classes]).toEqual(['t-dark']);
		applyAppearance(root, 'light');
		expect([...classes]).toEqual(['t-light']);
		applyAppearance(root, 'system');
		expect(classes.size).toBe(0);
	});
});
