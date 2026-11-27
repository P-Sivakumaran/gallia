import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClubDashboard from './ClubDashboard'
import type { ClubDetail } from '@/types'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}))

const club: ClubDetail = {
  id: 1,
  name: 'Test FC',
  shortName: 'TFC',
  league: 'Premier League',
  country: 'England',
  logoUrl: null,
  players: [
    {
      id: 10,
      name: 'Ada',
      age: 24,
      position: 'ST',
      currentClub: null,
      contractEnd: null,
      marketValue: null,
      nationality: null,
      photoUrl: null,
    },
  ],
  activeIn: [],
  activeOut: [],
  totalExpectedSpend: 0,
}

describe('ClubDashboard', () => {
  it('jumps SQUAD SIZE metric to Linked players', () => {
    render(<ClubDashboard club={club} />)
    const jump = screen.getByTestId('squad-size-jump')
    expect(jump).toHaveAttribute('href', '#linked-players-title')
    expect(jump).toHaveTextContent('1')
  })
})
