import { maskedMoney } from '#lib/privacy/mask.ts';
import type { Currency, Decimal } from '#lib/formatting/money.ts';

/** What the hero draws: every string already formatted here, by the code the web app runs. Mirrors `HeroModel` in
 * `ios/Packages/MyPaisaUI`. */
export interface HeroModel {
  title: string;
  figure: string;
  note: string;
  status: string;
}

export interface HeroInput {
  title: string;
  amount: Decimal;
  currency: Currency;
  privacy: boolean;
  note: string;
  status: string;
}

export function heroModel(input: HeroInput): HeroModel {
  return {
    title: input.title,
    figure: maskedMoney(input.amount, input.currency, input.privacy, { whole: true }),
    note: input.note,
    status: input.status,
  };
}
