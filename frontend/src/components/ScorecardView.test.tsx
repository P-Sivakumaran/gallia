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
})
