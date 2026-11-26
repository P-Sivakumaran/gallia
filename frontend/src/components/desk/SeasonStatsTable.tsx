'use client'

import React, { useState } from 'react'
import type { PlayerSeasonLine } from '@/types'

export interface SeasonStatsTableProps {
  seasons: PlayerSeasonLine[] | undefined | null
}

const DETAIL_GROUPS = [
  { key: 'passing', label: 'Passing' },
  { key: 'duels', label: 'Duels' },
  { key: 'defending', label: 'Defending' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'shooting', label: 'Shooting' },
] as const

function formatStatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function DetailBreakdown({ detail }: { detail: Record<string, Record<string, number | null>> | null }) {
  if (!detail || typeof detail !== 'object') {
    return (
      <div className="g-season-detail-empty">
        <p className="g-muted">No detailed breakdown provided for this season.</p>
      </div>
    )
  }

  const activeGroups = DETAIL_GROUPS.filter((g) => {
    const data = detail[g.key]
    return data && typeof data === 'object' && Object.keys(data).length > 0
  })

  if (activeGroups.length === 0) {
    return (
      <div className="g-season-detail-empty">
        <p className="g-muted">No detailed stat categories recorded.</p>
      </div>
    )
  }

  return (
    <div className="g-season-detail-grid">
      {activeGroups.map((group) => {
        const stats = detail[group.key] || {}
        return (
          <div key={group.key} className="g-detail-card">
            <h4 className="g-detail-group-title">{group.label}</h4>
            <dl className="g-detail-list">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="g-detail-item">
                  <dt>{formatStatKey(k)}</dt>
                  <dd>{v != null ? (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(1) : v) : '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </div>
  )
}

export default function SeasonStatsTable({ seasons }: SeasonStatsTableProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  if (!seasons || seasons.length === 0) {
    return (
      <section className="g-panel" aria-label="Season statistics">
        <header className="g-panel-heading">
          <h2>Season statistics</h2>
          <span className="g-source-badge">Data: TheStatsAPI</span>
        </header>
        <div className="g-table-empty">
          <p className="g-muted">No season statistics recorded for this player.</p>
        </div>
      </section>
    )
  }

  const toggleRow = (idx: number) => {
    setExpandedIndex((prev) => (prev === idx ? null : idx))
  }

  return (
    <section className="g-panel" aria-label="Season statistics">
      <header className="g-panel-heading">
        <h2>Season statistics</h2>
        <span className="g-source-badge">Data: TheStatsAPI</span>
      </header>

      <div className="g-table-scroll" tabIndex={0} role="region" aria-label="Season stats table">
        <table className="g-table g-season-table">
          <thead>
            <tr>
              <th scope="col" className="g-sticky-col">Competition</th>
              <th scope="col">Season</th>
              <th scope="col" className="num">Apps (Starts)</th>
              <th scope="col" className="num">Min</th>
              <th scope="col" className="num">G</th>
              <th scope="col" className="num">A</th>
              <th scope="col" className="num">xG</th>
              <th scope="col" className="num">xA</th>
              <th scope="col" className="num">Rating</th>
              <th scope="col" className="g-col-action"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s, idx) => {
              const isExpanded = expandedIndex === idx
              const compName = s.competition?.name ?? 'League'
              const rowKey = `${s.competition?.id ?? 'comp'}-${s.season}-${idx}`
              return (
                <React.Fragment key={rowKey}>
                  <tr className={isExpanded ? 'g-row-expanded' : undefined}>
                    <td className="g-sticky-col">
                      <span className="g-comp-title">{compName}</span>
                      {s.current && <span className="g-current-pill">Current</span>}
                    </td>
                    <td>{s.season}</td>
                    <td className="num">
                      {s.appearances} {s.starts != null ? `(${s.starts})` : ''}
                    </td>
                    <td className="num">{s.minutes.toLocaleString()}</td>
                    <td className="num">{s.goals}</td>
                    <td className="num">{s.assists}</td>
                    <td className="num">{s.xg != null ? s.xg.toFixed(2) : '—'}</td>
                    <td className="num">{s.xa != null ? s.xa.toFixed(2) : '—'}</td>
                    <td className="num">
                      {s.rating != null ? (
                        <span className="g-rating-cell">{s.rating.toFixed(2)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="g-col-action">
                      <button
                        type="button"
                        className="g-expand-btn"
                        onClick={() => toggleRow(idx)}
                        aria-expanded={isExpanded}
                        aria-controls={`detail-row-${idx}`}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr id={`detail-row-${idx}`} className="g-detail-row">
                      <td colSpan={10}>
                        <DetailBreakdown detail={s.detail} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
