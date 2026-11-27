import React from 'react'
import Link from 'next/link'
import type { PlayerCardData } from '@/types'

const ATTRIBUTE_LABELS: { key: keyof PlayerCardData['attributes']; label: string }[] = [
  { key: 'finishing', label: 'Finishing' },
  { key: 'creation', label: 'Creation' },
  { key: 'passing', label: 'Passing' },
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'defending', label: 'Defending' },
  { key: 'duels', label: 'Duels' },
  { key: 'discipline', label: 'Discipline' },
]

function CompetitionLabel({ name, id }: { name: string; id?: number | null }) {
  if (id != null) {
    return (
      <Link href={`/leagues/${id}`} className="g-green-link" data-testid="player-card-league-link">
        {name}
      </Link>
    )
  }
  return <>{name}</>
}

export interface PlayerCardProps {
  card: PlayerCardData | null | undefined
  position?: string | null
  competitionName?: string | null
  competitionId?: number | null
  playerName?: string
}

export default function PlayerCard({
  card,
  position,
  competitionName,
  competitionId,
  playerName,
}: PlayerCardProps) {
  if (!card) {
    return (
      <section className="g-panel g-player-card-panel" aria-label="Gallia card">
        <header className="g-panel-heading">
          <h2>Gallia card</h2>
          <span className="g-source-badge">Data: TheStatsAPI</span>
        </header>
        <div className="g-player-card-body g-card-empty">
          <div className="g-card-empty-state">
            <span className="g-card-empty-val" aria-hidden="true">—</span>
            <p className="g-card-empty-title">No rating available</p>
            <p className="g-muted">
              Percentile card ratings are computed for players active in tracked competitions with sufficient match minutes.
            </p>
            <p style={{ marginTop: 12 }}>
              <a href="#season-statistics" className="g-green-link" data-testid="player-card-empty-season-cta">
                See Season statistics →
              </a>
            </p>
          </div>
        </div>
      </section>
    )
  }

  const overall = Math.round(card.overall)
  const posGroup = card.positionGroup || position || 'Player'
  const comp = competitionName || 'competition'
  const compNode = <CompetitionLabel name={comp} id={competitionId} />

  return (
    <section className="g-panel g-player-card-panel" aria-label={`Gallia card for ${playerName ?? 'player'}`}>
      <header className="g-panel-heading">
        <h2>Gallia card</h2>
        <div className="g-card-header-meta">
          {card.limitedSample && (
            <span className="g-limited-sample-badge" role="status">
              Limited sample (&lt; 450 min)
            </span>
          )}
          <span className="g-source-badge">Data: TheStatsAPI</span>
        </div>
      </header>

      <div className="g-player-card-body">
        <div className="g-card-main-score">
          <div className="g-card-overall-wrap">
            <span className="g-card-overall" aria-label={`Overall rating ${overall}`}>
              {overall}
            </span>
            <span className="g-card-pos">{posGroup}</span>
          </div>
          <div className="g-card-summary">
            <p className="g-card-kicker">GALLIA RATING</p>
            <p className="g-card-desc">
              Normalised percentile benchmark vs all {posGroup}s in {compNode}.
            </p>
            {card.poolSize ? (
              <span className="g-card-pool">Pool size: {card.poolSize} players</span>
            ) : null}
          </div>
        </div>

        <div className="g-card-attributes-grid" role="region" aria-label="Attribute ratings">
          {ATTRIBUTE_LABELS.map(({ key, label }) => {
            const val = Math.round(card.attributes[key] ?? 50)
            return (
              <div key={key} className="g-card-attr-row">
                <span className="g-card-attr-label" id={`attr-${key}`}>
                  {label}
                </span>
                <div
                  className="g-card-attr-track"
                  role="progressbar"
                  aria-labelledby={`attr-${key}`}
                  aria-valuenow={val}
                  aria-valuemin={1}
                  aria-valuemax={99}
                >
                  <div
                    className="g-card-attr-fill"
                    style={{ width: `${Math.max(2, Math.min(100, val))}%` }}
                  />
                </div>
                <span className="g-card-attr-val" aria-hidden="true">
                  {val}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <footer className="g-card-footnote-wrap">
        <p className="g-card-footnote">
          Percentile vs {posGroup} in {compNode}, per 90; Gallia&apos;s own rating. · Data: TheStatsAPI
        </p>
      </footer>
    </section>
  )
}
