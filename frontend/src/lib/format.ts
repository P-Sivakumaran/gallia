export const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' }

// Fees are stored in millions, but some feeds wrote raw currency units
// (450000 for €0.45M), which printed as "€450000–550000.000000001M".
// Anything at or above 1,000 is read as raw units.
export function toMillions(v: number): number {
  return v >= 1000 ? v / 1_000_000 : v
}

export function formatMillions(m: number): string {
  if (m < 1) return `${Math.round(m * 1000)}K`
  return `${Number(m.toFixed(m < 10 ? 1 : 0))}M`
}

export function feeLabel(min: number | null, max: number | null, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  if (min == null && max == null) return 'Undisclosed'
  if (min != null && max != null) {
    const lo = formatMillions(toMillions(min))
    const hi = formatMillions(toMillions(max))
    if (lo === hi) return `${symbol}${lo}`
    // Same unit on both ends: "€45–55K", not "€45K–55K".
    const sameUnit = lo.slice(-1) === hi.slice(-1)
    return `${symbol}${sameUnit ? lo.slice(0, -1) : lo}–${hi}`
  }
  return `${symbol}${formatMillions(toMillions((min ?? max) as number))}`
}
