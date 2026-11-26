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

export interface PortalInfo {
  id: string
  clubName: string
  country: string
  exchange: string
  ticker?: string
  regulatoryFramework: string
  announcementUrl: string
  feesStated: boolean
  contractLengthStated: boolean
  format: 'HTML' | 'PDF' | 'JSON' | 'MIXED'
  automatedAccessAllowed: boolean
  accessNotes: string
  termsQuotation: string
}
