import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AdminReviewItem } from '@/types'

const reviewQueue = vi.fn()
const setOutcome = vi.fn()
vi.mock('@/lib/api', () => ({ api: { admin: { reviewQueue: () => reviewQueue(), setOutcome: (...a: unknown[]) => setOutcome(...a) } } }))

import ReviewQueue from './ReviewQueue'

const item = (over: Partial<AdminReviewItem> = {}): AdminReviewItem => ({
  id: 7,
  status: 'PENDING',
  computedLikelihood: 62,
  window: 'SUMMER',
  rumourDate: '2026-08-03T00:00:00.000Z',
  notes: null,
  player: { name: 'Test Player', currentClubId: 1 },
  fromClub: { name: 'Club A' },
  toClub: { name: 'Club B' },
  source: { name: 'BBC Sport' },
  reasons: ['window-closed', 'text-signal'],
  textSignals: [
    { outcome: 'COMPLETED', headline: 'Here we go for Test Player', link: 'https://example.com/a', publishedAt: '2026-08-20T10:00:00.000Z', sourceName: 'Romano' },
  ],
  suggestedKnownAt: '2026-08-20T10:00:00.000Z',
  ...over,
})

describe('ReviewQueue', () => {
  beforeEach(() => {
    reviewQueue.mockReset()
    setOutcome.mockReset()
  })

  it('lists items with their reasons and article leads', async () => {
    reviewQueue.mockResolvedValue([item()])
    render(<ReviewQueue />)
    expect(await screen.findByText('Test Player')).toBeInTheDocument()
    expect(screen.getByText('Window closed, not confirmed')).toBeInTheDocument()
    expect(screen.getByText('Article wording')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Here we go for Test Player' })).toHaveAttribute('href', 'https://example.com/a')
    expect(screen.getByTestId('review-count')).toHaveTextContent('1 waiting for review')
    expect(screen.queryByTestId('review-empty-rumours-cta')).not.toBeInTheDocument()
  })

  it('links Browse rumours when the queue is empty', async () => {
    reviewQueue.mockResolvedValue([])
    render(<ReviewQueue />)
    expect(await screen.findByTestId('review-count')).toHaveTextContent('Nothing waiting for review.')
    expect(screen.getByTestId('review-empty-rumours-cta')).toHaveAttribute('href', '/rumours')
  })

  it('offers Retry when the queue fails to load', async () => {
    reviewQueue.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([item()])
    render(<ReviewQueue />)
    expect(await screen.findByTestId('review-error')).toHaveTextContent('Failed to load the review queue')
    fireEvent.click(screen.getByTestId('review-error-retry'))
    expect(await screen.findByText('Test Player')).toBeInTheDocument()
    expect(reviewQueue).toHaveBeenCalledTimes(2)
  })

  it('prefills the date from the earliest article and sends it as knownAt', async () => {
    reviewQueue.mockResolvedValue([item()])
    setOutcome.mockResolvedValue({ id: 7, status: 'COMPLETED' })
    render(<ReviewQueue />)
    const date = await screen.findByLabelText('Outcome public on')
    expect(date).toHaveValue('2026-08-20')
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    await waitFor(() => expect(setOutcome).toHaveBeenCalledWith(7, 'COMPLETED', '2026-08-20'))
    await waitFor(() => expect(screen.queryByText('Test Player')).not.toBeInTheDocument())
  })

  it('refuses to resolve without a date', async () => {
    reviewQueue.mockResolvedValue([item({ textSignals: [], reasons: ['window-closed'], suggestedKnownAt: null })])
    render(<ReviewQueue />)
    fireEvent.click(await screen.findByRole('button', { name: 'Failed' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Set the date')
    expect(setOutcome).not.toHaveBeenCalled()
  })

  it('keeps the item and shows an error when saving fails', async () => {
    reviewQueue.mockResolvedValue([item()])
    setOutcome.mockRejectedValue(new Error('401'))
    render(<ReviewQueue />)
    fireEvent.click(await screen.findByRole('button', { name: 'Denied' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not set denied')
    expect(screen.getByText('Test Player')).toBeInTheDocument()
  })
})
