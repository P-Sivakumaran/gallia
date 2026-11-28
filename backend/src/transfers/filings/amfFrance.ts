import { fetchFilingBuffer, fetchFilingJson } from './http.js'
import { extractTextFromPdfBuffer } from './pdfExtractor.js'
import { foldName, normalizeFilingText, parseDecimal, parseEnglishDate, parseEuroMillions } from './text.js'
import type { ExtractedTransferFact, FilingAnnouncement, LoanOptionOrObligation, TransferDirection, TransferType } from './types.js'

/**
 * French listed clubs via info-financiere.gouv.fr, the official storage of regulated information
 * (Licence Ouverte / Etalab 2.0, public API). Olympique Lyonnais (Eagle Football Group) publishes a
 * press release in French and English for each transfer, loan, signing and extension.
 */
export const AMF_CHANNEL = 'amf-info-financiere'
const API = 'https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records'

/** Issuer names as the AMF feed spells them, per portal. */
export const AMF_ISSUERS: Record<string, { issuerNames: string[]; clubAliases: RegExp }> = {
  lyon_eagle: {
    issuerNames: ['EAGLE FOOTBALL GROUP', 'OLYMPIQUE LYONNAIS GROUPE'],
    clubAliases: /^(?:OL|OLYMPIQUE LYONNAIS|LYON)$/i,
  },
}

/** English titles about one player's move or contract. French duplicates and corporate notices don't match. */
const ENGLISH_PLAYER_TITLE = /\b(?:TRANSFER|TRANSFERRED|LOAN|LOANED|SIGNS?|JOINS|EXTENDS|EXTENSION|ARRIVAL|ARRIVES)\b/i
const CORPORATE_TITLE = /\b(?:LISTING|EURONEXT|VOTING RIGHTS|SHARES|GENERAL MEETING|COACH|BOARD|BIDCO|LIQUIDITY|RESULTS|ACTIVITY)\b/i

export function isPlayerFilingTitle(title: string): boolean {
  return ENGLISH_PLAYER_TITLE.test(title) && !CORPORATE_TITLE.test(title)
}

interface AmfRecord {
  identificationsociete_iso_nom_soc: string
  informationdeposee_inf_dat_emt: string
  informationdeposee_inf_tit_inf: string
  url_de_recuperation: string
}

/** List an issuer's player filings since a date (newest first), one per title and day. */
export async function listAmfPlayerFilings(portalId: string, since: Date, max = 500): Promise<FilingAnnouncement[]> {
  const issuer = AMF_ISSUERS[portalId]
  if (!issuer) throw new Error(`No AMF issuer configured for portal "${portalId}"`)
  const names = issuer.issuerNames.map((n) => `identificationsociete_iso_nom_soc like "${n}%"`).join(' OR ')
  const where = `(${names}) AND informationdeposee_inf_dat_emt >= "${since.toISOString().slice(0, 10)}"`
  const out: FilingAnnouncement[] = []
  const seen = new Set<string>()
  for (let offset = 0; offset < max; offset += 100) {
    const params = new URLSearchParams({
      where,
      limit: '100',
      offset: String(offset),
      order_by: 'informationdeposee_inf_dat_emt desc',
      select: 'identificationsociete_iso_nom_soc,informationdeposee_inf_dat_emt,informationdeposee_inf_tit_inf,url_de_recuperation',
    })
    const page = await fetchFilingJson<{ total_count: number; results: AmfRecord[] }>(AMF_CHANNEL, `${API}?${params}`)
    for (const r of page.results) {
      const title = r.informationdeposee_inf_tit_inf.trim()
      if (!isPlayerFilingTitle(title)) continue
      const key = `${r.informationdeposee_inf_dat_emt.slice(0, 10)}|${title.toUpperCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        portal: portalId,
        sourceUrl: r.url_de_recuperation,
        pdfUrl: r.url_de_recuperation,
        publishedAt: new Date(r.informationdeposee_inf_dat_emt),
        title,
      })
    }
    if (page.results.length < 100 || offset + 100 >= page.total_count) break
  }
  return out
}

export async function fetchAmfFilingText(announcement: FilingAnnouncement): Promise<string> {
  const buf = await fetchFilingBuffer(AMF_CHANNEL, announcement.pdfUrl ?? announcement.sourceUrl)
  return extractTextFromPdfBuffer(buf)
}

// ---------------------------------------------------------------------------------------------
// Parser for Olympique Lyonnais English press releases
// ---------------------------------------------------------------------------------------------

const NAME_TOKEN = String.raw`\p{Lu}[\p{L}'’-]*`
const PARTICLE = String.raw`(?:de|De|da|Da|do|dos|di|van|von|der|le|Le|la|el|El|al|Al)`
const PROPER_RUN = String.raw`${NAME_TOKEN}(?:\s+(?:${PARTICLE}\s+)?${NAME_TOKEN})*`
/** Words that describe a player in a title ("ENGLISH MIDFIELDER TYLER MORTON"); everything up to the last one is dropped. */
const DESCRIPTOR = /^.*\b(?:INTERNATIONAL|DEFENDER|MIDFIELDER|FORWARD|STRIKER|GOALKEEPER|WINGER|FULL-BACK|CENTRE-BACK|CENTER-BACK|CAPTAIN|U\d{2})\s+/

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase())
}

/** Find a phrase from the upper-case title in the body, to recover its real casing. */
function bodyCasing(text: string, phrase: string): string | null {
  const target = foldName(phrase)
  if (!target) return null
  const words = text.split(' ')
  const n = target.split(' ').length
  for (let i = 0; i + n <= words.length; i++) {
    for (const len of [n, n + 1, n - 1]) {
      if (len < 1) continue
      const slice = words.slice(i, i + len).join(' ').replace(/[,.;:’']+s?$/, '')
      if (foldName(slice) === target && slice !== slice.toUpperCase()) return slice
    }
  }
  return null
}

/** Real casing for a title phrase: the body's spelling when it has one, else title case. */
function casingOf(text: string, phrase: string): string {
  return bodyCasing(text, phrase) ?? titleCase(phrase)
}

interface TitleShape {
  direction: TransferDirection
  loan: boolean
  player: string | null
  counterparty: string | null
  /** "UNTIL 2030" in the title */
  untilYear: number | null
}

const UNKNOWN_SHAPE: TitleShape = { direction: 'unknown', loan: false, player: null, counterparty: null, untilYear: null }

/** Read direction, loan, player and counterparty from an English Lyon filing title. */
export function classifyLyonTitle(rawTitle: string, isClub: RegExp): TitleShape {
  // Only the first clause: "X EXTENDS ... - ACQUISITION AND LOAN FOR Y" covers X.
  let t = rawTitle.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim().toUpperCase().split(/ - |!/)[0].trim()
  const untilYear = Number(t.match(/\bUNTIL (?:[A-Z]+ )?(\d{4})\b/)?.[1]) || null
  const loanInTitle = /\bLOAN/.test(t)
  t = t.replace(/,? (?:ON LOAN(?! TO)|UNTIL|WITH|FOR AN?)\b.*$/, '').trim()
  if (/\bTRIGGER\b|\bPURCHASE OPTION\b/.test(t)) return UNKNOWN_SHAPE // two moves in one release
  const isUs = (club: string) => isClub.test(club.replace(/^THE /, '').trim())
  const clean = (p: string) => p.replace(DESCRIPTOR, '').replace(/'S$/, '').trim()
  const shape = (direction: TransferDirection, player: string, counterparty: string | null, loan = loanInTitle): TitleShape => ({
    direction, loan, player: clean(player), counterparty: counterparty ? counterparty.replace(/^THE /, '').trim() : null, untilYear,
  })
  let m: RegExpMatchArray | null
  if ((m = t.match(/^(?:PERMANENT )?TRANSFER OF (.+?) TO (.+)$/)) || (m = t.match(/^(.+?)'S TRANSFER TO (.+)$/)) || (m = t.match(/^(.+?) TRANSFERRED TO (.+)$/))) {
    return isUs(m[2]) ? shape('acquisition', m[1], null) : shape('disposal', m[1], m[2])
  }
  if ((m = t.match(/^LOAN OF (.+?) TO (.+)$/)) || (m = t.match(/^(.+?) (?:LOANED|ON LOAN) TO (.+)$/))) {
    return isUs(m[2]) ? shape('acquisition', m[1], null, true) : shape('disposal', m[1], m[2], true)
  }
  if ((m = t.match(/^(.+?) JOINS (.+)$/))) return isUs(m[2]) ? shape('acquisition', m[1], null) : shape('disposal', m[1], m[2])
  if ((m = t.match(/^ARRIVAL OF (.+?)(?: AT (?:OL|OLYMPIQUE LYONNAIS))?$/)) || (m = t.match(/^(.+?) ARRIVES\b/))) return shape('acquisition', m[1], null)
  if ((m = t.match(/^(.+?) (?:EXTENDS|SIGNS (?:A )?(?:CONTRACT )?EXTENSION)\b/))) return shape('extension', m[1], null, false)
  if ((m = t.match(/^(.+?) SIGNS?\b/))) return shape('acquisition', m[1], null)
  // Direction not in the title ("TRANSFER OF X", "LOAN FOR X"): the body decides.
  if ((m = t.match(/^(?:PERMANENT )?TRANSFER OF (.+)$/)) || (m = t.match(/^LOAN FOR (.+)$/))) return shape('unknown', m[1], null)
  return UNKNOWN_SHAPE
}

/** Player name in the opening: the capitalised run before "from/to/on/,/who", checked against the title's name. */
function findPlayerName(head: string, titlePlayer: string): string | null {
  const foldedTitle = ` ${foldName(titlePlayer)} `
  const re = new RegExp(String.raw`(?:^|\s)(${PROPER_RUN})(?=\s*(?:,|\bfrom\b|\bto\b|\bon\b|\bwho\b|\bhas\b|\bfor\b|\binto\b|’s|'s))`, 'gu')
  for (const m of head.matchAll(re)) {
    const tokens = m[1].split(/\s+/)
    while (tokens.length > 1 && !foldedTitle.includes(` ${foldName(tokens.join(' '))} `)) tokens.shift()
    const candidate = tokens.join(' ')
    if (foldName(candidate) === foldName(titlePlayer)) return candidate
  }
  return null
}

const AMOUNT = String.raw`(?:€|EUR)\s*\d[\d.,]*\s*(?:million|m)\b`
const amountAt = (head: string, re: RegExp): number | null => {
  const m = head.match(re)
  return m ? parseEuroMillions(m[0]) : null
}

/** Body text with the missing spaces the extractor sometimes drops around amounts restored. */
function spaceAmounts(s: string): string {
  return s
    .replace(/€\s+/g, '€')
    .replace(/(\d)\. (\d)/g, '$1.$2') // "€ 0. 6 million"
    .replace(/(\d) (\d)\s?%/g, '$1$2%') // "2 0%"
    .replace(/(\d\s?(?:million|M))(?=[a-z,])/g, '$1 ') // "€33.6million,including"
    .replace(/([a-z,])(€)/g, '$1 $2') // "couldreach€33.6"
}

export function parseLyonAnnouncementText(
  rawText: string,
  title: string,
  publishedAt: Date,
  sourceUrl: string,
  portalId = 'lyon_eagle'
): ExtractedTransferFact | null {
  const isClub = AMF_ISSUERS[portalId]?.clubAliases ?? /^(?:OL|OLYMPIQUE LYONNAIS|LYON)$/i
  const text = spaceAmounts(normalizeFilingText(rawText))
  const head = text.slice(0, 900)
  const shape = classifyLyonTitle(title, isClub)
  if (!shape.player) return null
  if (/\bhead coach\b|\bmanager\b/i.test(head.slice(0, 400))) return null

  // Direction the title leaves open, from the opening sentence.
  let direction = shape.direction
  if (direction === 'unknown') {
    if (/\b(?:signing of|arrival of|exercised the purchase option for|joins the club|welcome)\b/i.test(head)) direction = 'acquisition'
    else if (/\b(?:transfer|loan) of [^.]{0,80}? to (?!Olympique Lyonnais|OL\b)\p{Lu}/u.test(head)) direction = 'disposal'
    else return null
  }

  const hasText = head.replace(/^.{0,120}PRESS RELEA\S*/i, '').length > 200
  const playerName = findPlayerName(head, shape.player) ?? casingOf(head, shape.player)

  // Loans: the title says so, or the opening does.
  // Exercising a purchase option ends a loan: that release is a permanent move.
  const optionExercised = /\bexercised the purchase option\b/i.test(head) && !shape.loan
  const isLoan = !optionExercised && (shape.loan || /\b(?:announces the loan of|on (?:a )?(?:season-long |paid )?loan|loan fee|loan deal)\b/i.test(head))
  const transferType: TransferType = direction === 'extension' ? 'unknown' : isLoan ? 'loan' : 'permanent'

  // Counterparty: the title for departures, the opening for arrivals.
  let counterpartyName: string | null = shape.counterparty ? casingOf(head, shape.counterparty) : null
  if (!counterpartyName && direction !== 'extension') {
    const m =
      head.match(new RegExp(String.raw`\b(?:agreement|reached an agreement) (?:has been reached )?with (${PROPER_RUN}) for\b`, 'u')) ??
      head.match(new RegExp(String.raw`\bloan (?:until [^,.]+? )?from (${PROPER_RUN})`, 'u')) ??
      head.match(new RegExp(String.raw`\bpurchase option for [^.]{0,60}? from (${PROPER_RUN})`, 'u')) ??
      (direction === 'acquisition' ? head.match(new RegExp(String.raw`\bfrom (${PROPER_RUN})`, 'u')) : null) ??
      (direction === 'disposal' ? head.match(new RegExp(String.raw`\bto (?:the )?(${PROPER_RUN})`, 'u')) : null)
    if (m && !isClub.test(m[1])) counterpartyName = m[1].replace(/\s+(?:The|A|He|She)$/, '')
  }

  // Fee and add-ons, in euros. A loan's purchase-option price is not its fee.
  let feeAmount: number | null = null
  let addOnsAmount: number | null = null
  let maxTotal: number | null = null
  let optionPrice: number | null = null
  const reach = amountAt(head, new RegExp(String.raw`fee that could\s*reach\s*${AMOUNT}`, 'i'))
  const including = amountAt(head, new RegExp(String.raw`including\s*${AMOUNT}(?=\s*in\s*(?:bonuses|add-ons|variables))`, 'i'))
  if (reach != null) {
    maxTotal = reach
    addOnsAmount = including
    feeAmount = including != null ? reach - including : null
  } else {
    feeAmount =
      amountAt(head, new RegExp(String.raw`(?:loan fee of|for a fee of|transfer fee amounts to|fee amounts to|fixed fee of|deal (?:is worth|amounts to)|transfer (?:amounts to|is worth)|loan deal worth|paid loan worth (?:up to )?)\s*${AMOUNT}`, 'i')) ??
      amountAt(head, new RegExp(String.raw`${AMOUNT}\s*transfer deal`, 'i'))
    addOnsAmount =
      amountAt(head, new RegExp(String.raw`maximum of\s*${AMOUNT}(?=\s*in\s*(?:bonuses|add-ons|variables))`, 'i')) ??
      amountAt(head, new RegExp(String.raw`(?:add-ons|bonuses|variables)[^.€]{0,40}?(?:maximum of|up to|reach|of)\s*${AMOUNT}`, 'i')) ??
      amountAt(head, new RegExp(String.raw`up to\s*${AMOUNT}\s*in\s*(?:bonuses|add-ons|variables)`, 'i')) ??
      amountAt(head, new RegExp(String.raw`${AMOUNT}\s*in\s*(?:bonuses|add-ons|variables)\b`, 'i'))
  }
  const optionAt = amountAt(head, new RegExp(String.raw`(?:purchase option (?:set at|of)|option to buy (?:for an amount of|for)|includes an option to buy for)\s*${AMOUNT}|${AMOUNT}\s*purchase option`, 'i'))
  if (optionAt != null) {
    if (isLoan) optionPrice = optionAt
    else if (feeAmount == null) feeAmount = optionAt // the buyer exercised the option: that price is the fee
  }
  if (feeAmount != null && addOnsAmount != null && maxTotal == null) maxTotal = feeAmount + addOnsAmount

  const sellOn =
    head.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s?%\s?sell-on/i) ??
    head.match(/sell-on clause of (?:up to )?(\d{1,2}(?:[.,]\d{1,2})?)\s?%/i) ??
    head.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s?% on any future capital gain/i) ??
    head.match(/capital gain of (\d{1,2}(?:[.,]\d{1,2})?)\s?%/i)
  const sellOnPercent = sellOn ? parseDecimal(sellOn[1]) : null

  let loanOptionOrObligation: LoanOptionOrObligation = 'none'
  if (isLoan) {
    if (/\bobligation to (?:buy|purchase)|mandatory (?:purchase|option)\b/i.test(head + ' ' + title)) loanOptionOrObligation = 'obligation'
    else if (
      optionPrice != null ||
      (!/\bno (?:purchase|buy) option\b/i.test(head) && /\b(?:purchase|buy) option|option to (?:buy|purchase)\b/i.test(head + ' ' + title))
    ) {
      loanOptionOrObligation = 'option'
    }
  }

  // Contract or loan end: the opening first, then "UNTIL 2030" in the title (30 June of that year).
  let endDate: Date | null = null
  const until = head.match(/\b(?:until|through|running until) (?:the )?((?:\d{1,2}(?:st|nd|rd|th)? [A-Za-z]+,? \d{4})|(?:[A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4})|(?:[A-Za-z]+ \d{4}))/)
  if (until) endDate = parseEnglishDate(until[1])
  if (!endDate && shape.untilYear) endDate = new Date(Date.UTC(shape.untilYear, 5, 30))
  if (direction === 'disposal' && !isLoan) endDate = null // a departing player's new contract isn't ours to state

  return {
    portal: portalId,
    sourceUrl,
    publishedAt,
    title,
    playerName,
    counterpartyName,
    direction,
    transferType,
    isLoan,
    loanOptionOrObligation,
    feeAmount,
    feeCurrency: feeAmount != null ? 'EUR' : null,
    feeStatus: feeAmount != null ? (feeAmount === 0 ? 'free' : 'disclosed') : hasText ? 'undisclosed' : 'unknown',
    addOnsAmount,
    addOnsCurrency: addOnsAmount != null ? 'EUR' : null,
    sellOnPercent,
    contractExpiresOn: isLoan ? null : endDate,
    effectiveDate: publishedAt,
    details: {
      rawTitle: title,
      // Etalab 2.0 / info-financiere reuse conditions: credit DILA, the download URL, the file name and date.
      attribution: {
        producer: 'DILA (info-financiere.gouv.fr)',
        url: sourceUrl,
        file: sourceUrl.split('/').pop() ?? null,
        date: publishedAt.toISOString().slice(0, 10),
      },
      textExtracted: hasText,
      addOnsAmount,
      maxTotal,
      sellOnPercent,
      optionPrice,
      loanUntil: isLoan ? endDate?.toISOString().slice(0, 10) ?? null : null,
      loanOptionOrObligation,
    },
  }
}

/** Fetch and parse an issuer's player filings since a date. */
export async function fetchAmfFacts(
  portalId: string,
  since: Date
): Promise<{ announcements: FilingAnnouncement[]; facts: ExtractedTransferFact[]; failures: { title: string; error: string }[] }> {
  const announcements = await listAmfPlayerFilings(portalId, since)
  const facts: ExtractedTransferFact[] = []
  const failures: { title: string; error: string }[] = []
  for (const a of announcements) {
    try {
      a.rawText = await fetchAmfFilingText(a)
      const fact = parseLyonAnnouncementText(a.rawText, a.title, a.publishedAt, a.sourceUrl, portalId)
      if (fact) facts.push(fact)
      else failures.push({ title: a.title, error: 'not a single-player move' })
    } catch (err) {
      failures.push({ title: a.title, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return { announcements, facts, failures }
}
