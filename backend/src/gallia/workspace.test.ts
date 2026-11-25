import { describe, expect, it } from 'vitest'
import {
  buildGalliaWorkspace,
  deriveTier,
  leagueOf,
  ledgerRow,
  type HistoryRow,
  type RumourRow,
  type WorkspaceInput,
} from './workspace.js'

const now = new Date('2026-11-24T12:00:00Z')
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000)
const source = { id: 1, name: 'Sky Sports', tier: null, reliabilityScore: 0.78 }

function rumour(over: Partial<RumourRow> & { id: number }): RumourRow {
  return {
    status: 'PENDING',
    computedLikelihood: 50,
    reportedFeeMin: null,
    reportedFeeMax: null,
    window: 'SUMMER',
    rumourDate: hoursAgo(100),
    createdAt: hoursAgo(100),
    updatedAt: hoursAgo(1),
    notes: null,
    player: { id: over.id, name: `Player ${over.id}`, age: 24, position: 'ST', nationality: 'Spain', contractEnd: null },
    fromClub: { name: 'Sevilla', league: 'La Liga' },
    toClub: { name: 'Arsenal', league: 'Premier League' },
    source,
    history: [],
    ...over,
  }
}

function input(over: Partial<WorkspaceInput> = {}): WorkspaceInput {
  return { now, rumours: [], rawSignals: [], claims: [], sources: [source], headlinesThisWeek: 0, ...over }
}

const h = (likelihood: number, status: HistoryRow['status'], hrs: number): HistoryRow => ({
  computedLikelihood: likelihood, status, recordedAt: hoursAgo(hrs),
})

describe('ledgerRow', () => {
  it('scores the last pre-resolution likelihood, never the 100 written after completion', () => {
    const row = ledgerRow(rumour({
      id: 1,
      status: 'COMPLETED',
      computedLikelihood: 100,
      history: [h(40, 'PENDING', 50), h(80, 'HOT', 30), h(70, 'PENDING', 20), h(100, 'COMPLETED', 10)],
    }))
    expect(row).not.toBeNull()
    expect(row!.scored).toBe(70)
    expect(row!.peak).toBe(80)
    expect(row!.brier).toBeCloseTo(0.09, 4) // (0.70 - 1)^2
    expect(row!.payout).toBeCloseTo(0.3, 2)
    expect(row!.trend).not.toContain(100)
  })

  it('scores a failed call against 0', () => {
    const row = ledgerRow(rumour({ id: 2, status: 'FAILED', history: [h(60, 'PENDING', 5), h(0, 'FAILED', 1)] }))
    expect(row!.outcome).toBe('Failed')
    expect(row!.brier).toBeCloseTo(0.36, 4)
  })

  it('leaves out a resolved rumour that has no pre-resolution history', () => {
    expect(ledgerRow(rumour({ id: 3, status: 'COMPLETED', history: [h(100, 'COMPLETED', 1)] }))).toBeNull()
  })

  it('scores the estimate held at the window deadline, not one written while awaiting review', () => {
    const at = (iso: string, likelihood: number): HistoryRow => ({
      computedLikelihood: likelihood, status: 'PENDING', recordedAt: new Date(iso),
    })
    const row = ledgerRow(rumour({
      id: 5,
      status: 'FAILED',
      window: 'SUMMER',
      rumourDate: new Date('2026-07-01T00:00:00Z'), // deadline 2026-09-02, +48h grace
      history: [
        at('2026-08-20T00:00:00Z', 65),
        at('2026-09-20T00:00:00Z', 5), // after the deadline: knows the player stayed
        { computedLikelihood: 0, status: 'FAILED', recordedAt: new Date('2026-10-01T00:00:00Z') },
      ],
    }))
    expect(row!.scored).toBe(65)
  })

  it('ignores open rumours', () => {
    expect(ledgerRow(rumour({ id: 4, history: [h(60, 'PENDING', 1)] }))).toBeNull()
  })
})

describe('buildGalliaWorkspace', () => {
  it('puts open stories first, strongest first, so the hero is never a resolved call', () => {
    const w = buildGalliaWorkspace(input({
      rumours: [
        rumour({ id: 1, status: 'COMPLETED', computedLikelihood: 100, history: [h(90, 'HOT', 5)] }),
        rumour({ id: 2, computedLikelihood: 40 }),
        rumour({ id: 3, status: 'HOT', computedLikelihood: 82 }),
      ],
    }))
    expect(w.claims.map((c) => c.id)).toEqual(['r-3', 'r-2', 'r-1'])
    expect(w.claims[0].status).toBe('Hot')
    expect(w.claims[2].status).toBe('Confirmed')
  })

  it('shows a resolved story at its last pre-outcome likelihood and gives it no delta', () => {
    const w = buildGalliaWorkspace(input({
      rumours: [rumour({ id: 1, status: 'FAILED', computedLikelihood: 0, history: [h(65, 'PENDING', 10), h(0, 'FAILED', 2)] })],
    }))
    expect(w.claims[0].probability).toBe(65)
    expect(w.claims[0].delta).toBeNull()
    expect(w.claims[0].status).toBe('Denied')
  })

  it('computes a 24h delta for an open story from history', () => {
    const w = buildGalliaWorkspace(input({
      rumours: [rumour({ id: 1, computedLikelihood: 62, history: [h(50, 'PENDING', 48), h(55, 'PENDING', 30), h(62, 'PENDING', 1)] })],
    }))
    expect(w.claims[0].delta).toBe(7)
    expect(w.claims[0].trend.at(-1)).toBe(62)
  })

  it('averages Brier over scored calls and counts the ones it had to leave out', () => {
    const w = buildGalliaWorkspace(input({
      rumours: [
        rumour({ id: 1, status: 'COMPLETED', history: [h(80, 'HOT', 5)] }), // 0.04
        rumour({ id: 2, status: 'FAILED', history: [h(40, 'PENDING', 5)] }), // 0.16
        rumour({ id: 3, status: 'FAILED', history: [] }),
      ],
    }))
    expect(w.ledger.scored).toBe(2)
    expect(w.ledger.excluded).toBe(1)
    expect(w.ledger.brierScore).toBeCloseTo(0.1, 3)
  })

  it('labels every likelihood as heuristic', () => {
    expect(buildGalliaWorkspace(input()).forecastBasis).toBe('heuristic')
  })

  it('uses stored raw signals as evidence, newest first, and drops non-http links', () => {
    const w = buildGalliaWorkspace(input({
      rumours: [rumour({ id: 1 })],
      rawSignals: [
        { id: 10, rumourId: 1, sourceName: 'Sky Sports', headline: 'Older', summary: 's', link: 'javascript:alert(1)', publishedAt: hoursAgo(5) },
        { id: 11, rumourId: 1, sourceName: 'Sky Sports', headline: 'Newer', summary: 's', link: 'https://example.com/a', publishedAt: hoursAgo(1) },
      ],
    }))
    const ev = w.claims[0].evidence
    expect(ev.map((e) => e.title)).toEqual(['Newer', 'Older'])
    expect(ev[0].url).toBe('https://example.com/a')
    expect(ev[1].url).toBeUndefined()
    expect(w.claims[0].headline).toBe('Newer')
  })

  it('falls back to the reporting source when no article was stored, without inventing text', () => {
    const w = buildGalliaWorkspace(input({ rumours: [rumour({ id: 1 })] }))
    expect(w.claims[0].evidence).toHaveLength(1)
    expect(w.claims[0].evidence[0].source).toBe('Sky Sports')
    expect(w.claims[0].evidence[0].excerpt).toMatch(/No article text was stored/)
  })

  it('shows a TBC club as Undisclosed', () => {
    const w = buildGalliaWorkspace(input({ rumours: [rumour({ id: 1, toClub: { name: 'TBC', league: 'Champions League' } })] }))
    expect(w.claims[0].to).toBe('Undisclosed')
    expect(w.claims[0].league).toBe('La Liga')
  })
})

describe('deriveTier', () => {
  it('prefers an editorial tier, else buckets reliability', () => {
    expect(deriveTier({ tier: 4, reliabilityScore: 0.99 })).toBe(4)
    expect(deriveTier({ tier: null, reliabilityScore: 0.92 })).toBe(1)
    expect(deriveTier({ tier: null, reliabilityScore: 0.7 })).toBe(2)
    expect(deriveTier({ tier: null, reliabilityScore: 0.3 })).toBe(3)
    expect(deriveTier(undefined)).toBeNull()
  })
})

describe('leagueOf', () => {
  it('prefers a domestic league over continental competitions', () => {
    expect(leagueOf({ name: 'Aston Villa', league: 'UEFA Super Cup, Premier League' }, null)).toBe('Premier League')
    expect(leagueOf({ name: 'Levski', league: 'Champions League, Europa League' }, null)).toBe('Champions League')
    expect(leagueOf(null, null)).toBe('Unknown')
  })
})
