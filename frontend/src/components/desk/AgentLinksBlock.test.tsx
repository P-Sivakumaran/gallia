import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { PlayerAgentLink } from '@/types'
import AgentLinksBlock from './AgentLinksBlock'

const twoCitations: PlayerAgentLink = {
  linkId: 1,
  role: 'REPRESENTS',
  rumourId: null,
  agent: { id: 10, name: 'Jorge Mendes', kind: 'PERSON', agency: 'Gestifute' },
  citations: [
    {
      url: 'https://www.marca.com/futbol/leao.html',
      host: 'marca.com',
      quote: 'Mendes is understood to represent the forward.',
      addedAt: '2026-11-26T00:00:00.000Z',
    },
    {
      url: 'https://www.as.com/futbol/leao.html',
      host: 'as.com',
      quote: null,
      addedAt: '2026-11-25T00:00:00.000Z',
    },
  ],
}

describe('AgentLinksBlock', () => {
  it('renders nothing when the list is empty', () => {
    const { container } = render(<AgentLinksBlock links={[]} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId('agent-links-block')).not.toBeInTheDocument()
  })

  it('shows one link with two citation hosts and a pull-quote', () => {
    render(<AgentLinksBlock links={[twoCitations]} />)

    expect(screen.getByTestId('agent-links-block')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Agent' })).toBeInTheDocument()
    expect(screen.getByText('Jorge Mendes')).toBeInTheDocument()
    expect(screen.getByText('Gestifute')).toBeInTheDocument()
    expect(screen.getByText('Represents')).toBeInTheDocument()
    expect(screen.getByText(/Reported by/)).toBeInTheDocument()

    const marca = screen.getByRole('link', { name: 'marca.com' })
    expect(marca).toHaveAttribute('href', 'https://www.marca.com/futbol/leao.html')
    const as = screen.getByRole('link', { name: 'as.com' })
    expect(as).toHaveAttribute('href', 'https://www.as.com/futbol/leao.html')

    expect(screen.getByText('Mendes is understood to represent the forward.')).toBeInTheDocument()
    expect(screen.getAllByTestId('agent-link')).toHaveLength(1)
  })
})
