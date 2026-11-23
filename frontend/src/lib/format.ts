export const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' }

export function feeLabel(min: number | null, max: number | null, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  if (min == null && max == null) return 'Undisclosed'
  if (min != null && max != null) return `${symbol}${min}–${max}M`
  return `${symbol}${min ?? max}M`
}
