import { heroModel } from '../src/models/hero';
import { formattingProbe, probeNote } from '../src/probe';
import { TABS } from '../src/models/tabs';
import { TestIDs } from '#lib/test-ids.ts';

const input = {
  title: 'Household total',
  amount: '1234567.89',
  currency: 'INR',
  privacy: false,
  note: 'A note',
  status: 'Up',
} as const;

describe('heroModel', () => {
  it('formats the figure with the code the web app runs, lakh and crore included', () => {
    expect(heroModel(input).figure).toBe('₹12,34,568');
  });

  it('hides the figure and its length under privacy', () => {
    const shown = heroModel({ ...input, privacy: true }).figure;
    expect(shown).toBe('₹••••');
    expect(shown).not.toContain('12');
  });
});

describe('the tabs', () => {
  it('open to the chat and name the selector dictionary', () => {
    expect(TABS[0]?.testID).toBe(TestIDs.tabChat);
    expect(new Set(TABS.map((t) => t.testID)).size).toBe(TABS.length);
  });
});

describe('the Hermes probe', () => {
  it('reads what ShellUITests expects', () => {
    expect(formattingProbe()).toBe(
      '£1,234,567.50 ₹12,34,567.50 ₹12,34,56,789 £9,007,199,254,740,993.25 +£1,200.00 £1.01 £0.00 ₹34.5 L -£48.2k ₹••••',
    );
    expect(probeNote('other')).toBeUndefined();
  });
});
