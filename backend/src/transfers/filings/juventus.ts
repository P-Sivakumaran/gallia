import https from 'https'
import { extractTextFromPdfBuffer } from './pdfExtractor.js'
import type { ExtractedTransferFact, FilingAnnouncement, LoanOptionOrObligation, TransferDirection, TransferType } from './types.js'

const JUVENTUS_USER_AGENT = 'GalliaTransferBot/1.0 (+https://gallia.club; transfers@gallia.club)'
const JUVENTUS_PORTAL_ID = 'juventus'
const POLITE_DELAY_MS = 2000

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
}

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

/**
 * Parse an Italian or English date string like "15 June 2026" or "30 June 2029" into a Date object.
 */
export function parseDateString(str: string): Date | null {
  const m = str.trim().match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const monthName = m[2].toLowerCase()
  const year = parseInt(m[3], 10)
  const month = MONTHS[monthName]
  if (month === undefined) return null
  return new Date(Date.UTC(year, month, day))
}

/**
 * Core parser for Juventus price-sensitive press release texts.
 */
export function parseJuventusAnnouncementText(
  text: string,
  title = '',
  publishedAt = new Date(),
  sourceUrl = ''
): ExtractedTransferFact | null {
  const normText = text.replace(/\s+/g, ' ')
  const normTitle = title.replace(/\s+/g, ' ').trim()

  // Ignore non-transfer announcements (e.g. Shareholders meetings, Financial statements, Bond issues, Director resignations)
  const isTransfer =
    /acquisition|disposal|transfer of the player|termination with the player|mutual termination|contract.*employment/i.test(
      normTitle + ' ' + normText
    ) || /player\s+([A-ZÀ-ÖØ-öø-ÿ])/i.test(normTitle)

  if (!isTransfer) return null

  // Direction
  let direction: TransferDirection = 'unknown'
  if (/mutual termination|termination with/i.test(normTitle + ' ' + normText)) {
    direction = 'termination'
  } else if (/disposal/i.test(normTitle + ' ' + normText)) {
    direction = 'disposal'
  } else if (/acquisition/i.test(normTitle + ' ' + normText)) {
    direction = 'acquisition'
  } else if (/extension|renews/i.test(normTitle + ' ' + normText)) {
    direction = 'extension'
  }

  // Type: permanent vs loan
  let isLoan = false
  let transferType: TransferType = 'permanent'
  if (/temporary acquisition|temporary disposal|loan basis/i.test(normText)) {
    isLoan = true
    transferType = 'loan'
  } else if (direction === 'termination') {
    transferType = 'unknown'
  }

  // Loan option or obligation
  let loanOptionOrObligation: LoanOptionOrObligation = 'none'
  if (/obligation to definitively acquire|obligation.*acquire/i.test(normText)) {
    loanOptionOrObligation = 'obligation'
  } else if (/right.*definitively acquire|option right.*acquire|option right execution/i.test(normText)) {
    loanOptionOrObligation = 'option'
  }

  // Player Name Extraction
  let playerName = ''

  // 1. Precise body match: "registration rights of the player <Name>" or "contract of employment with the player <Name>"
  const rightsPlayerMatch = normText.match(/(?:registration rights of the player|contract (?:of employment )?with the player)\s+([A-ZÀ-ÖØ-öø-ÿ][a-zA-ZÀ-ÖØ-öø-ÿ'\- ]+?)(?=\s*[,.;]|\s+from|\s+to|\s+until|\s+for a consideration|\s+against|\s+has been)/i)
  if (rightsPlayerMatch && rightsPlayerMatch[1].trim().length > 2) {
    playerName = rightsPlayerMatch[1].trim()
  }

  // 2. Generic body match: "player <Name>" (ignoring "Turin")
  if (!playerName) {
    const bodyPlayerMatch = normText.match(/(?:of the player|with the player|player)\s+([A-ZÀ-ÖØ-öø-ÿ][a-zA-ZÀ-ÖØ-öø-ÿ'\- ]+?)(?=\s*[,.;]|\s+from|\s+to|\s+until|\s+for a consideration|\s+against|\s+Turin)/i)
    if (bodyPlayerMatch && bodyPlayerMatch[1].trim().length > 2) {
      const candidate = bodyPlayerMatch[1].replace(/\bTurin\b.*$/i, '').trim()
      if (candidate.length > 2 && !/^(the|registration|employment|definitive|temporary)$/i.test(candidate)) {
        playerName = candidate
      }
    }
  }

  // 3. Fallback to title
  if (!playerName) {
    const titlePlayerMatch = normTitle.match(/(?:player\s+|disposal of player\s+|acquisition of player\s+|acquisition of the player\s+|disposal of the player\s+|termination with the player\s+)([A-ZÀ-ÖØ-öø-ÿ][a-zA-ZÀ-ÖØ-öø-ÿ'\- ]+)/i)
    if (titlePlayerMatch) {
      playerName = titlePlayerMatch[1].replace(/\bTurin\b.*$/i, '').trim()
    } else if (/^[A-ZÀ-ÖØ-öø-ÿ][a-zA-ZÀ-ÖØ-öø-ÿ'\- ]+$/.test(normTitle) && !/meeting|report|agreement|board|press|hotel/i.test(normTitle)) {
      playerName = normTitle.trim()
    }
  }

  // Clean any trailing "Turin" or punctuation that might slip through
  playerName = playerName.replace(/\bT\s*urin\b.*$/i, '').replace(/[-–—]\s*$/, '').trim()

  // Counterparty Club Name Extraction
  let counterpartyName: string | null = null
  const titleClubMatch = normTitle.match(/Agreement with\s+([A-Za-z0-9À-ÖØ-öø-ÿ\s.\-']+?)\s+for the/i)
  if (titleClubMatch) {
    counterpartyName = titleClubMatch[1].trim()
  } else {
    const bodyClubMatch = normText.match(/(?:from|with)\s+([A-Za-z0-9À-ÖØ-öø-ÿ\s.\-']+?)\s+(?:for the|has been reached|against a consideration)/i)
    if (bodyClubMatch && !bodyClubMatch[1].includes('Juventus')) {
      counterpartyName = bodyClubMatch[1].trim()
    }
  }

  // Fee Extraction
  let feeAmount: number | null = null
  let feeCurrency: string | null = 'EUR'
  let feeStatus: ExtractedTransferFact['feeStatus'] = 'unknown'

  if (/free loan basis|free transfer/i.test(normText)) {
    feeAmount = 0
    feeStatus = 'free'
  } else {
    // Look for consideration: "for a consideration of € X million" or "consideration is € X million"
    const feeMatch = normText.match(/consideration(?: of| is)?\s*(?:€|euro|EUR)?\s*([\d.]+)\s*million/i)
    if (feeMatch) {
      const millions = parseFloat(feeMatch[1])
      feeAmount = Math.round(millions * 1_000_000)
      feeStatus = 'disclosed'
    } else {
      // Check for option fee if loan
      const optionFeeMatch = normText.match(/(?:agreed consideration|consideration for the potential definitive acquisition) is\s*(?:€|euro|EUR)?\s*([\d.]+)\s*million/i)
      if (optionFeeMatch) {
        const millions = parseFloat(optionFeeMatch[1])
        feeAmount = Math.round(millions * 1_000_000)
        feeStatus = 'disclosed'
      }
    }
  }

  // Instalments
  let instalments: string | null = null
  let instalmentYears: number | null = null
  const instMatch = normText.match(/payable in\s+([a-z]+|\d+)\s+financial years/i)
  if (instMatch) {
    instalments = instMatch[0]
    const wordOrNum = instMatch[1].toLowerCase()
    instalmentYears = NUMBER_WORDS[wordOrNum] ?? parseInt(wordOrNum, 10)
  }

  // Add-ons / Ancillary costs / Variable bonuses
  let addOnsAmount: number | null = null
  const addOnMatch = normText.match(/(?:ancillary costs up to|increased up to a maximum of|bonuses up to|variable consideration.*?up to)\s*(?:€|euro|EUR)?\s*([\d.]+)\s*million/i)
  if (addOnMatch) {
    addOnsAmount = Math.round(parseFloat(addOnMatch[1]) * 1_000_000)
  }

  // Contract expiry date
  let contractExpiresOn: Date | null = null
  const contractMatch = normText.match(/(?:contract of employment until|until|expiring on)\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)
  if (contractMatch) {
    contractExpiresOn = parseDateString(contractMatch[1])
  }

  // Announcement date (e.g. "Turin, 15 June 2026")
  let effectiveDate: Date | null = null
  const dateMatch = normText.match(/Turin,\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)
  if (dateMatch) {
    effectiveDate = parseDateString(dateMatch[1])
  } else {
    effectiveDate = publishedAt
  }

  // Capital gain (for disposals)
  let capitalGainAmount: number | null = null
  const gainMatch = normText.match(/(?:capital gain of|positive economic effect.*?of)\s*(?:€|euro|EUR)?\s*([\d.]+)\s*million/i)
  if (gainMatch) {
    capitalGainAmount = Math.round(parseFloat(gainMatch[1]) * 1_000_000)
  }

  return {
    portal: JUVENTUS_PORTAL_ID,
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
    feeCurrency,
    feeStatus,
    instalments,
    instalmentYears: isNaN(instalmentYears as number) ? null : instalmentYears,
    addOnsAmount,
    addOnsCurrency: addOnsAmount != null ? 'EUR' : null,
    contractExpiresOn,
    effectiveDate,
    capitalGainAmount,
    details: {
      rawTitle: title,
      instalments,
      instalmentYears,
      addOnsAmount,
      capitalGainAmount,
      loanOptionOrObligation,
    },
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function httpGetBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': JUVENTUS_USER_AGENT } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGetBuffer(res.headers.location).then(resolve).catch(reject)
        }
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

function httpGetString(url: string): Promise<string> {
  return httpGetBuffer(url).then((b) => b.toString('utf8'))
}

/**
 * Fetch and extract all price-sensitive announcements for Juventus across specified seasons.
 * Respects polite delay (>= 2s per request) and identifying User-Agent.
 */
export async function fetchJuventusAnnouncements(
  seasons = ['season-2026-27', 'season-2025-26'],
  maxPagesPerSeason = 5
): Promise<{ announcements: FilingAnnouncement[]; facts: ExtractedTransferFact[] }> {
  const announcements: FilingAnnouncement[] = []
  const facts: ExtractedTransferFact[] = []

  for (const season of seasons) {
    let page = 1
    while (page <= maxPagesPerSeason) {
      const libraryUrl = `https://www.juventus.com/en/club/investor-relations/_libraries/${season}/${page}/_price-sensitive-press-releases`
      await sleep(POLITE_DELAY_MS)
      const html = await httpGetString(libraryUrl)
      if (!html || !html.includes('document-list-container-item')) break

      const itemRegex = /<a class=document-list-container-item href=([^\s>]+) text="([^"]+)"[^>]*>[\s\S]*?data-dateutc=([^\s>]+)/g
      let match: RegExpExecArray | null

      while ((match = itemRegex.exec(html)) !== null) {
        const pdfUrl = match[1]
        const rawTitle = match[2]
        const dateStr = match[3]
        const publishedAt = new Date(dateStr)

        // Only download PDF for transfer announcements
        const isTransferLikely =
          /acquisition|disposal|transfer|termination|player|david|çelik/i.test(rawTitle) &&
          !/shareholders|financial report|bond|slates|hotel/i.test(rawTitle)

        let rawText = ''
        if (isTransferLikely) {
          try {
            await sleep(POLITE_DELAY_MS)
            const pdfBuf = await httpGetBuffer(pdfUrl)
            rawText = extractTextFromPdfBuffer(pdfBuf)
          } catch (err) {
            console.error(`Failed to download/extract PDF for ${rawTitle}:`, err)
          }
        }

        const announcement: FilingAnnouncement = {
          portal: JUVENTUS_PORTAL_ID,
          sourceUrl: pdfUrl,
          publishedAt,
          title: rawTitle,
          rawText,
          pdfUrl,
        }
        announcements.push(announcement)

        if (rawText) {
          const fact = parseJuventusAnnouncementText(rawText, rawTitle, publishedAt, pdfUrl)
          if (fact && fact.playerName) {
            facts.push(fact)
          }
        }
      }

      if (!html.includes('d3-pager__cta--next')) break
      page++
    }
  }

  return { announcements, facts }
}
