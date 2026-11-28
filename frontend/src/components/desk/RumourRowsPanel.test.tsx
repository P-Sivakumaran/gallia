import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RumourRowsPanel } from './RumourLedger'

describe('RumourRowsPanel', () => {
  it('exposes optional section id for in-page jumps', () => {
    render(<RumourRowsPanel id="open-rumours" title="Open rumours" rumours={[]} empty="None" />)
    const section = screen.getByLabelText('Open rumours')
    expect(section).toHaveAttribute('id', 'open-rumours')
    expect(screen.getByRole('heading', { name: 'Open rumours' })).toHaveAttribute('id', 'open-rumours-title')
  })

  it('links empty panels to Browse rumours when emptyHref is set', () => {
    render(
      <RumourRowsPanel
        title="Open rumours"
        rumours={[]}
        empty="None here"
        emptyHref="/rumours"
        emptyCta="Browse rumours →"
      />,
    )
    expect(screen.getByTestId('rumour-rows-empty-cta')).toHaveAttribute('href', '/rumours')
    expect(screen.getByTestId('rumour-rows-empty-cta')).toHaveTextContent('Browse rumours →')
  })

  it('links empty resolved rumours panels the same way', () => {
    render(
      <RumourRowsPanel
        title="Resolved rumours"
        rumours={[]}
        empty="No resolved rumours for this player."
        emptyHref="/rumours"
        emptyCta="Browse rumours →"
      />,
    )
    expect(screen.getByTestId('rumour-rows-empty-cta')).toHaveAttribute('href', '/rumours')
  })
})
