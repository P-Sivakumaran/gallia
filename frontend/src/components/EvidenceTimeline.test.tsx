import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EvidenceTimeline from './EvidenceTimeline'
import { gyokeresClaimDetail, davidClaimDetail } from '@/test/fixtures'

describe('EvidenceTimeline — states', () => {
  it('renders a loading skeleton', () => {
    render(<EvidenceTimeline claim={null} isLoading />)
    expect(screen.getByTestId('timeline-loading')).toBeInTheDocument()
  })

  it('renders an error state', () => {
    render(<EvidenceTimeline claim={null} error="boom" />)
    expect(screen.getByTestId('timeline-error')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-error-rumours-cta')).toHaveAttribute('href', '/rumours')
  })

  it('renders an empty state when there is no evidence', () => {
    const emptyClaim = { ...gyokeresClaimDetail, provenanceClusters: [] }
    render(<EvidenceTimeline claim={emptyClaim} />)
    expect(screen.getByTestId('timeline-empty')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-empty-rumours-cta')).toHaveAttribute('href', '/rumours')
  })
})

describe('EvidenceTimeline — provenance marking', () => {
  it('marks the original item as "Original" and copies as "Copy"', () => {
    render(<EvidenceTimeline claim={gyokeresClaimDetail} />)
    expect(screen.getAllByText('Original')).toHaveLength(2) // one per cluster root (scoop + official confirmation)
    expect(screen.getAllByText('Copy')).toHaveLength(4) // the four syndications
  })

  it('links each syndicated copy back to its shared original', () => {
    render(<EvidenceTimeline claim={gyokeresClaimDetail} />)
    const backlinks = screen.getAllByText(/Same story as:/)
    expect(backlinks.length).toBeGreaterThan(0)
    expect(backlinks[0].closest('a')).toHaveAttribute('href', '#evidence-1')
  })
})

describe('EvidenceTimeline — filtering', () => {
  const originalTitle = 'Here we go! Viktor Gyökeres to Manchester City, £85m deal agreed'

  it('filters to only official items when the Official chip is toggled', async () => {
    const user = userEvent.setup()
    render(<EvidenceTimeline claim={gyokeresClaimDetail} />)

    await user.click(screen.getByRole('button', { name: 'Official' }))

    expect(screen.getByText('Manchester City completes the transfer of Viktor Gyökeres')).toBeInTheDocument()
    // Exact match: a partial/regex match would also hit syndicated items'
    // "Same story as: <original title>" backlink text.
    expect(screen.queryByRole('link', { name: originalTitle })).not.toBeInTheDocument()
  })

  it('filters to denials for the David claim', async () => {
    const user = userEvent.setup()
    render(<EvidenceTimeline claim={davidClaimDetail} />)

    await user.click(screen.getByRole('button', { name: 'Denial' }))

    expect(screen.getByText('Juventus statement: Jonathan David is not for sale')).toBeInTheDocument()
    expect(screen.queryByText(/linked with Juventus exit/)).not.toBeInTheDocument()
  })

  it('shows a "no evidence matches" message when the filter combination matches nothing', async () => {
    const user = userEvent.setup()
    render(<EvidenceTimeline claim={davidClaimDetail} />)

    await user.click(screen.getByRole('button', { name: 'Syndication' })) // david claim has no syndicated copies

    expect(screen.getByTestId('timeline-filter-empty')).toBeInTheDocument()
    expect(screen.getByText(/no evidence matches/i)).toBeInTheDocument()
    expect(screen.getByTestId('timeline-filter-empty-clear')).toBeInTheDocument()
  })

  it('Clear filters restores the full timeline after a no-match filter', async () => {
    const user = userEvent.setup()
    render(<EvidenceTimeline claim={davidClaimDetail} />)

    await user.click(screen.getByRole('button', { name: 'Syndication' }))
    expect(screen.getByTestId('timeline-filter-empty')).toBeInTheDocument()

    await user.click(screen.getByTestId('timeline-filter-empty-clear'))
    expect(screen.queryByTestId('timeline-filter-empty')).not.toBeInTheDocument()
    expect(screen.getByTestId('evidence-timeline')).toBeInTheDocument()
  })

  it('toggling a filter chip off restores the full timeline', async () => {
    const user = userEvent.setup()
    render(<EvidenceTimeline claim={gyokeresClaimDetail} />)

    const officialChip = screen.getByRole('button', { name: 'Official' })
    await user.click(officialChip)
    expect(screen.queryByRole('link', { name: originalTitle })).not.toBeInTheDocument()

    await user.click(officialChip)
    expect(screen.getByRole('link', { name: originalTitle })).toBeInTheDocument()
  })
})
