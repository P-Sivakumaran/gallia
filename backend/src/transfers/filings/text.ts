/**
 * Clean-up for text pulled out of filing PDFs. The extractor emits glyph runs, so words come out
 * split ("F e lix", "Maitland - Niles", "2 nd", "sell - on"). This repairs the patterns that
 * matter for extraction without guessing at ordinary prose.
 */
export function normalizeFilingText(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/(\p{L}) - (\p{L})/gu, '$1-$2') // "season - long" -> "season-long"
    .replace(/\b(\p{Lu}) (\p{Ll}) (\p{Ll}{2,})\b/gu, '$1$2$3') // "F e lix" -> "Felix"
    .replace(/(\d) (st|nd|rd|th)\b/g, '$1$2') // "2 nd" -> "2nd"
    .replace(/(\d) ?: ?(\d) ?(\d)\b/g, '$1:$2$3') // "6: 3 0" -> "6:30"
    .replace(/\\([()])/g, '$1') // PDF-escaped parentheses
    .trim()
}

/** "4,3" -> 4.3, "35.0" -> 35, "1,250" -> 1250. */
export function parseDecimal(s: string): number {
  const t = s.trim()
  if (/^\d+,\d{1,2}$/.test(t)) return parseFloat(t.replace(',', '.'))
  return parseFloat(t.replace(/,(?=\d{3}\b)/g, ''))
}

/** "€4,3m" / "€35.0 million" / "EUR 2 million" -> euros. Returns null when no amount is present. */
export function parseEuroMillions(s: string): number | null {
  const m = s.match(/(?:€|EUR|euro)\s?(\d[\d.,]*)\s?(?:million|m)\b/i)
  return m ? Math.round(parseDecimal(m[1]) * 1_000_000) : null
}

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

/** "30 June 2030", "June 30th 2031", "June 30, 2029", "June 2027" (-> 30 June when the month is June, else last day). */
export function parseEnglishDate(s: string): Date | null {
  let m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})/)
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) return new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1]))
  m = s.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) return new Date(Date.UTC(+m[3], MONTHS[m[1].toLowerCase()], +m[2]))
  m = s.match(/([A-Za-z]+)\s+(\d{4})/)
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
    const month = MONTHS[m[1].toLowerCase()]
    return new Date(Date.UTC(+m[2], month + 1, 0)) // last day of that month
  }
  return null
}

/** Accent- and case-insensitive key for comparing names. */
export function foldName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
