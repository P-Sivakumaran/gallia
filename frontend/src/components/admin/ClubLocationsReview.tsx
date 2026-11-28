'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ClubLocationCandidate, UnplacedClub } from '@/types'

function osmUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
}

function CandidateCard({
  item,
  onResolved,
}: {
  item: ClubLocationCandidate
  onResolved: (clubId: number) => void
}) {
  const [pending, setPending] = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { club, candidate } = item

  async function handleAccept() {
    if (!candidate.wikidataId) {
      setError('No candidate Wikidata item to accept.')
      return
    }
    setPending('accept')
    setError(null)
    try {
      await api.admin.acceptClubLocation(club.id, candidate.wikidataId)
      onResolved(club.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept candidate location.'
      setError(msg)
    } finally {
      setPending(null)
    }
  }

  async function handleReject() {
    setPending('reject')
    setError(null)
    try {
      await api.admin.rejectClubLocation(club.id)
      onResolved(club.id)
    } catch {
      setError('Failed to reject candidate location.')
    } finally {
      setPending(null)
    }
  }

  return (
    <li className="g-admin-item" data-testid="location-candidate-item">
      <div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="g-admin-head">
            <strong>{club.name}</strong>
            <span className="g-tag">{club.country}</span>
            <span className="g-muted" style={{ fontSize: '12px' }}>{club.league}</span>
            <span className="g-tag mono">{Math.round(candidate.confidence * 100)}% match</span>
          </div>
          <p className="g-admin-meta">
            <span>Candidate: </span>
            {candidate.sourceUrl ? (
              <a
                href={candidate.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
              >
                {candidate.wikidataId ?? 'Wikidata'}
              </a>
            ) : (
              <span className="mono">{candidate.wikidataId ?? 'Unknown'}</span>
            )}
            {candidate.stadium && (
              <>
                <span className="sep">·</span>
                <span>Stadium: {candidate.stadium}</span>
              </>
            )}
            {candidate.city && (
              <>
                <span className="sep">·</span>
                <span>City: {candidate.city}</span>
              </>
            )}
            {candidate.lat !== null && candidate.lng !== null && (
              <>
                <span className="sep">·</span>
                <a
                  href={osmUrl(candidate.lat, candidate.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  OSM map ({candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)})
                </a>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="g-admin-actions">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            disabled={pending !== null || !candidate.wikidataId}
            onClick={handleAccept}
            className="g-btn ok"
          >
            {pending === 'accept' ? 'Accepting…' : 'Accept'}
          </button>
          <button
            type="button"
            disabled={pending !== null}
            onClick={handleReject}
            className="g-btn bad"
          >
            {pending === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
      {error && <p className="g-error" role="alert">{error}</p>}
    </li>
  )
}

function ManualPlacementCard({
  club,
  onPlaced,
}: {
  club: UnplacedClub
  onPlaced: (clubId: number) => void
}) {
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [stadium, setStadium] = useState('')
  const [city, setCity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be a number between -90 and 90.')
      return
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError('Longitude must be a number between -180 and 180.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await api.admin.manualClubLocation(club.id, {
        lat: latNum,
        lng: lngNum,
        stadium: stadium.trim() || undefined,
        city: city.trim() || undefined,
      })
      onPlaced(club.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save coordinates.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <li className="g-admin-item" data-testid="unplaced-club-item" style={{ alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div className="g-admin-head">
          <strong>{club.name}</strong>
          <span className="g-tag">{club.country}</span>
          <span className="g-muted" style={{ fontSize: '12px' }}>{club.league}</span>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 10, display: 'grid', gap: 8, maxWidth: 500 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="g-field">
              <label htmlFor={`lat-${club.id}`}>Latitude (-90 to 90)</label>
              <input
                id={`lat-${club.id}`}
                type="number"
                step="any"
                required
                placeholder="e.g. 51.5074"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="g-input"
              />
            </div>
            <div className="g-field">
              <label htmlFor={`lng-${club.id}`}>Longitude (-180 to 180)</label>
              <input
                id={`lng-${club.id}`}
                type="number"
                step="any"
                required
                placeholder="e.g. -0.1278"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="g-input"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="g-field">
              <label htmlFor={`stadium-${club.id}`}>Stadium (optional)</label>
              <input
                id={`stadium-${club.id}`}
                type="text"
                placeholder="Stadium name"
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                className="g-input"
              />
            </div>
            <div className="g-field">
              <label htmlFor={`city-${club.id}`}>City (optional)</label>
              <input
                id={`city-${club.id}`}
                type="text"
                placeholder="City name"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="g-input"
              />
            </div>
          </div>
          <div>
            <button type="submit" disabled={submitting} className="g-btn ok">
              {submitting ? 'Saving…' : 'Save coordinates'}
            </button>
          </div>
          {error && <p className="g-error" role="alert">{error}</p>}
        </form>
      </div>
    </li>
  )
}

export default function ClubLocationsReview() {
  const [candidates, setCandidates] = useState<ClubLocationCandidate[]>([])
  const [unplaced, setUnplaced] = useState<UnplacedClub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.admin.clubLocationsReview()
      setCandidates(data.candidates)
      setUnplaced(data.unplaced)
    } catch {
      setError('Failed to load club locations review. Check backend and admin session.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div style={{ marginTop: 24, borderTop: '2px solid var(--g-line)', paddingTop: 16 }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, padding: '0 24px 8px' }}>
        Club locations
      </h3>
      <p className="g-panel-intro">
        Review unapplied Wikidata location candidates and unplaced clubs. Accepting candidate facts updates the club
        location and applies the facts; rejecting marks the facts superseded.
      </p>

      {error && (
        <div style={{ padding: '16px 24px' }} data-testid="location-review-error">
          <p className="g-error">{error}</p>
          <p style={{ marginTop: 12 }}>
            <button
              type="button"
              className="g-green-link"
              data-testid="location-review-error-retry"
              onClick={() => void load()}
            >
              Retry →
            </button>
          </p>
        </div>
      )}
      {loading && <p className="g-note" style={{ padding: '16px 24px' }}>Loading club locations…</p>}

      {!loading && !error && (
        <>
          <p
            className="g-note"
            style={{ padding: '12px 24px', borderBottom: '1px solid var(--g-line)' }}
            data-testid="location-review-count"
          >
            {candidates.length === 0
              ? 'No candidate matches waiting for review.'
              : `${candidates.length} candidate location matches to review`}
          </p>
          <ul className="g-list">
            {candidates.map((c) => (
              <CandidateCard
                key={c.club.id}
                item={c}
                onResolved={(clubId) => setCandidates((prev) => prev.filter((item) => item.club.id !== clubId))}
              />
            ))}
          </ul>

          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, padding: '8px 24px' }}>
              No match ({unplaced.length})
            </h4>
            <p className="g-note" style={{ padding: '0 24px 8px' }}>
              Clubs checked without a candidate match. Enter manual coordinates to place them on the map.
            </p>
            <ul className="g-list">
              {unplaced.map((club) => (
                <ManualPlacementCard
                  key={club.id}
                  club={club}
                  onPlaced={(clubId) => setUnplaced((prev) => prev.filter((c) => c.id !== clubId))}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
