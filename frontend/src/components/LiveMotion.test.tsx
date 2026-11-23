import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TruthMeter from './TruthMeter'
import StatusBadge from './StatusBadge'
import RumourCard from './RumourCard'
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

describe('TruthMeter: the reading is in the markup', () => {
  it('exposes the score as an accessible meter with a text value', () => {
    render(<TruthMeter score={78.4} status="HOT" />)
    const meter = screen.getByRole('meter', { name: 'Completion likelihood' })
    expect(meter).toHaveAttribute('aria-valuenow', '78')
    expect(meter).toHaveAttribute('aria-valuetext', '78% likely, hot')
    expect(screen.getByText('78')).toBeInTheDocument()
    expect(screen.getByText('HOT')).toBeInTheDocument()
  })

  it('lights scale marks up to the score only', () => {
    render(<TruthMeter score={45} status="PENDING" />)
    // marks every 5 units: 0,5,…,45 → 10 lit
    expect(screen.getAllByTestId('meter-tick-lit')).toHaveLength(10)
  })

  it('draws no scale and no label at the small size', () => {
    render(<TruthMeter score={60} status="HOT" size="sm" />)
    expect(screen.queryAllByTestId('meter-tick-lit')).toHaveLength(0)
    expect(screen.queryByText('HOT')).not.toBeInTheDocument()
  })

  it('sends a ring out only when given a pulse key', () => {
    const { rerender } = render(<TruthMeter score={60} status="HOT" />)
    expect(screen.queryByTestId('meter-pulse')).not.toBeInTheDocument()
    rerender(<TruthMeter score={60} status="HOT" pulseKey={1} />)
    expect(screen.getByTestId('meter-pulse')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('pairs a dot with the status text', () => {
    render(<StatusBadge status="FAILED" />)
    expect(screen.getByText('FAILED')).toBeInTheDocument()
  })
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

describe('RumourCard: live change', () => {
  it('shows a delta chip with a spoken equivalent', () => {
    render(<RumourCard rumour={rumour({ computedLikelihood: 41 })} live={{ seq: 1, delta: -4, statusChanged: false }} />)
    expect(screen.getByTestId('delta-chip')).toHaveTextContent('▼ 4')
    expect(screen.getByText('Likelihood down 4 points')).toBeInTheDocument()
  })

  it('shows no chip without a live change', () => {
    render(<RumourCard rumour={rumour()} />)
    expect(screen.queryByTestId('delta-chip')).not.toBeInTheDocument()
  })
})
