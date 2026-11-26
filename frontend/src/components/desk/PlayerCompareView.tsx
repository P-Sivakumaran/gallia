'use client'

import React, { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { Player, PlayerFootballStatsResponse, PlayerCardData, PlayerSeasonLine } from '@/types'
import { formatMillions, toMillions } from '@/lib/format'

export interface PlayerComparePlayerData {
  player: Player
  footballData: PlayerFootballStatsResponse | null
}

export interface PlayerCompareViewProps {
  initialPlayerA?: PlayerComparePlayerData | null
  initialPlayerB?: PlayerComparePlayerData | null
}

const ATTRIBUTES: { key: keyof PlayerCardData['attributes']; label: string }[] = [
  { key: 'finishing', label: 'Finishing' },
  { key: 'creation', label: 'Creation' },
  { key: 'passing', label: 'Passing' },
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'defending', label: 'Defending' },
  { key: 'duels', label: 'Duels' },
  { key: 'discipline', label: 'Discipline' },
]

function getLatestSeason(data: PlayerFootballStatsResponse | null): PlayerSeasonLine | null {
  if (!data?.seasons?.length) return null
  return data.seasons.find((s) => s.current) ?? data.seasons[0] ?? null
}

function per90(val: number | null | undefined, minutes: number | undefined): string {
  if (val == null || !minutes || minutes <= 0) return '—'
  return ((val / minutes) * 90).toFixed(2)
}

interface PlayerPickerProps {
  label: string
  slot: 'A' | 'B'
  onSelect: (player: Player) => void
  onCancel?: () => void
}

function PlayerPicker({ label, slot, onSelect, onCancel }: PlayerPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    if (!val.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounce.current = setTimeout(async () => {
      try {
        const found = await api.players.search(val.trim())
        setResults(found || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
  }

  return (
    <div className="g-compare-picker-box" role="region" aria-label={`Select Player ${slot}`}>
      <label htmlFor={`picker-input-${slot}`} className="g-compare-picker-label">
        {label}
      </label>
      <div className="g-compare-search-wrap">
        <input
          id={`picker-input-${slot}`}
          ref={inputRef}
          type="search"
          role="combobox"
          className="g-compare-search-input"
          placeholder="Search player by name…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={results.length > 0}
        />
        {onCancel && (
          <button type="button" className="g-compare-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {loading && <p className="g-compare-picker-hint">Searching…</p>}

      {results.length > 0 && (
        <ul id={listboxId} className="g-compare-suggest-list" role="listbox">
          {results.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="g-compare-suggest-btn"
                onClick={() => onSelect(p)}
              >
                <div className="g-compare-suggest-main">
                  <strong>{p.name}</strong>
                  <span className="g-compare-suggest-pos">{p.position}</span>
                </div>
                <span className="g-compare-suggest-sub">
                  {p.currentClub?.name ?? 'No club'} {p.age ? `· age ${p.age}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.trim().length > 1 && results.length === 0 && (
        <p className="g-compare-picker-hint">No players found matching &ldquo;{query}&rdquo;</p>
      )}
    </div>
  )
}

export default function PlayerCompareView({
  initialPlayerA,
  initialPlayerB,
}: PlayerCompareViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [playerAData, setPlayerAData] = useState<PlayerComparePlayerData | null>(initialPlayerA ?? null)
  const [playerBData, setPlayerBData] = useState<PlayerComparePlayerData | null>(initialPlayerB ?? null)
  const [pickingA, setPickingA] = useState(!initialPlayerA)
  const [pickingB, setPickingB] = useState(!initialPlayerB)

  // Sync state if initial props change
  useEffect(() => {
    if (initialPlayerA) {
      setPlayerAData(initialPlayerA)
      setPickingA(false)
    }
  }, [initialPlayerA])

  useEffect(() => {
    if (initialPlayerB) {
      setPlayerBData(initialPlayerB)
      setPickingB(false)
    }
  }, [initialPlayerB])

  const updateUrl = (aId?: number | null, bId?: number | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (aId) params.set('a', String(aId))
    else params.delete('a')
    if (bId) params.set('b', String(bId))
    else params.delete('b')
    router.replace(`/compare?${params.toString()}`)
  }

  const handleSelectA = async (player: Player) => {
    setPickingA(false)
    const football = await api.football.player(player.id).catch(() => null)
    setPlayerAData({ player, footballData: football })
    updateUrl(player.id, playerBData?.player.id)
  }

  const handleSelectB = async (player: Player) => {
    setPickingB(false)
    const football = await api.football.player(player.id).catch(() => null)
    setPlayerBData({ player, footballData: football })
    updateUrl(playerAData?.player.id, player.id)
  }

  const handleRemoveA = () => {
    setPlayerAData(null)
    setPickingA(true)
    updateUrl(null, playerBData?.player.id)
  }

  const handleRemoveB = () => {
    setPlayerBData(null)
    setPickingB(true)
    updateUrl(playerAData?.player.id, null)
  }

  const handleSwap = () => {
    const nextA = playerBData
    const nextB = playerAData
    setPlayerAData(nextA)
    setPlayerBData(nextB)
    setPickingA(!nextA)
    setPickingB(!nextB)
    updateUrl(nextA?.player.id, nextB?.player.id)
  }

  const seasonA = getLatestSeason(playerAData?.footballData ?? null)
  const seasonB = getLatestSeason(playerBData?.footballData ?? null)
  const cardA = seasonA?.card ?? null
  const cardB = seasonB?.card ?? null

  const overallA = cardA ? Math.round(cardA.overall) : null
  const overallB = cardB ? Math.round(cardB.overall) : null

  return (
    <div className="g-compare-view">
      {/* Top Header Actions */}
      <div className="g-compare-header-row">
        <h2 className="g-compare-section-title">Side-by-side roster comparison</h2>
        {playerAData && playerBData && (
          <button
            type="button"
            className="g-compare-swap-btn"
            onClick={handleSwap}
            aria-label="Swap Player A and Player B"
          >
            ⇄ Swap sides
          </button>
        )}
      </div>

      {/* Players Header Cards (Slots A & B) */}
      <div className="g-compare-slots-grid">
        {/* Slot A */}
        <div className="g-compare-slot g-compare-slot-a">
          {pickingA || !playerAData ? (
            <PlayerPicker
              label="Select Player A"
              slot="A"
              onSelect={handleSelectA}
              onCancel={playerAData ? () => setPickingA(false) : undefined}
            />
          ) : (
            <div className="g-compare-player-card">
              <div className="g-compare-player-header">
                <span className="g-compare-slot-pill">Player A</span>
                <div className="g-compare-slot-actions">
                  <button
                    type="button"
                    className="g-compare-action-link"
                    onClick={() => setPickingA(true)}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className="g-compare-action-link g-text-danger"
                    onClick={handleRemoveA}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="g-compare-player-identity">
                <h3 className="g-compare-player-name">
                  <Link href={`/player/${playerAData.player.id}`} className="g-player-link">
                    {playerAData.player.name}
                  </Link>
                </h3>
                <p className="g-compare-player-meta">
                  {[
                    playerAData.player.position,
                    playerAData.player.currentClub?.name ?? 'No club',
                    playerAData.player.nationality,
                    playerAData.player.age ? `age ${playerAData.player.age}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {playerAData.player.marketValue && (
                  <p className="g-compare-player-val">
                    €{formatMillions(toMillions(playerAData.player.marketValue))} reported value
                  </p>
                )}
              </div>

              <div className="g-compare-score-banner">
                <div className="g-compare-score-block">
                  <span className="g-compare-score-num">
                    {overallA != null ? overallA : '—'}
                  </span>
                  <span className="g-compare-score-label">GALLIA RATING</span>
                </div>
                <div className="g-compare-season-meta">
                  <span className="g-compare-season-comp">
                    {seasonA?.competition?.name ?? 'No season data'} {seasonA?.season ? `(${seasonA.season})` : ''}
                  </span>
                  {cardA?.limitedSample && (
                    <span className="g-limited-sample-badge" role="status">
                      Limited sample (&lt; 450 min)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Slot B */}
        <div className="g-compare-slot g-compare-slot-b">
          {pickingB || !playerBData ? (
            <PlayerPicker
              label="Select Player B"
              slot="B"
              onSelect={handleSelectB}
              onCancel={playerBData ? () => setPickingB(false) : undefined}
            />
          ) : (
            <div className="g-compare-player-card">
              <div className="g-compare-player-header">
                <span className="g-compare-slot-pill">Player B</span>
                <div className="g-compare-slot-actions">
                  <button
                    type="button"
                    className="g-compare-action-link"
                    onClick={() => setPickingB(true)}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className="g-compare-action-link g-text-danger"
                    onClick={handleRemoveB}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="g-compare-player-identity">
                <h3 className="g-compare-player-name">
                  <Link href={`/player/${playerBData.player.id}`} className="g-player-link">
                    {playerBData.player.name}
                  </Link>
                </h3>
                <p className="g-compare-player-meta">
                  {[
                    playerBData.player.position,
                    playerBData.player.currentClub?.name ?? 'No club',
                    playerBData.player.nationality,
                    playerBData.player.age ? `age ${playerBData.player.age}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {playerBData.player.marketValue && (
                  <p className="g-compare-player-val">
                    €{formatMillions(toMillions(playerBData.player.marketValue))} reported value
                  </p>
                )}
              </div>

              <div className="g-compare-score-banner">
                <div className="g-compare-score-block">
                  <span className="g-compare-score-num">
                    {overallB != null ? overallB : '—'}
                  </span>
                  <span className="g-compare-score-label">GALLIA RATING</span>
                </div>
                <div className="g-compare-season-meta">
                  <span className="g-compare-season-comp">
                    {seasonB?.competition?.name ?? 'No season data'} {seasonB?.season ? `(${seasonB.season})` : ''}
                  </span>
                  {cardB?.limitedSample && (
                    <span className="g-limited-sample-badge" role="status">
                      Limited sample (&lt; 450 min)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mirrored Attribute Ratings Section */}
      <section className="g-panel g-compare-spine-panel" aria-label="Mirrored attribute ratings">
        <header className="g-panel-heading">
          <h2>Attribute profiles (1–99)</h2>
          <span className="g-source-badge">Data: TheStatsAPI</span>
        </header>

        <div className="g-compare-spine-body">
          <div className="g-compare-spine-head-row">
            <span className="g-compare-spine-player-a">
              {playerAData?.player.name ?? 'Player A'}
            </span>
            <span className="g-compare-spine-center-label">ATTRIBUTE</span>
            <span className="g-compare-spine-player-b">
              {playerBData?.player.name ?? 'Player B'}
            </span>
          </div>

          <div className="g-compare-spine-rows">
            {ATTRIBUTES.map(({ key, label }) => {
              const valA = cardA?.attributes?.[key] != null ? Math.round(cardA.attributes[key]) : null
              const valB = cardB?.attributes?.[key] != null ? Math.round(cardB.attributes[key]) : null

              return (
                <div key={key} className="g-compare-spine-row">
                  {/* Player A Bar (anchored right towards center) */}
                  <div className="g-compare-side-a">
                    <span className="g-compare-val-a" aria-hidden="true">
                      {valA != null ? valA : '—'}
                    </span>
                    <div
                      className="g-compare-bar-track-left"
                      role="progressbar"
                      aria-label={`${playerAData?.player.name ?? 'Player A'} ${label}: ${valA != null ? valA : 'unrated'}`}
                      aria-valuenow={valA != null ? valA : undefined}
                      aria-valuemin={1}
                      aria-valuemax={99}
                    >
                      {valA != null && (
                        <div
                          className="g-compare-bar-fill-left"
                          style={{ width: `${Math.max(2, Math.min(100, valA))}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Central Attribute Label */}
                  <div className="g-compare-spine-label">
                    <span>{label}</span>
                  </div>

                  {/* Player B Bar (anchored left from center) */}
                  <div className="g-compare-side-b">
                    <div
                      className="g-compare-bar-track-right"
                      role="progressbar"
                      aria-label={`${playerBData?.player.name ?? 'Player B'} ${label}: ${valB != null ? valB : 'unrated'}`}
                      aria-valuenow={valB != null ? valB : undefined}
                      aria-valuemin={1}
                      aria-valuemax={99}
                    >
                      {valB != null && (
                        <div
                          className="g-compare-bar-fill-right"
                          style={{ width: `${Math.max(2, Math.min(100, valB))}%` }}
                        />
                      )}
                    </div>
                    <span className="g-compare-val-b" aria-hidden="true">
                      {valB != null ? valB : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <footer className="g-card-footnote-wrap">
            <p className="g-card-footnote">
              Normalised percentile benchmark vs respective position group in competition, per 90; Gallia&apos;s own rating. · Data: TheStatsAPI
            </p>
          </footer>
        </div>
      </section>

      {/* Per-90 Metrics Table Section */}
      <section className="g-panel g-compare-metrics-panel" aria-label="Key per-90 metrics">
        <header className="g-panel-heading">
          <h2>Key per-90 metrics</h2>
          <span className="g-source-badge">Data: TheStatsAPI</span>
        </header>

        <div className="g-table-scroll" tabIndex={0} role="region" aria-label="Per 90 metrics table">
          <table className="g-table g-compare-metrics-table">
            <thead>
              <tr>
                <th scope="col" className="g-col-side-a">
                  {playerAData?.player.name ?? 'Player A'}
                </th>
                <th scope="col" className="g-col-metric-name">
                  Metric (Per 90)
                </th>
                <th scope="col" className="g-col-side-b">
                  {playerBData?.player.name ?? 'Player B'}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="g-col-side-a num">
                  {seasonA?.minutes != null ? seasonA.minutes.toLocaleString() : '—'}
                </td>
                <th scope="row" className="g-col-metric-name">
                  Minutes played
                </th>
                <td className="g-col-side-b num">
                  {seasonB?.minutes != null ? seasonB.minutes.toLocaleString() : '—'}
                </td>
              </tr>
              <tr>
                <td className="g-col-side-a num">{per90(seasonA?.goals, seasonA?.minutes)}</td>
                <th scope="row" className="g-col-metric-name">
                  Goals / 90
                </th>
                <td className="g-col-side-b num">{per90(seasonB?.goals, seasonB?.minutes)}</td>
              </tr>
              <tr>
                <td className="g-col-side-a num">{per90(seasonA?.assists, seasonA?.minutes)}</td>
                <th scope="row" className="g-col-metric-name">
                  Assists / 90
                </th>
                <td className="g-col-side-b num">{per90(seasonB?.assists, seasonB?.minutes)}</td>
              </tr>
              <tr>
                <td className="g-col-side-a num">{per90(seasonA?.xg, seasonA?.minutes)}</td>
                <th scope="row" className="g-col-metric-name">
                  xG / 90
                </th>
                <td className="g-col-side-b num">{per90(seasonB?.xg, seasonB?.minutes)}</td>
              </tr>
              <tr>
                <td className="g-col-side-a num">{per90(seasonA?.xa, seasonA?.minutes)}</td>
                <th scope="row" className="g-col-metric-name">
                  xA / 90
                </th>
                <td className="g-col-side-b num">{per90(seasonB?.xa, seasonB?.minutes)}</td>
              </tr>
              <tr>
                <td className="g-col-side-a num">
                  {seasonA?.rating != null ? seasonA.rating.toFixed(2) : '—'}
                </td>
                <th scope="row" className="g-col-metric-name">
                  Match Rating
                </th>
                <td className="g-col-side-b num">
                  {seasonB?.rating != null ? seasonB.rating.toFixed(2) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
