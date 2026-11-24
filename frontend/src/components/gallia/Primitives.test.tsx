import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ProbabilityMeter } from './Primitives'

afterEach(cleanup)

describe('Gallia probability meter', () => {
  it('renders a segmented forecast with an explicitly supplied interval', () => {
    const { container } = render(<ProbabilityMeter value={74} range={[66, 82]} />)
    expect(screen.getByRole('img', { name: 'Transfer likelihood: 74%' })).toBeInTheDocument()
    expect(container.querySelectorAll('.g-meter-segment')).toHaveLength(40)
    expect(container.querySelector('.g-meter-corridor')).toHaveAttribute('stroke-dasharray', '16 100')
  })

  it('does not fabricate a confidence interval for a pending forecast', () => {
    const { container } = render(<ProbabilityMeter value={null} />)
    expect(screen.getByRole('img', { name: 'Forecast pending' })).toBeInTheDocument()
    expect(container.querySelector('.g-meter-corridor')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.g-meter-segment.is-filled')).toHaveLength(0)
  })
})
