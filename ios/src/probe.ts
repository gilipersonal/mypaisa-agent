import { formatMoney } from '#lib/formatting/money.ts';
import { maskedMoney } from '#lib/privacy/mask.ts';

/** Node and browsers run the shared TypeScript in Jest and vitest; only the app runs it on Hermes, and Hermes differs
 * (MA-165: `Intl` threw at launch). A MyPaisa Dev build under test shows these figures, and `ShellUITests` reads them. */
export function formattingProbe(): string {
  return [
    formatMoney('1234567.5', 'GBP'),
    formatMoney('1234567.5', 'INR'),
    formatMoney('123456789', 'INR', { whole: true }),
    formatMoney('9007199254740993.25', 'GBP'),
    formatMoney('1200', 'GBP', { signed: true }),
    formatMoney('1.005', 'GBP'),
    formatMoney('-0.001', 'GBP'),
    formatMoney('3450000', 'INR', { compact: true }),
    formatMoney('-48200', 'GBP', { compact: true }),
    maskedMoney('123456789', 'INR', true),
  ].join(' ');
}

export function probeNote(probe: string | undefined): string | undefined {
  return probe === 'formatting' ? formattingProbe() : undefined;
}
