import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ClubLocationsReviewResponse } from '@/types'

const clubLocationsReview = vi.fn()
const acceptClubLocation = vi.fn()
const rejectClubLocation = vi.fn()
const manualClubLocation = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    admin: {
      clubLocationsReview: () => clubLocationsReview(),
      acceptClubLocation: (...a: unknown[]) => acceptClubLocation(...a),
      rejectClubLocation: (...a: unknown[]) => rejectClubLocation(...a),
      manualClubLocation: (...a: unknown[]) => manualClubLocation(...a),
    },
  },
}))

import ClubLocationsReview from './ClubLocationsReview'

const mockReviewData: ClubLocationsReviewResponse = {
  candidates: [
    {
      club: {
        id: 10,
        name: 'Arsenal FC',
        country: 'England',
        league: 'Premier League',
        currentLat: null,
        currentLng: null,
      },
      candidate: {
        wikidataId: 'Q9617',
        label: 'Q9617',
        lat: 51.5549,
        lng: -0.1084,
        stadium: 'Emirates Stadium',
        city: 'London',
        confidence: 0.72,
        sourceUrl: 'https://www.wikidata.org/wiki/Q9617',
      },
    },
  ],
  unplaced: [
    {
      id: 20,
      name: 'Unplaced Club',
      country: 'Spain',
      league: 'Segunda',
    },
  ],
}

describe('ClubLocationsReview Component', () => {
  beforeEach(() => {
    clubLocationsReview.mockReset()
    acceptClubLocation.mockReset()
    rejectClubLocation.mockReset()
    manualClubLocation.mockReset()
  })

  it('renders candidate locations with details and OSM links', async () => {
    clubLocationsReview.mockResolvedValue(mockReviewData)
    render(<ClubLocationsReview />)

    expect(await screen.findByText('Arsenal FC')).toBeInTheDocument()
    expect(screen.getByText('72% match')).toBeInTheDocument()
    expect(screen.getByText('Emirates Stadium', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('London', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Q9617' })).toHaveAttribute(
      'href',
      'https://www.wikidata.org/wiki/Q9617',
    )
    expect(screen.getByRole('link', { name: /OSM map/ })).toHaveAttribute(
      'href',
      expect.stringContaining('openstreetmap.org/?mlat=51.5549&mlon=-0.1084'),
    )
    expect(screen.getByTestId('location-review-count')).toHaveTextContent('1 candidate location matches to review')
    expect(screen.getByText('No match (1)')).toBeInTheDocument()
    expect(screen.getByText('Unplaced Club')).toBeInTheDocument()
  })

  it('accepts a candidate location and removes it from the list', async () => {
    clubLocationsReview.mockResolvedValue(mockReviewData)
    acceptClubLocation.mockResolvedValue({ ok: true, clubId: 10 })
    render(<ClubLocationsReview />)

    expect(await screen.findByText('Arsenal FC')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => {
      expect(acceptClubLocation).toHaveBeenCalledWith(10, 'Q9617')
      expect(screen.queryByText('Arsenal FC')).not.toBeInTheDocument()
    })
  })

  it('rejects a candidate location and removes it from the list', async () => {
    clubLocationsReview.mockResolvedValue(mockReviewData)
    rejectClubLocation.mockResolvedValue({ ok: true, clubId: 10 })
    render(<ClubLocationsReview />)

    expect(await screen.findByText('Arsenal FC')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => {
      expect(rejectClubLocation).toHaveBeenCalledWith(10)
      expect(screen.queryByText('Arsenal FC')).not.toBeInTheDocument()
    })
  })

  it('submits manual coordinates for unplaced club and removes it from unplaced list', async () => {
    clubLocationsReview.mockResolvedValue(mockReviewData)
    manualClubLocation.mockResolvedValue({ ok: true, clubId: 20 })
    render(<ClubLocationsReview />)

    expect(await screen.findByText('Unplaced Club')).toBeInTheDocument()

    const latInput = screen.getByLabelText('Latitude (-90 to 90)')
    const lngInput = screen.getByLabelText('Longitude (-180 to 180)')
    const stadiumInput = screen.getByLabelText('Stadium (optional)')
    const cityInput = screen.getByLabelText('City (optional)')

    fireEvent.change(latInput, { target: { value: '40.4168' } })
    fireEvent.change(lngInput, { target: { value: '-3.7038' } })
    fireEvent.change(stadiumInput, { target: { value: 'Estadio Manual' } })
    fireEvent.change(cityInput, { target: { value: 'Madrid' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save coordinates' }))

    await waitFor(() => {
      expect(manualClubLocation).toHaveBeenCalledWith(20, {
        lat: 40.4168,
        lng: -3.7038,
        stadium: 'Estadio Manual',
        city: 'Madrid',
      })
      expect(screen.queryByText('Unplaced Club')).not.toBeInTheDocument()
    })
  })
})
