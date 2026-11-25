import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaClient, RumourStatus } from '@prisma/client'
import { detectOutcome, applyOutcome, resolveWindowOutcomes, isPastWindowGrace, recountSourceOutcomes } from './outcomeDetector.js'

describe('outcomeDetector: detectOutcome', () => {
  it('detects completion phrases accurately', () => {
    expect(detectOutcome('Fabrizio Romano: Here we go! Deal agreed.')).toBe('COMPLETED')
    expect(detectOutcome('Arsenal have confirmed the signing of the midfielder.')).toBe('COMPLETED')
    expect(detectOutcome('Player passed medical in London today.')).toBe('COMPLETED')
    expect(detectOutcome('He officially joins on a 5-year contract.')).toBe('COMPLETED')
    expect(detectOutcome('Player completes move to Real Madrid.')).toBe('COMPLETED')
  })

  it('detects failure and denial phrases accurately', () => {
    expect(detectOutcome('The transfer has collapsed after negotiations stalled.')).toBe('FAILED')
    expect(detectOutcome('Deal is off due to wage demands.')).toBe('FAILED')
    expect(detectOutcome('The saga is over, player will stay.')).toBe('FAILED')
    expect(detectOutcome('Manager denies links with striker.')).toBe('FAILED')
    expect(detectOutcome('Club called off the deal at the eleventh hour.')).toBe('FAILED')
  })

  it('returns null when no conclusive outcome pattern matches', () => {
    expect(detectOutcome('Talks are ongoing between both clubs.')).toBeNull()
    expect(detectOutcome('Player interested in potential summer switch.')).toBeNull()
    expect(detectOutcome('Initial bid submitted this morning.')).toBeNull()
  })
})

describe('outcomeDetector: applyOutcome', () => {
  const mockDb = {
    rumour: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    rumourHistory: {
      create: vi.fn(),
    },
    source: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves a pending rumour to COMPLETED and recounts the source from rumour statuses', async () => {
    vi.mocked(mockDb.rumour.findUnique).mockResolvedValue({
      sourceId: 10,
      status: RumourStatus.PENDING,
      computedLikelihood: 45,
    } as any)

    vi.mocked(mockDb.source.findUnique).mockResolvedValue({
      id: 10,
      name: 'Sky Sports',
      hitCount: 5,
      missCount: 2,
      reliabilityScore: 0.7,
    } as any)
    // After the update, the source has 6 completed and 2 failed rumours.
    vi.mocked(mockDb.rumour.count).mockResolvedValueOnce(6).mockResolvedValueOnce(2)

    await applyOutcome(101, 'COMPLETED', mockDb)

    expect(mockDb.rumour.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { status: RumourStatus.COMPLETED, computedLikelihood: 100 },
    })

    expect(mockDb.rumourHistory.create).toHaveBeenCalledWith({
      data: { rumourId: 101, computedLikelihood: 100, status: RumourStatus.COMPLETED },
    })

    expect(mockDb.source.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: expect.objectContaining({
        hitCount: 6,
        missCount: 2,
      }),
    })
  })

  it('respects sticky terminal status unless force=true', async () => {
    vi.mocked(mockDb.rumour.findUnique).mockResolvedValue({
      sourceId: 10,
      status: RumourStatus.COMPLETED,
      computedLikelihood: 100,
    } as any)

    // Attempting to flip without force
    await applyOutcome(101, 'FAILED', mockDb, false)
    expect(mockDb.rumour.update).not.toHaveBeenCalled()

    // With force=true (admin correction)
    vi.mocked(mockDb.source.findUnique).mockResolvedValue({
      id: 10,
      name: 'Sky Sports',
      hitCount: 6,
      missCount: 2,
      reliabilityScore: 0.72,
    } as any)

    vi.mocked(mockDb.rumour.count).mockResolvedValueOnce(5).mockResolvedValueOnce(3)
    await applyOutcome(101, 'FAILED', mockDb, true)
    expect(mockDb.rumour.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { status: RumourStatus.FAILED, computedLikelihood: 0 },
    })
    // A correction moves the count across instead of adding a second outcome.
    expect(mockDb.source.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: expect.objectContaining({ hitCount: 5, missCount: 3 }),
    })
  })

  it('writes the terminal history row at knownAt when given', async () => {
    vi.mocked(mockDb.rumour.findUnique).mockResolvedValue({
      sourceId: 10,
      status: RumourStatus.HOT,
      computedLikelihood: 80,
    } as any)
    vi.mocked(mockDb.source.findUnique).mockResolvedValue({
      id: 10, name: 'Sky Sports', hitCount: 6, missCount: 2, reliabilityScore: 0.72,
    } as any)
    vi.mocked(mockDb.rumour.count).mockResolvedValueOnce(7).mockResolvedValueOnce(2)

    const knownAt = new Date('2026-08-20T09:00:00Z')
    await applyOutcome(101, 'COMPLETED', mockDb, false, knownAt)

    expect(mockDb.rumourHistory.create).toHaveBeenCalledWith({
      data: { rumourId: 101, computedLikelihood: 100, status: RumourStatus.COMPLETED, recordedAt: knownAt },
    })
  })
})

describe('outcomeDetector: recountSourceOutcomes', () => {
  function db(source: Record<string, number>, hits: number, misses: number) {
    return {
      source: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, ...source }),
        update: vi.fn(),
      },
      rumour: { count: vi.fn().mockResolvedValueOnce(hits).mockResolvedValueOnce(misses) },
    } as unknown as PrismaClient
  }

  it('does nothing when the stored counts already match', async () => {
    const d = db({ hitCount: 3, missCount: 1, reliabilityScore: 0.7 }, 3, 1)
    await recountSourceOutcomes(1, d)
    expect(d.source.update).not.toHaveBeenCalled()
  })

  it('removes a wrongly counted miss and recovers the prior below full weight', async () => {
    // Prior 0.6, 4 outcomes (3 hits): weight 0.2, score 0.6*0.8 + 0.75*0.2 = 0.63
    const d = db({ hitCount: 3, missCount: 1, reliabilityScore: 0.63 }, 3, 0)
    await recountSourceOutcomes(1, d)
    const data = vi.mocked(d.source.update).mock.calls[0][0].data as { hitCount: number; missCount: number; reliabilityScore: number }
    expect(data.hitCount).toBe(3)
    expect(data.missCount).toBe(0)
    // 3 outcomes, all hits: weight 0.15, 0.6*0.85 + 1*0.15 = 0.66
    expect(data.reliabilityScore).toBeCloseTo(0.66, 4)
  })
})

describe('outcomeDetector: resolveWindowOutcomes', () => {
  it('completes matched rumours past the 48h cutoff and leaves mismatches for review', async () => {
    const mockDb = {
      rumour: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      rumourHistory: {
        create: vi.fn(),
      },
      source: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaClient

    const pastDate = new Date('2026-07-15T12:00:00Z') // Summer window
    const nowAfterWindow = new Date('2026-09-10T12:00:00Z') // After Sept 2 cutoff + 48h

    vi.mocked(mockDb.rumour.findMany).mockResolvedValue([
      {
        id: 1,
        window: 'SUMMER',
        rumourDate: pastDate,
        toClubId: 100,
        sourceId: 5,
        status: RumourStatus.HOT,
        computedLikelihood: 80,
        player: { currentClubId: 200 }, // Synced club differs: could be a stale or out-of-coverage sync -> review
      },
      {
        id: 2,
        window: 'SUMMER',
        rumourDate: pastDate,
        toClubId: 300,
        sourceId: 5,
        status: RumourStatus.PENDING,
        computedLikelihood: 50,
        player: { currentClubId: 300 }, // Player moved to club 300 -> COMPLETED
      },
    ] as any)

    vi.mocked(mockDb.rumour.findUnique).mockImplementation((async ({ where }: any) => {
      if (where.id === 1) return { sourceId: 5, status: RumourStatus.HOT, computedLikelihood: 80 } as any
      if (where.id === 2) return { sourceId: 5, status: RumourStatus.PENDING, computedLikelihood: 50 } as any
      return null
    }) as any)

    vi.mocked(mockDb.source.findUnique).mockResolvedValue({
      id: 5,
      name: 'BBC',
      hitCount: 10,
      missCount: 5,
      reliabilityScore: 0.65,
    } as any)

    const summary = await resolveWindowOutcomes(mockDb, nowAfterWindow, {
      summerCutoffMonthDay: '09-02',
      winterCutoffMonthDay: '02-02',
    })

    expect(summary.checked).toBe(2)
    expect(summary.resolved).toBe(1)
    expect(summary.completed).toBe(1)
    expect(summary.awaitingReview).toBe(1)

    // A club mismatch is never written as FAILED: the rumour is left untouched.
    expect(mockDb.rumour.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    )
    expect(mockDb.rumour.update).toHaveBeenCalledTimes(1)

    expect(mockDb.rumour.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { status: RumourStatus.COMPLETED, computedLikelihood: 100 },
    })
  })

  it('never resolves a voided rumour, even on a club match', async () => {
    const mockDb = {
      rumour: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 9,
            window: 'SUMMER',
            rumourDate: new Date('2026-07-15T12:00:00Z'),
            toClubId: 300,
            notes: 'VOID: duplicate of #146',
            player: { currentClubId: 300 },
          },
        ]),
        update: vi.fn(),
      },
    } as unknown as PrismaClient

    const summary = await resolveWindowOutcomes(mockDb, new Date('2026-09-10T12:00:00Z'), {
      summerCutoffMonthDay: '09-02',
      winterCutoffMonthDay: '02-02',
    })
    expect(summary.completed).toBe(0)
    expect(mockDb.rumour.update).not.toHaveBeenCalled()
  })

  it('leaves rumours pending when the window is still open', async () => {
    const mockDb = {
      rumour: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient

    const midWindowDate = new Date('2026-07-20T12:00:00Z')
    const nowMidWindow = new Date('2026-08-01T12:00:00Z')

    vi.mocked(mockDb.rumour.findMany).mockResolvedValue([
      {
        id: 3,
        window: 'SUMMER',
        rumourDate: midWindowDate,
        toClubId: 100,
        player: { currentClubId: 50 },
      },
    ] as any)

    const summary = await resolveWindowOutcomes(mockDb, nowMidWindow, {
      summerCutoffMonthDay: '09-02',
      winterCutoffMonthDay: '02-02',
    })

    expect(summary.checked).toBe(1)
    expect(summary.resolved).toBe(0)
    expect(summary.completed).toBe(0)
    expect(summary.awaitingReview).toBe(0)
  })

  it('isPastWindowGrace is false inside the 48h grace period and true after it', () => {
    const config = { summerCutoffMonthDay: '09-02', winterCutoffMonthDay: '02-02' }
    const rumour = { window: 'SUMMER', rumourDate: new Date('2026-07-15T12:00:00Z') }
    expect(isPastWindowGrace(rumour, new Date('2026-09-03T00:00:00Z'), config)).toBe(false)
    expect(isPastWindowGrace(rumour, new Date('2026-09-10T00:00:00Z'), config)).toBe(true)
    expect(isPastWindowGrace({ ...rumour, window: null }, new Date('2027-01-01T00:00:00Z'), config)).toBe(false)
  })
})
