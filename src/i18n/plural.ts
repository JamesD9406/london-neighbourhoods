// Counted text. Languages need different wordings for different numbers: English has two
// (one, other), Arabic has six (zero, one, two, few, many, other). Intl.PluralRules picks the
// right one for the number; any form a language leaves out falls back to `other`.
import type { Lang } from './strings';

export type Plural = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

export const plural = (lang: Lang, forms: Plural, n: number): string =>
  (forms[new Intl.PluralRules(lang).select(n)] ?? forms.other).replace('{n}', String(n));
