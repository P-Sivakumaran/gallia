import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RumoursPanel from './RumoursPanel'

vi.mock('@/lib/api', () => ({
  api: {
    admin: {
      rumours: vi.fn(),
      setOutcome: vi.fn(),
    },
  },
}))

import { api } from '@/lib/api'

describe('RumoursPanel — filter empty', () => {
  beforeEach(() => {
    vi.mocked(api.admin.rumours).mockReset()
  })

  it('offers Show all when a status filter matches nothing', async () => {
    vi.mocked(api.admin.rumours).mockResolvedValue([])

    render(<RumoursPanel />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-rumours-empty')).toBeInTheDocument()
    })
    expect(screen.getByTestId('admin-rumours-empty-clear')).toHaveTextContent('Show all →')

    fireEvent.click(screen.getByTestId('admin-rumours-empty-clear'))

    await waitFor(() => {
      expect(api.admin.rumours).toHaveBeenCalledWith(undefined)
    })
  })

  it('hides Show all when already on ALL and empty', async () => {
    vi.mocked(api.admin.rumours).mockResolvedValue([])

    render(<RumoursPanel />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-rumours-empty-clear')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'ALL' }))

    await waitFor(() => {
      expect(screen.getByTestId('admin-rumours-empty')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-rumours-empty-clear')).not.toBeInTheDocument()
    })
  })
})
