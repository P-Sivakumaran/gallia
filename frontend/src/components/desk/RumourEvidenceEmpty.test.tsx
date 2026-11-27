import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RumourEvidenceEmpty from './RumourEvidenceEmpty'

describe('RumourEvidenceEmpty', () => {
  it('links Browse rumours to /rumours', () => {
    render(<RumourEvidenceEmpty />)
    expect(screen.getByTestId('rumour-evidence-empty')).toBeInTheDocument()
    expect(screen.getByTestId('rumour-evidence-empty-rumours-cta')).toHaveAttribute('href', '/rumours')
  })
})
