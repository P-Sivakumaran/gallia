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
  /**
   * When the outcome became public (e.g. the club announcement's date). The
   * terminal history row is written at this time, so the ledger never scores
   * an estimate recorded after the answer was known. Defaults to now.
   */
  knownAt?: Date,
): Promise<void> {
  const rumour = await db.rumour.findUnique({
    where: { id: rumourId },
    select: { sourceId: true, status: true, computedLikelihood: true },
  })
  if (!rumour) return
  if (rumour.status === outcome) return

  // Terminal status is sticky — don't let a later signal (or a stale re-ingest)
  // flip an already-resolved rumour. Admin corrections (force=true) are allowed through.
  const TERMINAL: RumourStatus[] = [RumourStatus.COMPLETED, RumourStatus.FAILED, RumourStatus.DENIED]
  if (!force && TERMINAL.includes(rumour.status)) return

  const newLikelihood =
    outcome === 'COMPLETED' ? 100 : outcome === 'FAILED' || outcome === 'DENIED' ? 0 : rumour.computedLikelihood

  await db.rumour.update({
    where: { id: rumourId },
    data: { status: outcome as RumourStatus, computedLikelihood: newLikelihood },
  })
  await db.rumourHistory.create({
    data: {
      rumourId,
      computedLikelihood: newLikelihood,
      status: outcome as RumourStatus,
      ...(knownAt ? { recordedAt: knownAt } : {}),
    },
  })

  await recountSourceOutcomes(rumour.sourceId, db)
}

type SourceCountDb = Pick<PrismaClient, 'rumour' | 'source'>

const BLEND_FULL_WEIGHT_AT = 20

function blendWeight(total: number): number {
  return Math.min(total / BLEND_FULL_WEIGHT_AT, 1)
}

/**
 * Recomputes a source's hitCount/missCount from the current terminal statuses
 * of its rumours, then re-blends reliabilityScore. Idempotent, so corrections
 * (a FAILED reopened or flipped to COMPLETED) leave no stale miss behind.
 *
 * reliabilityScore was built by repeated incremental blends and the source's
 * original prior is not stored, so the prior is estimated by inverting one
 * blend step from the stored counts. When the old counts already reached full
 * weight the prior is unrecoverable and the current score stands in for it;
 * at full weight it no longer affects the result anyway. This is an
 * approximation, not an exact replay.
 */
export async function recountSourceOutcomes(sourceId: number, db: SourceCountDb): Promise<void> {
  const source = await db.source.findUnique({ where: { id: sourceId } })
  if (!source) return

  const [hits, misses] = await Promise.all([
    db.rumour.count({ where: { sourceId, status: RumourStatus.COMPLETED } }),
    db.rumour.count({ where: { sourceId, status: { in: [RumourStatus.FAILED, RumourStatus.DENIED] } } }),
  ])
  if (hits === source.hitCount && misses === source.missCount) return

  const oldTotal = source.hitCount + source.missCount
  const oldWeight = blendWeight(oldTotal)
  let prior = source.reliabilityScore
  if (oldTotal > 0 && oldWeight < 1) {
    const oldRate = source.hitCount / oldTotal
    prior = Math.max(0, Math.min(1, (source.reliabilityScore - oldRate * oldWeight) / (1 - oldWeight)))
  }

  const total = hits + misses
  const score = total === 0 ? prior : prior * (1 - blendWeight(total)) + (hits / total) * blendWeight(total)

  await db.source.update({
    where: { id: sourceId },
    data: { hitCount: hits, missCount: misses, reliabilityScore: Math.max(0.1, Math.min(0.99, score)) },
  })
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
/**
 * Void rumours (wrong match, duplicate, never a forecast) stay open and
 * unscored until a VOID status exists; see docs/resolution-rules.md. They
 * are marked by a notes prefix so nothing resolves them automatically.
 */
export const VOID_NOTE_PREFIX = 'VOID:'
/** Prisma filter for public lists: leaves voided rumours out (NULL-safe). */
export const NOT_VOIDED = { OR: [{ notes: null }, { NOT: { notes: { startsWith: VOID_NOTE_PREFIX } } }] }

export function isVoided(r: { notes?: string | null }): boolean {
  return Boolean(r.notes?.startsWith(VOID_NOTE_PREFIX))
}

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
    if (isVoided(r)) continue

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
