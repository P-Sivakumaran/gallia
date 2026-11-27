import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScorecardView from './ScorecardView'
import { modelHealthTrained, modelHealthInsufficient } from '@/test/fixtures'
import type { ModelHealthResponse } from '@/types'

describe('ScorecardView', () => {
  it('states a real-outcome sample size for a trained model', () => {
    render(<ScorecardView health={modelHealthTrained} />)
    expect(screen.getByTestId('scorecard-verdict')).toHaveTextContent('Tested against 300 rumours')
    expect(screen.getByText('Real outcomes')).toBeInTheDocument()
  })

  it('never presents a synthetic model as real-world accuracy', () => {
    render(<ScorecardView health={modelHealthInsufficient} />)
    expect(screen.getByTestId('scorecard-verdict')).toHaveTextContent('not evidence of real-world accuracy')
  })

  it('warns when the real test set is below the minimum sample size', () => {
    const small: ModelHealthResponse = {
      ...modelHealthTrained,
      definitions: [
        {
          ...modelHealthTrained.definitions[0],
          currentModel: { ...modelHealthTrained.definitions[0].currentModel!, nTestSamples: 40, meetsMinSampleSize: false },
        },
      ],
    }
    render(<ScorecardView health={small} />)
    expect(screen.getByTestId('scorecard-verdict')).toHaveTextContent('Only 40 resolved rumours')
  })

  it('shows an empty state with no active definitions', () => {
    render(<ScorecardView health={{ definitions: [], mlService: { reachable: false } }} />)
    expect(screen.getByTestId('scorecard-empty')).toBeInTheDocument()
  })

  it('shows an error state when the API fails', () => {
    render(<ScorecardView health={null} error="API 500: /forecast/model-health" />)
    expect(screen.getByTestId('scorecard-error')).toHaveTextContent('API 500')
  })

  it('scores the desk ledger when one is supplied', () => {
    const ledger = {
      brierScore: 0.204, scored: 2, excluded: 1,
      rows: [
        { id: 'r1', player: 'Ferran Torres', route: 'Barcelona → PSG', peak: 80, scored: 72, trend: [], window: 'Summer 2026', outcome: 'Completed' as const, brier: 0.0784, payout: 0.28 },
        { id: 'r2', player: 'Julian Alvarez', route: 'Atlético → Arsenal', peak: 60, scored: 55, trend: [], window: 'Summer 2026', outcome: 'Failed' as const, brier: 0.3025, payout: -0.55 },
      ],
    }
    render(<ScorecardView health={null} ledger={ledger} />)
    expect(screen.getByTestId('scorecard-ledger')).toHaveTextContent('0.204')
    expect(screen.getByText('Ferran Torres')).toBeInTheDocument()
    expect(screen.getByText('1 left out: no pre-outcome estimate')).toBeInTheDocument()
  })

  it('says so when there is no ledger', () => {
    render(<ScorecardView health={null} />)
    expect(screen.getByTestId('scorecard-no-ledger')).toBeInTheDocument()
    expect(screen.getByTestId('scorecard-no-ledger-rumours-cta')).toHaveAttribute('href', '/rumours')
  })
})

