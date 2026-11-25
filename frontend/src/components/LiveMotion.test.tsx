import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LedgerRow } from './desk/RumourLedger'
import { feedReducer, type FeedState } from '@/lib/useRumourFeed'
import { gyokeres, arsenal, manCity } from '@/test/fixtures'
import type { Rumour } from '@/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const rumour = (o: Partial<Rumour> = {}): Rumour => ({
  id: 1,
  player: gyokeres,
  fromClub: arsenal,
  fromClubInferred: false,
  toClub: manCity,
  source: { id: 1, name: 'Fabrizio Romano', type: 'JOURNALIST', reliabilityScore: 0.9, url: null },
  reportedFeeMin: 70,
  reportedFeeMax: 85,
  currency: 'EUR',
  rumourDate: '2026-08-11T12:00:00Z',
  window: 'SUMMER',
  baseProbability: 0.6,
  computedLikelihood: 45,
  status: 'PENDING',
  distinctSourceCount: 1,
  notes: null,
  ...o,
})

describe('feedReducer: live updates', () => {
  const start: FeedState = { rumours: [rumour()], live: {}, latest: null }

  it('records the delta and bumps the sequence on a score change', () => {
    const s1 = feedReducer(start, { type: 'UPDATE', payload: { id: 1, computedLikelihood: 52, status: 'PENDING' } })
    expect(s1.rumours[0].computedLikelihood).toBe(52)
    expect(s1.live[1]).toEqual({ seq: 1, delta: 7, statusChanged: false })
    const s2 = feedReducer(s1, { type: 'UPDATE', payload: { id: 1, computedLikelihood: 74, status: 'HOT' } })
    expect(s2.live[1]).toEqual({ seq: 2, delta: 22, statusChanged: true })
    expect(s2.latest).toEqual({ id: 1, seq: 2 })
  })

  it('ignores updates that change nothing visible, and unknown rumours', () => {
    expect(feedReducer(start, { type: 'UPDATE', payload: { id: 1, computedLikelihood: 45.2, status: 'PENDING' } })).toBe(start)
    expect(feedReducer(start, { type: 'UPDATE', payload: { id: 99, computedLikelihood: 10, status: 'FAILED' } })).toBe(start)
  })

  it('clears live state when a new page of rumours arrives', () => {
    const s1 = feedReducer(start, { type: 'UPDATE', payload: { id: 1, computedLikelihood: 52, status: 'PENDING' } })
    expect(feedReducer(s1, { type: 'INIT', rumours: [rumour()] }).live).toEqual({})
  })
})

describe('LedgerRow: live change', () => {
  it('shows the change on a live update', () => {
    render(<LedgerRow rumour={rumour({ computedLikelihood: 52 })} change={{ seq: 1, delta: 7, statusChanged: false }} />)
    expect(screen.getByTestId('delta-chip')).toHaveTextContent('+7')
  })

  it('shows no change without a live update', () => {
    render(<LedgerRow rumour={rumour()} />)
    expect(screen.queryByTestId('delta-chip')).not.toBeInTheDocument()
  })
})
