import 'server-only'
import { projectId, publicAnonKey } from '../../../utils/supabase/info'
import { illustrativeClaims } from './gallia-demo'
import type { GalliaClaim, GalliaEvidence, GalliaWorkspace } from './gallia-types'
import type { Claim, Club, Player, EvidenceItemData } from '@/types'

async function readTable<T>(name: string): Promise<T[]> {
  const response = await fetch(`https://${projectId}.supabase.co/rest/v1/${name}?select=*&limit=500`, {
    headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'restricted' : 'unavailable')
  const rows: unknown = await response.json()
  if (!Array.isArray(rows)) throw new Error('unavailable')
  return rows as T[]
}

export async function loadGalliaWorkspace(): Promise<GalliaWorkspace> {
  try {
    const [claims, evidence, players, clubs] = await Promise.all([
      readTable<Claim>('claims'), readTable<EvidenceItemData>('evidence_items'),
      readTable<Player & { currentClubId?: number }>('players'), readTable<Club>('clubs'),
    ])
    const records: GalliaClaim[] = claims.map((claim) => {
      const player = players.find((p) => p.id === claim.playerId)
      const from = clubs.find((c) => c.id === claim.fromClubId)
      const to = clubs.find((c) => c.id === claim.toClubId)
      const items: GalliaEvidence[] = evidence.filter((e) => e.claimId === claim.id).map((e) => ({
        id: String(e.id), direction: ['CONFIRMS', 'SUPPORTS'].includes(e.evidenceDirection) ? 'SUPPORTS' : ['DENIES', 'CONTRADICTS'].includes(e.evidenceDirection) ? 'CONTRADICTS' : 'CONTEXTUAL',
        source: e.authorName || e.sourceName || e.sourceType, tier: e.sourceTier ?? null,
        title: e.title, excerpt: e.rawExcerpt, time: e.publishedAt,
        url: /^https?:\/\//.test(e.canonicalUrl) ? e.canonicalUrl : undefined,
        parentId: e.parentEvidenceItemId ? String(e.parentEvidenceItemId) : undefined,
      }))
      return {
        id: String(claim.id), playerId: claim.playerId, name: player?.name || `Player ${claim.playerId}`,
        position: player?.position || '—', age: player?.age?.toString() || '—', nationality: player?.nationality || '—',
        from: from?.name || 'Unspecified', to: to?.name || 'Unspecified', league: to?.league || from?.league || 'Unknown',
        status: claim.claimStatus === 'CONFIRMED' ? 'Confirmed' : claim.claimStatus === 'DENIED' ? 'Denied' : 'Smoke',
        // A raw claim is not a calibrated forecast. Never infer a probability.
        probability: null, delta: null, tier: items.find((e) => e.tier)?.tier ?? null,
        fee: claim.statedFee != null ? `€${claim.statedFee}m` : 'Undisclosed',
        contract: player?.contractEnd ? new Date(player.contractEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Unknown',
        headline: `${player?.name || 'Player'} · proposed move to ${to?.name || 'an unspecified club'}.`,
        evidence: items, trend: [],
      }
    })
    return { mode: 'connected', reason: 'Authorized public records · calibrated forecasts pending model verification', claims: records }
  } catch (error) {
    return {
      mode: 'illustrative',
      reason: error instanceof Error && error.message === 'restricted'
        ? 'Supabase connected · table access restricted'
        : 'Supabase data currently unavailable',
      claims: illustrativeClaims,
    }
  }
}
