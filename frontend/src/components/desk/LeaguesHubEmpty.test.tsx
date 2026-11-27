import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LeaguesHubEmpty from './LeaguesHubEmpty'

describe('LeaguesHubEmpty', () => {
  it('links to Browse rumours', () => {
    render(<LeaguesHubEmpty />)
    expect(screen.getByTestId('leagues-hub-empty-rumours-cta')).toHaveAttribute('href', '/rumours')
  })
})
