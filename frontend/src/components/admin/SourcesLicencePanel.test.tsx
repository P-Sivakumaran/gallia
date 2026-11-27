import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { AdminSource, SourceLicenceStatus } from '@/types'
import {
  SourcesLicenceTable,
  filterByLicence,
  sortSourcesByLicence,
  LICENCE_STATUSES,
} from './SourcesLicencePanel'

function source(
  id: number,
  name: string,
  licenceStatus: SourceLicenceStatus,
  extras: Partial<AdminSource> = {},
): AdminSource {
  return {
    id,
    name,
    type: 'NEWS_OUTLET',
    reliabilityScore: 0.8,
    hitCount: 1,
    missCount: 0,
    country: null,
    url: null,
    licenceStatus,
    licenceNote: `${name} note`,
    termsUrl: extras.termsUrl ?? null,
    displayRights: extras.displayRights ?? { headline: true, snippetChars: 0, link: true, embed: false },
    licenceReviewedAt: '2026-11-26T00:00:00.000Z',
    _count: { rumours: id },
    ...extras,
  }
}

const fixtures: AdminSource[] = [
  source(1, 'ESPN Soccer', 'CLEARED', { termsUrl: 'https://example.com/espn' }),
  source(2, 'BBC Sport', 'NEEDS_LICENCE'),
  source(3, 'Google News Transfers', 'PERSONAL_ONLY'),
  source(4, 'Sportmonks Aggregator', 'BLOCKED'),
  source(5, 'Football Italia', 'UNKNOWN'),
]

describe('sortSourcesByLicence', () => {
  it('puts uncleared statuses before cleared', () => {
    const names = sortSourcesByLicence(fixtures).map((s) => s.licenceStatus)
    expect(names).toEqual(['BLOCKED', 'PERSONAL_ONLY', 'NEEDS_LICENCE', 'UNKNOWN', 'CLEARED'])
  })
})

describe('SourcesLicenceTable', () => {
  it('shows an empty state when there are no sources', () => {
    render(<SourcesLicenceTable sources={[]} filter="ALL" onFilter={() => {}} />)
    expect(screen.getByTestId('sources-licence-empty')).toHaveTextContent('No sources in the registry yet.')
    expect(screen.queryByTestId('sources-licence-row')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sources-licence-empty-clear')).not.toBeInTheDocument()
  })

  it('offers Show all when a status filter matches nothing', () => {
    const onFilter = vi.fn()
    const withoutCleared = fixtures.filter((s) => s.licenceStatus !== 'CLEARED')
    render(<SourcesLicenceTable sources={withoutCleared} filter="CLEARED" onFilter={onFilter} />)
    expect(screen.getByTestId('sources-licence-empty')).toHaveTextContent('Cleared')
    fireEvent.click(screen.getByTestId('sources-licence-empty-clear'))
    expect(onFilter).toHaveBeenCalledWith('ALL')
  })

  it('filters to one status and keeps a row for each status when unfiltered', () => {
    const { rerender } = render(
      <SourcesLicenceTable sources={fixtures} filter="ALL" onFilter={() => {}} />,
    )
    expect(screen.getAllByTestId('sources-licence-row')).toHaveLength(5)
    for (const status of LICENCE_STATUSES) {
      expect(screen.getByTestId(`licence-count-${status}`)).toHaveTextContent('1')
      expect(
        screen.getAllByTestId('sources-licence-row').some((el) => el.getAttribute('data-licence') === status),
      ).toBe(true)
    }

    rerender(<SourcesLicenceTable sources={fixtures} filter="NEEDS_LICENCE" onFilter={() => {}} />)
    const rows = screen.getAllByTestId('sources-licence-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveAttribute('data-licence', 'NEEDS_LICENCE')
    expect(within(rows[0]).getByText('BBC Sport')).toBeInTheDocument()
  })

  it('wires the filter chips to onFilter', () => {
    const onFilter = vi.fn()
    render(<SourcesLicenceTable sources={fixtures} filter="ALL" onFilter={onFilter} />)
    fireEvent.click(screen.getByRole('button', { name: 'Blocked' }))
    expect(onFilter).toHaveBeenCalledWith('BLOCKED')
  })
})

describe('filterByLicence', () => {
  it('returns only matching rows', () => {
    expect(filterByLicence(fixtures, 'CLEARED').map((s) => s.name)).toEqual(['ESPN Soccer'])
  })
})
