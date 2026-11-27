import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RumourLedger, { ledgerFiltersActive } from './RumourLedger'

const search = vi.hoisted(() => ({ params: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => search.params,
}))

vi.mock('@/components/live/RumourFeedProvider', () => ({
  useFeed: () => ({ rumours: [], live: {} }),
}))

describe('ledgerFiltersActive', () => {
  it('detects status/league/position/window', () => {
    expect(ledgerFiltersActive(new URLSearchParams())).toBe(false)
    expect(ledgerFiltersActive(new URLSearchParams('page=2'))).toBe(false)
    expect(ledgerFiltersActive(new URLSearchParams('status=HOT'))).toBe(true)
    expect(ledgerFiltersActive(new URLSearchParams('league=La+Liga'))).toBe(true)
  })
})

describe('RumourLedger empty', () => {
  it('hides Clear filters when no filter params', () => {
    search.params = new URLSearchParams()
    render(<RumourLedger total={0} page={1} totalPages={1} />)
    expect(screen.getByTestId('ledger-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('ledger-clear-filters-cta')).not.toBeInTheDocument()
  })

  it('links Clear filters to /rumours when filters are set', () => {
    search.params = new URLSearchParams('status=HOT&league=Premier+League')
    render(<RumourLedger total={0} page={1} totalPages={1} />)
    expect(screen.getByTestId('ledger-clear-filters-cta')).toHaveAttribute('href', '/rumours')
  })
})
