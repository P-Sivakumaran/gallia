import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GalliaDashboard from './GalliaDashboard'
import { illustrativeClaims } from '@/lib/gallia-demo'
import type { GalliaWorkspace } from '@/lib/gallia-types'

const workspace: GalliaWorkspace = {
  mode: 'illustrative',
  reason: 'Supabase connected · table access restricted',
  claims: illustrativeClaims,
}

afterEach(cleanup)

describe('Gallia intelligence desk', () => {
  it('labels illustrative reporting and model performance explicitly', () => {
    render(<GalliaDashboard workspace={workspace} />)
    expect(screen.getByText('ILLUSTRATIVE WORKSPACE')).toBeInTheDocument()
    expect(screen.getByText(/All stories, forecasts and scores below are examples/)).toBeInTheDocument()
    expect(screen.getByText('Illustrative records · not an audited performance claim')).toBeInTheDocument()
  })

  it('filters the radar instantly by player and offers an honest empty state', async () => {
    const user = userEvent.setup()
    render(<GalliaDashboard workspace={workspace} />)
    await user.type(screen.getByRole('textbox', { name: 'Search players, clubs or claims' }), 'Nico')
    const feed = screen.getByRole('heading', { name: 'On the radar' }).closest('section')!
    expect(within(feed).getByText('Nico Williams')).toBeInTheDocument()
    expect(within(feed).queryByText('Florian Wirtz')).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox'), 'missing')
    expect(screen.getByText('No active smoke in this sector.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search & filters' }))
    expect(within(feed).getByText('Florian Wirtz')).toBeInTheDocument()
  })

  it('combines league, status and tier filters', async () => {
    const user = userEvent.setup()
    render(<GalliaDashboard workspace={workspace} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'League' }), 'La Liga')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Signal status' }), 'Smoke')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Source tier' }), '2')
    expect(screen.getByText('1 SIGNALS')).toBeInTheDocument()
    const feed = screen.getByRole('heading', { name: 'On the radar' }).closest('section')!
    expect(within(feed).getByText('Nico Williams')).toBeInTheDocument()
  })

  it('updates the session watchlist without pretending to persist it', async () => {
    const user = userEvent.setup()
    render(<GalliaDashboard workspace={workspace} />)
    await user.click(screen.getByRole('button', { name: 'Watch Nico Williams' }))
    expect(screen.getByRole('status')).toHaveTextContent('Added to this session’s watchlist')
    await user.click(screen.getByRole('button', { name: /^Watchlist\s?4$/ }))
    expect(screen.getByRole('heading', { name: 'Your tracked signals' })).toBeInTheDocument()
    expect(screen.getByText('4 SIGNALS')).toBeInTheDocument()
  })

  it('keeps contradictions accessible in the provenance view', async () => {
    const user = userEvent.setup()
    render(<GalliaDashboard workspace={workspace} />)
    await user.click(screen.getByRole('button', { name: 'Sources & provenance' }))
    const title = screen.getByText('Sporting hold firm on valuation')
    await user.click(title)
    expect(title.closest('details')).toHaveAttribute('open')
    expect(screen.getByText(/Illustrative excerpt: Sporting have not accepted/)).toBeVisible()
  })

  it('does not display example performance in a connected empty workspace', () => {
    render(<GalliaDashboard workspace={{ mode: 'connected', reason: 'Authorized public records', claims: [] }} />)
    expect(screen.getByText('CONNECTED WORKSPACE')).toBeInTheDocument()
    expect(screen.queryByText('0.142')).not.toBeInTheDocument()
    expect(screen.getByText(/No verified calibration records/)).toBeInTheDocument()
  })
})
