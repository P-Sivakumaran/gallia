export type SignalStatus = 'Hot' | 'Smoke' | 'Confirmed' | 'Denied'
export interface GalliaEvidence {
  id: string
  direction: 'SUPPORTS' | 'CONTRADICTS' | 'CONTEXTUAL'
  source: string
  tier: number | null
  title: string
  excerpt: string
  time: string
  url?: string
  parentId?: string
}
export interface GalliaClaim {
  id: string
  playerId?: number
  name: string
  position: string
  age: string
  nationality: string
  from: string
  to: string
  league: string
  status: SignalStatus
  probability: number | null
  delta: number | null
  tier: number | null
  fee: string
  contract: string
  headline: string
  evidence: GalliaEvidence[]
  trend: number[]
}
export interface GalliaLedgerRow {
  id: string
  player: string
  route: string
  peak: number
  scored: number
  trend: number[]
  window: string
  outcome: 'Completed' | 'Failed'
  brier: number
  payout: number
}
export interface GalliaMetrics {
  activeSignals: number
  newToday: number
  highConviction: number
  sourcesMonitored: number
  headlinesThisWeek: number
}
export interface GalliaWorkspace {
  mode: 'illustrative' | 'connected'
  reason: string
  claims: GalliaClaim[]
  // Present when served by the Gallia backend (GET /gallia/workspace). 'heuristic' means the
  // likelihoods are the scoring engine's estimates, not calibrated forecasts, and are labelled so.
  forecastBasis?: 'heuristic' | 'calibrated'
  generatedAt?: string
  metrics?: GalliaMetrics
  ledger?: { rows: GalliaLedgerRow[]; brierScore: number | null; scored: number; excluded: number }
  ticker?: { id: string; age: string }[]
  leagues?: string[]
}
