import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import UpgradePrompt from './UpgradePrompt'

describe('UpgradePrompt', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  })

  it('renders the required-tier label and the functionality description', () => {
    render(
      <UpgradePrompt
        description="Full forecast history is part of Supporter/Pro."
        requiredTier="PRO"
        featureKey="FORECAST_HISTORY"
      />,
    )
    expect(screen.getByText('Full forecast history is part of Supporter/Pro.')).toBeInTheDocument()
    expect(screen.getByText('Supporter/Pro')).toBeInTheDocument()
  })

  it('never claims upgrading changes forecast accuracy — always shows the estimate disclaimer', () => {
    render(<UpgradePrompt description="x" requiredTier="RESEARCH" featureKey="API_ACCESS" />)
    expect(screen.getByText(/Forecasts are estimates, not confirmations/)).toBeInTheDocument()
    expect(screen.getByText(/same calibrated probability/)).toBeInTheDocument()
  })

  it('has no pricing or checkout link', () => {
    render(<UpgradePrompt description="x" requiredTier="PRO" featureKey="UNLIMITED_WATCHLIST" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
