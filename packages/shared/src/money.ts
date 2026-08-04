/**
 * Money is always integer minor units plus an ISO 4217 code. Never a float,
 * never a bare number — see docs/definition.md.
 */

export const CURRENCY_CODES = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface Money {
  /** Integer minor units: 1050 EGP-piastres = 10.50 EGP. */
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

/** Minor units per major unit. All currently supported currencies use 100. */
const MINOR_UNITS_PER_MAJOR = 100;

export function money(amountMinor: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(`Money must be integer minor units, received ${amountMinor}`);
  }
  return { amountMinor, currency };
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value);
}

/**
 * Formats for display in the given locale. Presentation only — never round-trip
 * a formatted string back into a Money.
 */
export function formatMoney(value: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountMinor / MINOR_UNITS_PER_MAJOR);
}
