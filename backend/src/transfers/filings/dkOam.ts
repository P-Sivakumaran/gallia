import { fetchFilingJson, fetchFilingText } from './http.js'
import type { ExtractedTransferFact, FilingAnnouncement } from './types.js'

/**
 * Danish listed clubs via Finanstilsynet's OAM public API (official storage of regulated
 * information). F.C. Copenhagen's parent PARKEN Sport & Entertainment files an inside-information
 * notice for each major sale ("Salg af kontraktrettighed"): the buyer and the sale's expected effect
 * on profit before tax, in DKK. The fee itself is not stated.
 */
export const DFSA_CHANNEL = 'dfsa-oam'
const API = 'https://api.finanstilsynet.dk/ESAP_PublicAPI/v1'

export const DK_ISSUERS: Record<string, { query: string; issuerName: string }> = {
  copenhagen_parken: { query: 'Parken', issuerName: 'PARKEN SPORT & ENTERTAINMENT A/S' },
}

interface SearchRow {
  id: string
  HeadlineColumn: string
  IssuerColumn: string
  CategoryColumn: string
  PublicationDateColumn: string // "23-07-2025 10:00:50"
}

interface DetailsElement {
  type: string
  value?: { type: string; title?: string; url?: string; value?: string }
}

/** Sale notices; rumour notices, guidance updates and non-football sales don't count. */
export function isPlayerSaleHeadline(headline: string): boolean {
  return /\bsalg af\b/i.test(headline) && !/rygte|lalandia|vindmølle|havmølle|fitness|stadion|ejendom|kontortårn|realitetsforhandling/i.test(headline)
}

function parseDkDate(s: string): Date {
  const m = s.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/)
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5])) : new Date(NaN)
}

export async function listDkPlayerSales(portalId: string, since: Date, maxPages = 20): Promise<{ id: string; title: string; publishedAt: Date }[]> {
  const issuer = DK_ISSUERS[portalId]
  if (!issuer) throw new Error(`No OAM issuer configured for portal "${portalId}"`)
  const out: { id: string; title: string; publishedAt: Date }[] = []
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchFilingJson<{ paging: { totalPages: number }; data: { rows: SearchRow[] } }>(DFSA_CHANNEL, `${API}/api/esap/search`, {
      jsonBody: { query: issuer.query, page, pageSize: 20 },
      headers: { 'Accept-Language': 'en' },
    })
    for (const r of res.data.rows) {
      const publishedAt = parseDkDate(r.PublicationDateColumn)
      if (r.IssuerColumn !== issuer.issuerName || r.CategoryColumn !== 'Inside information') continue
      if (publishedAt < since || !isPlayerSaleHeadline(r.HeadlineColumn)) continue
      out.push({ id: r.id, title: r.HeadlineColumn.trim(), publishedAt })
    }
    if (page >= res.paging.totalPages) break
  }
  return out
}

/** The announcement's HTML document, English when filed in English. */
export async function fetchDkAnnouncement(id: string): Promise<{ url: string; html: string } | null> {
  const details = await fetchFilingJson<{ sections: { elements: DetailsElement[] }[] }>(DFSA_CHANNEL, `${API}/api/esap/details/${id}`, {
    headers: { 'Accept-Language': 'en' },
  })
  const links = details.sections.flatMap((s) => s.elements).map((e) => e.value).filter((v) => v?.type === 'link' && v.url) as { url: string }[]
  const html = links.find((l) => /-en\.html$/i.test(l.url)) ?? links.find((l) => /\.html$/i.test(l.url))
  if (!html) return null
  return { url: html.url, html: await fetchFilingText(DFSA_CHANNEL, encodeURI(decodeURI(html.url))) }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'’.-])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase())
}

/** "1.600" -> 1600, "137" -> 137, "63,5" -> 63.5 (Danish separators). */
function danishNumber(s: string): number {
  return parseFloat(s.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
}

export function parseParkenSale(text: string, title: string, publishedAt: Date, sourceUrl: string, portalId = 'copenhagen_parken'): ExtractedTransferFact | null {
  if (/\brygte|\brumou?r/i.test(title)) return null
  const t = text.replace(/\s+/g, ' ')

  // Player and buyer: "kontraktrettigheden på <Player> til <CLUB>." / "salget af <Player> til <Club> nu er opfyldt"
  // or English "contract right(s) (for|to|of) <Player> to <CLUB>."
  // No 'i' flag: with it, \p{Lu} would match lower case too. Names are runs of capitalised words; clubs may carry particles ("de", "do") and dotted suffixes ("A.S", "F.C").
  const NAME = String.raw`\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)*`
  const CLUB_TOKEN = String.raw`\p{Lu}(?:[\p{L}'’&-]|\.(?=\p{L}))*`
  const CLUB = String.raw`(?:\p{Ll}+ske\s+)?(${CLUB_TOKEN}(?:\s+(?:de|do|da|di|del|of|af)?\s*${CLUB_TOKEN})*)`
  const m =
    t.match(new RegExp(String.raw`[Kk]ontraktrettigheden på (${NAME}) til ${CLUB}`, 'u')) ??
    t.match(new RegExp(String.raw`(${NAME}) skifter til ${CLUB}`, 'u')) ??
    t.match(new RegExp(String.raw`[Ss]alget af (${NAME}) til ${CLUB}`, 'u')) ??
    t.match(new RegExp(String.raw`[Cc]ontract rights? (?:for|to|of|in) (${NAME}) to ${CLUB}`, 'u')) ??
    t.match(new RegExp(String.raw`[Ss]ale of (${NAME}) to ${CLUB}`, 'u'))
  const fromTitle =
    title.match(/(?:kontraktrettighed|contract rights?)\s*[-–]\s*([^,]+)/i)?.[1] ?? title.match(/^salg af (.+?) er endeligt/i)?.[1] ?? null
  const playerName = (m?.[1] ?? fromTitle)?.trim() ?? null
  if (!playerName) return null
  const counterparty = m?.[2]?.replace(/[.,]+$/, '').replace(/\s+(?:pr|per)$/i, '').trim() || null
  const counterpartyName = counterparty ? (counterparty === counterparty.toUpperCase() ? titleCase(counterparty) : counterparty) : null

  // Effect on profit before tax: "positiv virkning på resultat før skat for 2025 på ca. 137 mio. kr."
  const p =
    t.match(/resultat før skat for (\d{4}) på ca\.? ([\d.,]+) mio\.? ?kr/i) ??
    t.match(/profit before tax for (\d{4}) of (?:approx(?:imately)?\.?|about|around) DKK ([\d.,]+) (?:million|m)\b/i)
  const profitImpact = p ? { year: +p[1], amount: Math.round(danishNumber(p[2]) * 1_000_000), currency: 'DKK' } : null

  // "forventes opfyldt" (expected to be met) is still conditional; "er opfyldt"/"endeligt" means done.
  const completed = /\b(?:er|nu er|er nu|betingelser) opfyldt\b|\bendeligt\b|have been (?:met|fulfilled)|\bis final\b/i.test(t + ' ' + title)
  const conditional = /betingelser|conditions/i.test(t) && !completed

  return {
    portal: portalId,
    sourceUrl,
    publishedAt,
    title,
    playerName,
    counterpartyName,
    direction: 'disposal',
    transferType: 'permanent',
    isLoan: false,
    loanOptionOrObligation: 'none',
    feeAmount: null,
    feeCurrency: null,
    feeStatus: 'undisclosed',
    effectiveDate: publishedAt,
    details: {
      rawTitle: title,
      // The fee is not disclosed; the notice gives the sale's expected effect on profit before tax.
      profitBeforeTaxImpact: profitImpact,
      conditional,
    },
  }
}

export async function fetchDkFacts(
  portalId: string,
  since: Date
): Promise<{ announcements: FilingAnnouncement[]; facts: ExtractedTransferFact[]; failures: { title: string; error: string }[] }> {
  const rows = await listDkPlayerSales(portalId, since)
  const announcements: FilingAnnouncement[] = []
  const facts: ExtractedTransferFact[] = []
  const failures: { title: string; error: string }[] = []
  for (const r of rows) {
    try {
      const doc = await fetchDkAnnouncement(r.id)
      if (!doc) {
        failures.push({ title: r.title, error: 'no HTML document' })
        continue
      }
      const a: FilingAnnouncement = { portal: portalId, sourceUrl: doc.url, publishedAt: r.publishedAt, title: r.title, rawText: htmlToText(doc.html) }
      announcements.push(a)
      const fact = parseParkenSale(a.rawText!, r.title, r.publishedAt, doc.url, portalId)
      if (fact) facts.push(fact)
      else failures.push({ title: r.title, error: 'not parsed' })
    } catch (err) {
      failures.push({ title: r.title, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return { announcements, facts, failures }
}
