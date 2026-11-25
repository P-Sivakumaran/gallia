import { PrismaClient, RumourStatus } from '@prisma/client'
import { DEFAULT_CUTOFF_CONFIG, isPastWindowGrace, type CutoffConfig } from '../forecasting/windowCutoff.js'

const COMPLETION_PATTERNS = [
  /here we go[!?]*/i,
  /\btransfer confirmed\b/i,
  /\bdeal confirmed\b/i,
  /\bsigning confirmed\b/i,
  /\bpass(es|ed)? medical\b/i,
  /\bofficial(ly)? (sign(s|ed)?|join(s|ed)?|complet(es|ed)?)\b/i,
  /\bcomplete(s|d)? (the |his |her )?move\b/i,
  /\bjoins? on (a |an )?[0-9]+[-−]year (deal|contract)\b/i,
  /\bannounced (as|as a new)\b/i,
  /\b((clubs?|[A-Za-z]+) )?(have |has )?confirmed (the |a )?signing\b/i,
]

const FAILURE_PATTERNS = [
  /\bdeal (has |is )?(fallen?|collapsed?|off|dead)\b/i,
  /\btransfer (has |is )?(fallen?|collapsed?|fail(s|ed)?|off)\b/i,
  /\bnot (happening|going ahead|joining)\b/i,
  /\bsaga (is |has )?(over|ended?)\b/i,
  /\bdeni(es|ed) (interest|links?|move|transfer)\b/i,
  /\bno deal\b/i,
  /\bfell? through\b/i,
  /\bcall(s|ed)? off (the |a )?(deal|transfer|move)\b/i,
]

export function detectOutcome(text: string): 'COMPLETED' | 'FAILED' | null {
  if (COMPLETION_PATTERNS.some((p) => p.test(text))) return 'COMPLETED'
  if (FAILURE_PATTERNS.some((p) => p.test(text))) return 'FAILED'
  return null
}

export async function applyOutcome(
  rumourId: number,
  outcome: 'COMPLETED' | 'FAILED' | 'DENIED',
  db: PrismaClient,
  force = false,
): Promise<void> {
  const rumour = await db.rumour.findUnique({
    where: { id: rumourId },
    select: { sourceId: true, status: true, computedLikelihood: true },
  })
  if (!rumour) return
  if (rumour.status === outcome) return

  // Terminal status is sticky — don't let a later signal (or a stale re-ingest)
  // flip an already-resolved rumour and double-count against source reliability.
  // Admin corrections (force=true) are allowed through.
  const TERMINAL: RumourStatus[] = [RumourStatus.COMPLETED, RumourStatus.FAILED, RumourStatus.DENIED]
  if (!force && TERMINAL.includes(rumour.status)) return

  const newLikelihood =
    outcome === 'COMPLETED' ? 100 : outcome === 'FAILED' || outcome === 'DENIED' ? 0 : rumour.computedLikelihood

  await db.rumour.update({
    where: { id: rumourId },
    data: { status: outcome as RumourStatus, computedLikelihood: newLikelihood },
  })
  await db.rumourHistory.create({
    data: { rumourId, computedLikelihood: newLikelihood, status: outcome as RumourStatus },
  })

  const isHit = outcome === 'COMPLETED'
  const source = await db.source.findUnique({ where: { id: rumour.sourceId } })
  if (!source) return

  const newHitCount = source.hitCount + (isHit ? 1 : 0)
  const newMissCount = source.missCount + (isHit ? 0 : 1)
  const totalOutcomes = newHitCount + newMissCount

  // Blend empirical hit rate into reliability score; weight grows with sample size (cap at 20)
  const empiricalRate = newHitCount / totalOutcomes
  const blendWeight = Math.min(totalOutcomes / 20, 1.0)
  const newScore = source.reliabilityScore * (1 - blendWeight) + empiricalRate * blendWeight

  await db.source.update({
    where: { id: rumour.sourceId },
    data: {
      hitCount: newHitCount,
      missCount: newMissCount,
      reliabilityScore: Math.max(0.1, Math.min(0.99, newScore)),
    },
  })

  console.log(
    `[outcome] Rumour ${rumourId} → ${outcome}. Source "${source.name}" reliability: ${source.reliabilityScore.toFixed(3)} → ${newScore.toFixed(3)}`,
  )
}

export interface WindowOutcomeSummary {
  checked: number
  resolved: number
  completed: number
  /** Past the window deadline with no confirmed move: left PENDING/HOT for owner review. */
  awaitingReview: number
}

export { isPastWindowGrace }

/**
 * Resolves rumours whose transfer window deadline passed more than 48 hours ago.
 *
 * Only a positive match is resolved automatically: if the synced player's
 * currentClubId is the rumour's target club, the rumour is marked COMPLETED.
 * A mismatch is NOT evidence the move failed. The club sync only covers the
 * leagues on the Sportmonks plan and records no per-player freshness, so a
 * player who moved outside coverage still shows his old club. Those rumours
 * stay unresolved and are counted as awaitingReview; the owner resolves them
 * through PATCH /admin/rumours/:id/outcome.
 */
export async function resolveWindowOutcomes(
  db: PrismaClient,
  now = new Date(),
  config: CutoffConfig = DEFAULT_CUTOFF_CONFIG,
): Promise<WindowOutcomeSummary> {
  const pendingRumours = await db.rumour.findMany({
    where: {
      status: { in: [RumourStatus.PENDING, RumourStatus.HOT] },
    },
    include: {
      player: { select: { currentClubId: true } },
    },
  })

  let completed = 0
  let awaitingReview = 0

  for (const r of pendingRumours) {
    if (!isPastWindowGrace(r, now, config)) continue

    const isCompleted = Boolean(r.player && r.player.currentClubId === r.toClubId)
    if (isCompleted) {
      await applyOutcome(r.id, RumourStatus.COMPLETED, db)
      completed++
    } else {
      awaitingReview++
    }
  }

  return {
    checked: pendingRumours.length,
    resolved: completed,
    completed,
    awaitingReview,
  }
}
