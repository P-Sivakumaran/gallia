import { describe, it, expect, vi } from 'vitest'

import { isRecentRun } from './scheduler.js'

vi.mock('./queues.js', () => ({ ingestQueue: {}, playerSyncQueue: {}, maintenanceQueue: {} }))

describe('isRecentRun (boot player-sync skip)', () => {
  const now = Date.parse('2026-11-25T12:00:00Z')
  it('skips when the last run finished within 20 hours', () => {
    expect(isRecentRun(now - 2 * 3600e3, now)).toBe(true)
  })
  it('runs when the last run is older, or there is none', () => {
    expect(isRecentRun(now - 21 * 3600e3, now)).toBe(false)
    expect(isRecentRun(undefined, now)).toBe(false)
  })
})
