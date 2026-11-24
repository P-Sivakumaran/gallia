import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaClient, RumourStatus } from '@prisma/client'
import { detectOutcome, applyOutcome, resolveWindowOutcomes } from './outcomeDetector.js'

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

  it('resolves a pending rumour to COMPLETED and blends source reliability', async () => {
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

    await applyOutcome(101, 'FAILED', mockDb, true)
    expect(mockDb.rumour.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { status: RumourStatus.FAILED, computedLikelihood: 0 },
    })
  })
})

describe('outcomeDetector: resolveWindowOutcomes', () => {
  it('automatically resolves expired rumours past the 48h cutoff', async () => {
    const mockDb = {
      rumour: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
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
        player: { currentClubId: 200 }, // Player did NOT move to club 100 -> FAILED
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

    vi.mocked(mockDb.rumour.findUnique).mockImplementation(async ({ where }: any) => {
      if (where.id === 1) return { sourceId: 5, status: RumourStatus.HOT, computedLikelihood: 80 } as any
      if (where.id === 2) return { sourceId: 5, status: RumourStatus.PENDING, computedLikelihood: 50 } as any
      return null
    })

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
    expect(summary.resolved).toBe(2)
    expect(summary.completed).toBe(1)
    expect(summary.failed).toBe(1)

    expect(mockDb.rumour.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: RumourStatus.FAILED, computedLikelihood: 0 },
    })

    expect(mockDb.rumour.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { status: RumourStatus.COMPLETED, computedLikelihood: 100 },
    })
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
    expect(summary.failed).toBe(0)
  })
})
