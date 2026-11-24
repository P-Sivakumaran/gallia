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
export interface GalliaWorkspace {
  mode: 'illustrative' | 'connected'
  reason: string
  claims: GalliaClaim[]
}
