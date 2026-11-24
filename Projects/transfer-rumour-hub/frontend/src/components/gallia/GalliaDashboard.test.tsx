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
    expect(screen.getByText('ILLUSTRATIVE EDITION')).toBeInTheDocument()
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

  it('lets anonymous readers save and remove stories without an account', async () => {
    const user = userEvent.setup()
    render(<GalliaDashboard workspace={workspace} />)
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(navigation).getByRole('button', { name: 'Reading list 0' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Nico Williams' }))
    expect(screen.getByRole('status')).toHaveTextContent('Saved for this visit. No account needed')
    await user.click(within(navigation).getByRole('button', { name: 'Reading list 1' }))
    expect(screen.getByRole('heading', { name: 'Your saved stories' })).toBeInTheDocument()
    expect(screen.getByText('1 SIGNALS')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unsave Nico Williams' }))
    expect(screen.getByRole('heading', { name: 'Nothing saved. Yet.' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Browse latest stories' }))
    expect(screen.getByRole('heading', { name: 'On the radar' })).toBeInTheDocument()
  })

  it('does not retain saved stories after the page is remounted', async () => {
    const user = userEvent.setup()
    const page = render(<GalliaDashboard workspace={workspace} />)
    await user.click(screen.getByRole('button', { name: 'Save Nico Williams' }))
    expect(screen.getByRole('button', { name: 'Reading list 1' })).toBeInTheDocument()
    page.unmount()
    render(<GalliaDashboard workspace={workspace} />)
    expect(screen.getByRole('button', { name: 'Reading list 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Nico Williams' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('presents a publication rather than account and alert setup', () => {
    render(<GalliaDashboard workspace={workspace} />)
    expect(screen.getByRole('heading', { name: 'Independent by design.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The watchdesk' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Instant' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Daily digest' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in|account watchlist/i })).not.toBeInTheDocument()
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

  it('summarizes all three evidence directions and keeps contextual reporting visible', () => {
    render(<GalliaDashboard workspace={workspace} />)
    const balance = screen.getByRole('group', { name: 'Evidence direction breakdown' })
    expect(within(balance).getByText('2 supports')).toBeInTheDocument()
    expect(within(balance).getByText('1 contradicts')).toBeInTheDocument()
    expect(within(balance).getByText('1 contextual')).toBeInTheDocument()
    expect(screen.getByText('A centre-forward remains the summer priority')).toBeVisible()
  })

  it('keeps the command-key search accessible from the navigation', async () => {
    const user = userEvent.setup()
    render(<GalliaDashboard workspace={workspace} />)
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByRole('textbox', { name: 'Search players, clubs or claims' })).toHaveFocus()
    await user.type(screen.getByRole('textbox'), 'Arsenal')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('does not display example performance in a connected empty workspace', () => {
    render(<GalliaDashboard workspace={{ mode: 'connected', reason: 'Authorized public records', claims: [] }} />)
    expect(screen.getByText('CONNECTED EDITION')).toBeInTheDocument()
    expect(screen.queryByText('0.142')).not.toBeInTheDocument()
    expect(screen.getByText(/No verified calibration records/)).toBeInTheDocument()
  })
})
