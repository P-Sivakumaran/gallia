import type { MatchEvent, MatchShot } from '@/types'

const TIMELINE_TYPES = /^(goal|own_goal|penalty_goal|penalty_missed|penalty_saved|yellow_card|second_yellow_card|red_card|substitution|var|var_decision)$/i

/** Key match events for the timeline: goals, cards, subs, VAR (not period markers). */
export function filterTimelineEvents(events: MatchEvent[]): MatchEvent[] {
  return events.filter((e) => TIMELINE_TYPES.test(String(e.type)))
}

export function eventLabel(type: string): string {
  const t = type.toLowerCase()
  if (t === 'goal' || t === 'penalty_goal') return 'Goal'
  if (t === 'own_goal') return 'Own goal'
  if (t === 'penalty_missed') return 'Penalty missed'
  if (t === 'penalty_saved') return 'Penalty saved'
  if (t === 'yellow_card') return 'Yellow card'
  if (t === 'second_yellow_card') return 'Second yellow'
  if (t === 'red_card') return 'Red card'
  if (t === 'substitution') return 'Substitution'
  if (t.startsWith('var')) return 'VAR'
  return type.replace(/_/g, ' ')
}

export function minuteLabel(minute: number | null, extra: number): string {
  if (minute == null) return '—'
  if (extra > 0) return `${minute}+${extra}'`
  return `${minute}'`
}

/** Parse "4-3-3" into outfield row sizes (back → front). */
export function parseFormationRows(formation: string | null | undefined): number[] {
  if (!formation) return []
  return formation
    .split(/[-–—]/)
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
}

/**
 * Map shot coords onto an attacking half (viewBox 0 0 100 60).
 * Provider x is metres/percent from the goal line; y is pitch width 0–100.
 */
export function shotMarker(shot: MatchShot): { cx: number; cy: number; r: number } {
  const cx = Math.max(2, Math.min(98, Number(shot.y) || 50))
  const cy = Math.max(2, Math.min(58, (Number(shot.x) || 0) * 0.55))
  const xg = shot.xg ?? 0.05
  const r = Math.max(2.5, Math.min(7, 2 + xg * 10))
  return { cx, cy, r }
}

export function formatStatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isStatPair(v: unknown): v is { home: number | null; away: number | null } {
  return (
    !!v &&
    typeof v === 'object' &&
    'home' in v &&
    'away' in v &&
    (typeof (v as { home: unknown }).home === 'number' || (v as { home: unknown }).home == null) &&
    (typeof (v as { away: unknown }).away === 'number' || (v as { away: unknown }).away == null)
  )
}

const PREFERRED_STATS = ['ball_possession', 'expected_goals', 'total_shots', 'shots_on_target', 'corners', 'fouls', 'offsides', 'passes', 'accurate_passes']

export function orderedStatKeys(stats: Record<string, unknown>): string[] {
  const keys = Object.keys(stats).filter((k) => isStatPair(stats[k]))
  const preferred = PREFERRED_STATS.filter((k) => keys.includes(k))
  const rest = keys.filter((k) => !preferred.includes(k)).sort()
  return [...preferred, ...rest]
}
