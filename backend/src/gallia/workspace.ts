// Public read model for the Gallia desk (frontend/src/components/gallia). One GET returns
// everything the desk renders: stories, their evidence, the heuristic likelihood and its trend,
// headline metrics and the resolved-call ledger. Pure mapping lives in buildGalliaWorkspace so
// the rules below are testable without a database.
//
// Labelling rules (see docs/gallia-product-direction.md, "Data integrity"):
// - Likelihoods here are the heuristic scoring engine's output (scoring/likelihoodEngine.ts),
//   not calibrated forecasts. forecastBasis says so and the desk labels them that way.
// - Source tiers are derived from Source.reliabilityScore at read time when no editorial tier
//   is set; nothing is written back.
// - Representation, wages and other facts the data doesn't hold are left out, not invented.

import type { PrismaClient } from '@prisma/client'
import { windowGraceEnd } from '../forecasting/windowCutoff.js'

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
  mode: 'connected'
  reason: string
  forecastBasis: 'heuristic'
  generatedAt: string
  claims: GalliaClaim[]
  metrics: GalliaMetrics
  ledger: { rows: GalliaLedgerRow[]; brierScore: number | null; scored: number; excluded: number }
  ticker: { id: string; age: string }[]
  leagues: string[]
}

// ── Input shapes (what loadGalliaWorkspace selects) ─────────────────────────

type RumourStatus = 'PENDING' | 'HOT' | 'COMPLETED' | 'FAILED' | 'DENIED'

export interface SourceRow { id: number; name: string; tier: number | null; reliabilityScore: number }
export interface ClubRow { name: string; league: string }
export interface PlayerRow {
  id: number; name: string; age: number | null; position: string | null
  nationality: string | null; contractEnd: Date | null
}
export interface HistoryRow { computedLikelihood: number; status: RumourStatus; recordedAt: Date }
export interface RawSignalRow {
  id: number; rumourId: number | null; sourceName: string; headline: string
  summary: string; link: string; publishedAt: Date
}
export interface RumourRow {
  id: number
  status: RumourStatus
  computedLikelihood: number
  reportedFeeMin: number | null
  reportedFeeMax: number | null
  window: string
  rumourDate: Date
  createdAt: Date
  updatedAt: Date
  notes: string | null
  player: PlayerRow
  fromClub: ClubRow
  toClub: ClubRow
  source: SourceRow
  history: HistoryRow[] // any order
}
export interface ClaimEvidenceRow {
  id: number; evidenceDirection: string; authorName: string | null; title: string
  rawExcerpt: string; publishedAt: Date; canonicalUrl: string; parentEvidenceItemId: number | null
  source: SourceRow
}
export interface ClaimRow {
  id: number
  claimStatus: string
  statedFee: number | null
  updatedAt: Date
  player: PlayerRow
  fromClub: ClubRow | null
  toClub: ClubRow | null
  evidence: ClaimEvidenceRow[]
}

export interface WorkspaceInput {
  now: Date
  rumours: RumourRow[]
  rawSignals: RawSignalRow[]
  claims: ClaimRow[]
  sources: SourceRow[]
  headlinesThisWeek: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000
const ACTIVE: RumourStatus[] = ['PENDING', 'HOT']

export function deriveTier(source: Pick<SourceRow, 'tier' | 'reliabilityScore'> | undefined): number | null {
  if (!source) return null
  if (source.tier != null) return source.tier
  if (source.reliabilityScore >= 0.85) return 1
  if (source.reliabilityScore >= 0.65) return 2
  return 3
}

function clubName(club: ClubRow | null | undefined): string {
  if (!club || !club.name || club.name.toUpperCase() === 'TBC') return 'Undisclosed'
  return club.name
}

const CONTINENTAL = /champions league|europa|conference league|super cup|club world cup/i

// Club.league can hold a comma-separated list of competitions from Sportmonks ("Champions League,
// Europa Conference League"). Prefer a domestic league; fall back to the first competition named.
export function leagueOf(to: ClubRow | null | undefined, from: ClubRow | null | undefined): string {
  const candidates: string[] = []
  for (const club of [to, from]) {
    if (!club || club.name.toUpperCase() === 'TBC' || !club.league || club.league === 'Unknown') continue
    candidates.push(...club.league.split(',').map((l) => l.trim()).filter(Boolean))
  }
  return candidates.find((l) => !CONTINENTAL.test(l)) ?? candidates[0] ?? 'Unknown'
}

function formatFee(min: number | null, max: number | null): string {
  const m = (n: number) => `€${Number.isInteger(n) ? n : n.toFixed(1)}m`
  if (min != null && max != null && max !== min) return `${m(min)}–${m(max)}`
  if (min != null) return m(min)
  if (max != null) return m(max)
  return 'Undisclosed'
}

function formatMonth(date: Date | null): string {
  return date ? date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Unknown'
}

export function relativeAge(then: Date, now: Date): string {
  const s = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`
  const days = Math.round(s / 86400)
  if (days < 30) return `${days}d ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function safeUrl(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined
}

function downsample(values: number[], max = 20): number[] {
  if (values.length <= max) return values
  const out: number[] = []
  for (let i = 0; i < max; i++) out.push(values[Math.round((i * (values.length - 1)) / (max - 1))])
  return out
}

// History rows recorded while the rumour was still open, before the outcome was known. The
// terminal row is written at the time the outcome became public (applyOutcome's knownAt), so an
// open row recorded after it was scored with the answer already out and must not count.
export function preResolutionHistory(history: HistoryRow[]): HistoryRow[] {
  const sorted = [...history].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
  const firstTerminal = sorted.find((h) => !ACTIVE.includes(h.status))
  return sorted.filter(
    (h) => ACTIVE.includes(h.status) && (!firstTerminal || h.recordedAt.getTime() < firstTerminal.recordedAt.getTime()),
  )
}

function trendOf(history: HistoryRow[], end: Date): number[] {
  const since = end.getTime() - 60 * DAY
  const points = history.filter((h) => h.recordedAt.getTime() >= since).map((h) => Math.round(h.computedLikelihood))
  // Collapse runs of the same value so a quiet rumour still draws a line, not hundreds of points.
  const collapsed = points.filter((v, i) => i === 0 || v !== points[i - 1] || i === points.length - 1)
  return downsample(collapsed)
}

function statusOf(r: Pick<RumourRow, 'status' | 'computedLikelihood'>): SignalStatus {
  if (r.status === 'COMPLETED') return 'Confirmed'
  if (r.status === 'FAILED' || r.status === 'DENIED') return 'Denied'
  if (r.status === 'HOT' || r.computedLikelihood > 70) return 'Hot'
  return 'Smoke'
}

function windowLabel(window: string, date: Date): string {
  const season = window === 'FREE_AGENT' ? 'FREE AGENT' : window
  return `${season} ’${String(date.getUTCFullYear()).slice(2)}`
}

// ── Mapping ─────────────────────────────────────────────────────────────────

function mapRumour(r: RumourRow, signals: RawSignalRow[], sourcesByName: Map<string, SourceRow>, now: Date): GalliaClaim {
  const open = ACTIVE.includes(r.status)
  const pre = preResolutionHistory(r.history)
  const last = pre[pre.length - 1]
  let probability: number | null
  let delta: number | null = null
  if (open) {
    probability = Math.round(r.computedLikelihood)
    const dayAgo = now.getTime() - DAY
    const before = [...pre].reverse().find((h) => h.recordedAt.getTime() <= dayAgo) ?? pre[0]
    if (before) delta = Math.round(r.computedLikelihood - before.computedLikelihood)
  } else {
    // For a resolved story, show what we said before the outcome, not the outcome itself.
    probability = last ? Math.round(last.computedLikelihood) : null
  }
  const trendEnd = open ? now : (last?.recordedAt ?? r.updatedAt)
  const trend = trendOf(pre, trendEnd)
  if (open && trend[trend.length - 1] !== probability && probability != null) trend.push(probability)

  const evidence: GalliaEvidence[] = signals.map((s) => ({
    id: `s-${s.id}`,
    direction: 'SUPPORTS',
    source: s.sourceName,
    tier: deriveTier(sourcesByName.get(s.sourceName)),
    title: s.headline,
    excerpt: s.summary || s.headline,
    time: relativeAge(s.publishedAt, now),
    url: safeUrl(s.link),
  }))
  if (!evidence.length) {
    evidence.push({
      id: `r-${r.id}-source`,
      direction: 'SUPPORTS',
      source: r.source.name,
      tier: deriveTier(r.source),
      title: `Reported by ${r.source.name}`,
      excerpt: r.notes?.trim() || `${r.source.name} reported ${r.player.name}'s move to ${clubName(r.toClub)}. No article text was stored for this report.`,
      time: relativeAge(r.rumourDate, now),
    })
  }

  const to = clubName(r.toClub)
  return {
    id: `r-${r.id}`,
    playerId: r.player.id,
    name: r.player.name,
    position: r.player.position ?? '—',
    age: r.player.age?.toString() ?? '—',
    nationality: r.player.nationality ?? '—',
    from: clubName(r.fromClub),
    to,
    league: leagueOf(r.toClub, r.fromClub),
    status: statusOf(r),
    probability,
    delta,
    tier: deriveTier(r.source),
    fee: formatFee(r.reportedFeeMin, r.reportedFeeMax),
    contract: formatMonth(r.player.contractEnd),
    headline: signals[0]?.headline ?? `${r.source.name} links ${r.player.name} with ${to === 'Undisclosed' ? 'a move' : to}.`,
    evidence,
    trend,
  }
}

function mapClaim(c: ClaimRow, now: Date): GalliaClaim {
  const evidence: GalliaEvidence[] = c.evidence.map((e) => ({
    id: `e-${e.id}`,
    direction: ['CONFIRMS', 'SUPPORTS'].includes(e.evidenceDirection) ? 'SUPPORTS'
      : ['DENIES', 'CONTRADICTS'].includes(e.evidenceDirection) ? 'CONTRADICTS' : 'CONTEXTUAL',
    source: e.authorName || e.source.name,
    tier: deriveTier(e.source),
    title: e.title,
    excerpt: e.rawExcerpt,
    time: relativeAge(e.publishedAt, now),
    url: safeUrl(e.canonicalUrl),
    parentId: e.parentEvidenceItemId ? `e-${e.parentEvidenceItemId}` : undefined,
  }))
  const tiers = evidence.map((e) => e.tier).filter((t): t is number => t != null)
  const to = clubName(c.toClub)
  return {
    id: `c-${c.id}`,
    playerId: c.player.id,
    name: c.player.name,
    position: c.player.position ?? '—',
    age: c.player.age?.toString() ?? '—',
    nationality: c.player.nationality ?? '—',
    from: clubName(c.fromClub),
    to,
    league: leagueOf(c.toClub, c.fromClub),
    status: c.claimStatus === 'CONFIRMED' ? 'Confirmed' : c.claimStatus === 'DENIED' ? 'Denied' : 'Smoke',
    // The calibrated pipeline has no verified model yet, so these claims carry no number.
    probability: null,
    delta: null,
    tier: tiers.length ? Math.min(...tiers) : null,
    fee: c.statedFee != null ? formatFee(c.statedFee, null) : 'Undisclosed',
    contract: formatMonth(c.player.contractEnd),
    headline: c.evidence[0]?.title ?? `${c.player.name} · proposed move to ${to}.`,
    evidence,
    trend: [],
  }
}

export function ledgerRow(r: RumourRow): GalliaLedgerRow | null {
  if (r.status !== 'COMPLETED' && r.status !== 'FAILED' && r.status !== 'DENIED') return null
  // Score what we said by the deadline. A rumour can stay open for review after its
  // window closes, and an estimate written then would know the answer.
  const deadline = windowGraceEnd(r)
  const pre = preResolutionHistory(r.history).filter((h) => !deadline || h.recordedAt.getTime() <= deadline.getTime())
  if (!pre.length) return null
  const scored = pre[pre.length - 1].computedLikelihood / 100
  const y = r.status === 'COMPLETED' ? 1 : 0
  const last = pre[pre.length - 1].recordedAt
  return {
    id: `r-${r.id}`,
    player: r.player.name,
    route: `${clubName(r.fromClub)} → ${clubName(r.toClub)}`,
    peak: Math.round(Math.max(...pre.map((h) => h.computedLikelihood))),
    scored: Math.round(scored * 100),
    trend: trendOf(pre, last),
    window: windowLabel(r.window, r.rumourDate),
    outcome: y === 1 ? 'Completed' : 'Failed',
    brier: Number(((scored - y) ** 2).toFixed(4)),
    payout: Number((y - scored).toFixed(2)),
  }
}

export function buildGalliaWorkspace(input: WorkspaceInput): GalliaWorkspace {
  const { now } = input
  const sourcesByName = new Map(input.sources.map((s) => [s.name, s]))
  const signalsByRumour = new Map<number, RawSignalRow[]>()
  for (const s of [...input.rawSignals].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())) {
    if (s.rumourId == null) continue
    const list = signalsByRumour.get(s.rumourId) ?? []
    if (list.length < 8) list.push(s)
    signalsByRumour.set(s.rumourId, list)
  }

  const open = input.rumours.filter((r) => ACTIVE.includes(r.status))
    .sort((a, b) => b.computedLikelihood - a.computedLikelihood)
  const resolved = input.rumours.filter((r) => !ACTIVE.includes(r.status))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const claims: GalliaClaim[] = [
    ...open.map((r) => mapRumour(r, signalsByRumour.get(r.id) ?? [], sourcesByName, now)),
    ...input.claims.filter((c) => c.claimStatus === 'ACTIVE').map((c) => mapClaim(c, now)),
    ...resolved.map((r) => mapRumour(r, signalsByRumour.get(r.id) ?? [], sourcesByName, now)),
    ...input.claims.filter((c) => c.claimStatus !== 'ACTIVE').map((c) => mapClaim(c, now)),
  ]

  const rows: GalliaLedgerRow[] = []
  let excluded = 0
  for (const r of resolved) {
    const row = ledgerRow(r)
    if (row) rows.push(row)
    else excluded++
  }
  const brierScore = rows.length
    ? Number((rows.reduce((sum, row) => sum + row.brier, 0) / rows.length).toFixed(3))
    : null

  const ticker = open
    .map((r) => ({ r, at: preResolutionHistory(r.history).at(-1)?.recordedAt ?? r.updatedAt }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 3)
    .map(({ r, at }) => ({ id: `r-${r.id}`, age: relativeAge(at, now) }))

  const leagues = [...new Set(claims.map((c) => c.league).filter((l) => l !== 'Unknown'))].sort()

  return {
    mode: 'connected',
    reason: `Live records from the Gallia desk · ${open.length} open ${open.length === 1 ? 'story' : 'stories'}, ${rows.length} resolved calls scored · likelihoods are heuristic model estimates, not calibrated forecasts`,
    forecastBasis: 'heuristic',
    generatedAt: now.toISOString(),
    claims,
    metrics: {
      activeSignals: open.length + input.claims.filter((c) => c.claimStatus === 'ACTIVE').length,
      newToday: input.rumours.filter((r) => now.getTime() - r.createdAt.getTime() <= DAY).length,
      highConviction: open.filter((r) => r.computedLikelihood >= 70).length,
      sourcesMonitored: input.sources.length,
      headlinesThisWeek: input.headlinesThisWeek,
    },
    ledger: { rows, brierScore, scored: rows.length, excluded },
    ticker,
    leagues,
  }
}

// ── Loader ──────────────────────────────────────────────────────────────────

const playerSelect = { id: true, name: true, age: true, position: true, nationality: true, contractEnd: true } as const
const clubSelect = { name: true, league: true } as const
const sourceSelect = { id: true, name: true, tier: true, reliabilityScore: true } as const

export async function loadGalliaWorkspace(prisma: PrismaClient, now = new Date()): Promise<GalliaWorkspace> {
  const [rumours, claims, sources, headlinesThisWeek] = await Promise.all([
    prisma.rumour.findMany({
      select: {
        id: true, status: true, computedLikelihood: true, reportedFeeMin: true, reportedFeeMax: true,
        window: true, rumourDate: true, createdAt: true, updatedAt: true, notes: true,
        player: { select: playerSelect }, fromClub: { select: clubSelect }, toClub: { select: clubSelect },
        source: { select: sourceSelect },
        history: { select: { computedLikelihood: true, status: true, recordedAt: true } },
      },
    }),
    prisma.claim.findMany({
      select: {
        id: true, claimStatus: true, statedFee: true, updatedAt: true,
        player: { select: playerSelect }, fromClub: { select: clubSelect }, toClub: { select: clubSelect },
        evidence: {
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true, evidenceDirection: true, authorName: true, title: true, rawExcerpt: true,
            publishedAt: true, canonicalUrl: true, parentEvidenceItemId: true, source: { select: sourceSelect },
          },
        },
      },
    }),
    prisma.source.findMany({ select: sourceSelect }),
    prisma.rawSignal.count({ where: { publishedAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
  ])
  const rawSignals = await prisma.rawSignal.findMany({
    where: { rumourId: { in: rumours.map((r) => r.id) } },
    select: { id: true, rumourId: true, sourceName: true, headline: true, summary: true, link: true, publishedAt: true },
  })
  return buildGalliaWorkspace({
    now,
    rumours: rumours as RumourRow[],
    rawSignals,
    claims: claims as ClaimRow[],
    sources,
    headlinesThisWeek,
  })
}
