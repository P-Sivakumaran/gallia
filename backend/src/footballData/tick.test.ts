import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { runFootballDataSync } from './sync.js'
import { pruneSnapshots, writeSnapshot } from './snapshot.js'
import { fetchMatchDetail } from './matchDetail.js'
import { runFootballTick } from './tick.js'

vi.mock('./sync.js', () => ({ runFootballDataSync: vi.fn(async () => ({})) }))
vi.mock('./matchDetail.js', () => ({ fetchMatchDetail: vi.fn(async () => false) }))
vi.mock('./snapshot.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./snapshot.js')>()
  return { ...actual, writeSnapshot: vi.fn(async () => {}), pruneSnapshots: vi.fn(async () => 0) }
})

const NOW = Date.UTC(2026, 10, 26, 12)
const HOUR = 3_600_000

function db(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    competition: {
      findMany: vi.fn(async () => [{ id: 1, name: 'Premier League', tsaId: 'comp_pl', seasons: [{ id: 10 }] }]),
    },
    providerRequest: {
      findFirst: vi.fn(async ({ where }: { where: { kind: string } }) => {
        if (where.kind === 'fixtures') return { at: new Date(NOW) }
        if (where.kind === 'standings') return { at: new Date(NOW) }
        if (where.kind === 'squad') return { at: new Date(NOW) }
        return null
      }),
    },
    fixture: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    gameweekSnapshot: {
      findMany: vi.fn(async () => []),
    },
    ...overrides,
  } as unknown as PrismaClient
}

const api = { stats: { requests: 0 } } as any

describe('runFootballTick', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes standings when a finished match settled since the last table refresh', async () => {
    const fixture = {
      count: vi.fn()
        .mockResolvedValueOnce(0) // no stale scheduled/live fixtures
        .mockResolvedValueOnce(1), // but a finished fixture needs a table refresh
      findMany: vi.fn()
        .mockResolvedValueOnce([{ matchday: 1, status: 'scheduled', kickoffAt: new Date(NOW + HOUR), homeClubId: 1, awayClubId: 2 }])
        .mockResolvedValueOnce([]),
    }

    await runFootballTick(db({ fixture }), api, NOW)

    expect(runFootballDataSync).toHaveBeenCalledWith(expect.anything(), api, expect.objectContaining({
      only: ['fixtures', 'standings'],
      competitionTsaIds: ['comp_pl'],
    }))
  })

  it('refreshes standings before freezing a new gameweek snapshot', async () => {
    const fixture = {
      count: vi.fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0),
      findMany: vi.fn()
        .mockResolvedValueOnce([
          { matchday: 12, status: 'finished', kickoffAt: new Date(NOW - 6 * HOUR), homeClubId: 1, awayClubId: 2 },
        ])
        .mockResolvedValueOnce([]),
    }

    await runFootballTick(db({ fixture }), api, NOW)

    expect(runFootballDataSync).toHaveBeenNthCalledWith(1, expect.anything(), api, expect.objectContaining({
      only: ['standings'],
      competitionTsaIds: ['comp_pl'],
    }))
    expect(runFootballDataSync).toHaveBeenNthCalledWith(2, expect.anything(), api, expect.objectContaining({
      only: ['player-stats'],
      competitionTsaIds: ['comp_pl'],
      clubIds: new Set([1, 2]),
    }))
    expect(writeSnapshot).toHaveBeenCalledWith(expect.anything(), 10, 12)
    expect(fetchMatchDetail).not.toHaveBeenCalled()
    expect(pruneSnapshots).toHaveBeenCalled()
  })
})
