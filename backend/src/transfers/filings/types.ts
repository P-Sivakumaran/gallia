export type TransferDirection = 'acquisition' | 'disposal' | 'extension' | 'termination' | 'unknown'
export type TransferType = 'permanent' | 'loan' | 'loan_end' | 'free' | 'unknown'
export type FeeStatus = 'disclosed' | 'reported' | 'undisclosed' | 'free' | 'unknown'
export type LoanOptionOrObligation = 'option' | 'obligation' | 'none'

export interface FilingAnnouncement {
  portal: string
  sourceUrl: string
  publishedAt: Date
  title: string
  rawText?: string
  pdfUrl?: string | null
}

export interface ExtractedTransferFact {
  portal: string
  sourceUrl: string
  publishedAt: Date
  title: string
  playerName: string
  counterpartyName: string | null
  direction: TransferDirection
  transferType: TransferType
  isLoan: boolean
  loanOptionOrObligation: LoanOptionOrObligation
  feeAmount: number | null
  feeCurrency: string | null
  feeStatus: FeeStatus
  instalments?: string | null
  instalmentYears?: number | null
  addOnsAmount?: number | null
  addOnsCurrency?: string | null
  sellOnPercent?: number | null
  contractExpiresOn?: Date | null
  effectiveDate?: Date | null
  capitalGainAmount?: number | null
  netBookValueAmount?: number | null
  details: Record<string, unknown>
}

export interface IngestionMatchResult {
  announcement: FilingAnnouncement
  extracted: ExtractedTransferFact
  matchedPlayerId: number | null
  matchedClubId: number | null
  status: 'applied' | 'unmatched_player' | 'unmatched_club' | 'unmatched_both' | 'error'
  transferRecordStatus?: 'created' | 'upgraded' | 'kept'
  contractRecordStatus?: 'created' | 'extended' | 'unchanged'
  unmatchedFactId?: number
  error?: string
}

/**
 * Whether Gallia may fetch from a channel automatically, decided by reading its terms (not robots.txt alone).
 * - CLEARED: terms or an open licence allow automated access and reuse of the facts.
 * - BLOCKED: terms forbid bots/scraping, or the site blocks automated clients. Never fetch.
 * - NEEDS_PERMISSION: no bot ban found, but reuse is limited to personal/non-commercial use or needs consent.
 * - UNKNOWN: terms could not be read yet.
 * Only CLEARED channels may be fetched; `assertFetchAllowed` enforces it.
 */
export type ChannelAccess = 'CLEARED' | 'BLOCKED' | 'NEEDS_PERMISSION' | 'UNKNOWN'

export interface FilingChannel {
  id: string
  name: string
  kind: 'regulator' | 'club-site' | 'exchange'
  access: ChannelAccess
  termsUrl: string | null
  /** Exact wording that decided `access`, with an English gloss where needed. */
  termsQuotation: string
  reviewedOn: string
  /** Licence string written on ledger facts sourced through this channel. */
  licence: string
  /** Hosts this channel fetches from; the HTTP client refuses any other host for it. */
  hosts: string[]
}

export interface PortalInfo {
  id: string
  clubName: string
  /** Names used to find the issuer's own club row in Gallia's DB (case-insensitive contains). */
  clubMatchNames: string[]
  country: string
  exchange: string
  ticker?: string
  regulatoryFramework: string
  /** Channel Gallia would fetch this issuer's filings through. */
  channelId: string
  /** Other channels checked and rejected, for the record. */
  rejectedChannels: string[]
  feesStated: boolean
  contractLengthStated: boolean
  format: 'HTML' | 'PDF' | 'JSON' | 'MIXED'
  notes: string
}
