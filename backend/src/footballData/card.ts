/**
 * The Gallia card (docs/football-data-plan.md): an EA FC-style 1–99 score per attribute,
 * computed by Gallia from licensed season stats. Every attribute is a percentile against
 * players in the same position group in the same competition-season, from per-90 numbers.
 * Labels are Gallia's own. Goalkeepers get no card: the season stats carry no goalkeeping data.
 */

export const ATTRIBUTES = ['finishing', 'creation', 'passing', 'dribbling', 'defending', 'duels', 'discipline'] as const
export type Attribute = (typeof ATTRIBUTES)[number]

/** Minutes below which a card is shown as "limited sample" (and the player isn't in the comparison pool). */
export const MIN_MINUTES = 450

export interface StatRow {
  playerId: number
  positionGroup: string | null
  minutes: number
  goals: number
  assists: number
  xg: number | null
  xa: number | null
  rating: number | null
  detail: unknown
}

export interface Card {
  playerId: number
  positionGroup: string
  overall: number
  attributes: Record<Attribute, number>
  limitedSample: boolean
  minutes: number
  poolSize: number
}

type Metric = { weight: number; value: (r: StatRow, d: Detail) => number | null; lowerIsBetter?: boolean }
type Detail = Record<string, Record<string, number | null> | undefined>

const per90 = (n: number | null | undefined, r: StatRow) => (n == null || r.minutes <= 0 ? null : (n * 90) / r.minutes)
const g = (d: Detail, group: string, key: string) => d[group]?.[key] ?? null

const METRICS: Record<Attribute, Metric[]> = {
  finishing: [
    { weight: 0.4, value: (r) => per90(r.goals, r) },
    { weight: 0.3, value: (r) => per90(r.xg, r) },
    { weight: 0.2, value: (r, d) => per90(g(d, 'shooting', 'shots_on_target'), r) },
    { weight: 0.1, value: (_r, d) => g(d, 'scoring', 'goal_conversion_percentage') },
  ],
  creation: [
    { weight: 0.4, value: (r) => per90(r.xa, r) },
    { weight: 0.3, value: (r, d) => per90(g(d, 'passing', 'key_passes'), r) },
    { weight: 0.2, value: (r, d) => per90(g(d, 'scoring', 'big_chances_created'), r) },
    { weight: 0.1, value: (r) => per90(r.assists, r) },
  ],
  passing: [
    { weight: 0.5, value: (_r, d) => g(d, 'passing', 'pass_accuracy') },
    { weight: 0.3, value: (r, d) => per90(g(d, 'passing', 'accurate_passes'), r) },
    { weight: 0.2, value: (r, d) => per90(g(d, 'passing', 'accurate_crosses'), r) },
  ],
  dribbling: [
    { weight: 0.7, value: (r, d) => per90(g(d, 'duels', 'successful_dribbles'), r) },
    { weight: 0.3, value: (_r, d) => g(d, 'duels', 'ground_duels_won_percentage') },
  ],
  defending: [
    { weight: 0.5, value: (r, d) => per90(g(d, 'defending', 'tackles'), r) },
    { weight: 0.5, value: (r, d) => per90(g(d, 'defending', 'interceptions'), r) },
  ],
  duels: [
    { weight: 0.5, value: (r, d) => per90(g(d, 'duels', 'total_duels_won'), r) },
    { weight: 0.3, value: (r, d) => per90(g(d, 'duels', 'aerial_duels_won'), r) },
    { weight: 0.2, value: (_r, d) => g(d, 'duels', 'ground_duels_won_percentage') },
  ],
  discipline: [
    {
      weight: 1,
      lowerIsBetter: true,
      value: (r, d) => per90((g(d, 'discipline', 'yellow_cards') ?? 0) + 3 * (g(d, 'discipline', 'red_cards') ?? 0) + 2 * (g(d, 'discipline', 'penalty_conceded') ?? 0), r),
    },
  ],
}

/** How much each attribute counts towards the overall, by position group (rating blended in separately). */
export const OVERALL_WEIGHTS: Record<string, Partial<Record<Attribute, number>>> = {
  FWD: { finishing: 0.35, creation: 0.2, dribbling: 0.2, passing: 0.1, duels: 0.1, defending: 0.0, discipline: 0.05 },
  MID: { passing: 0.25, creation: 0.25, defending: 0.15, duels: 0.15, dribbling: 0.1, finishing: 0.05, discipline: 0.05 },
  DEF: { defending: 0.35, duels: 0.25, passing: 0.2, creation: 0.05, dribbling: 0.05, finishing: 0.05, discipline: 0.05 },
}
const RATING_SHARE = 0.3

/** Share of the pool strictly below `v`, plus half the ties: 0–1. */
export function percentile(pool: number[], v: number, lowerIsBetter = false): number {
  if (!pool.length) return 0.5
  let below = 0
  let equal = 0
  for (const p of pool) {
    if (p === v) equal++
    else if (lowerIsBetter ? p > v : p < v) below++
  }
  return (below + equal / 2) / pool.length
}

export const toScale = (p: number) => Math.max(1, Math.min(99, Math.round(1 + p * 98)))

/** Cards for every outfield player in one competition-season. */
export function computeCards(rows: StatRow[]): Card[] {
  const out: Card[] = []
  const groups = new Map<string, StatRow[]>()
  for (const r of rows) {
    if (!r.positionGroup || !(r.positionGroup in OVERALL_WEIGHTS)) continue
    groups.set(r.positionGroup, [...(groups.get(r.positionGroup) ?? []), r])
  }
  for (const [pos, members] of groups) {
    const pool = members.filter((r) => r.minutes >= MIN_MINUTES)
    const basis = pool.length >= 5 ? pool : members // tiny leagues: compare with everyone
    // Metric values for the pool, per attribute and metric index.
    const poolValues = new Map<string, number[]>()
    for (const a of ATTRIBUTES) {
      METRICS[a].forEach((m, i) => {
        poolValues.set(`${a}:${i}`, basis.map((r) => m.value(r, (r.detail ?? {}) as Detail)).filter((v): v is number => v != null))
      })
    }
    const ratings = basis.map((r) => r.rating).filter((v): v is number => v != null)

    for (const r of members) {
      const d = (r.detail ?? {}) as Detail
      const attributes = {} as Record<Attribute, number>
      for (const a of ATTRIBUTES) {
        let sum = 0
        let wsum = 0
        METRICS[a].forEach((m, i) => {
          const v = m.value(r, d)
          if (v == null) return
          sum += m.weight * percentile(poolValues.get(`${a}:${i}`) ?? [], v, m.lowerIsBetter)
          wsum += m.weight
        })
        attributes[a] = toScale(wsum ? sum / wsum : 0.5)
      }
      const weights = OVERALL_WEIGHTS[pos]
      let attrScore = 0
      let wsum = 0
      for (const [a, w] of Object.entries(weights) as [Attribute, number][]) {
        attrScore += w * attributes[a]
        wsum += w
      }
      attrScore = wsum ? attrScore / wsum : 50
      const ratingScore = r.rating != null ? toScale(percentile(ratings, r.rating)) : attrScore
      out.push({
        playerId: r.playerId,
        positionGroup: pos,
        overall: Math.round((1 - RATING_SHARE) * attrScore + RATING_SHARE * ratingScore),
        attributes,
        limitedSample: r.minutes < MIN_MINUTES,
        minutes: r.minutes,
        poolSize: basis.length,
      })
    }
  }
  return out
}
