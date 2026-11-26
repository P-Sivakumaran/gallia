import Link from 'next/link'
import type { MatchdayFixturesResponse } from '@/types'

function scoreLabel(goals: number | null, status: string): string {
  if (goals == null) return status === 'finished' || status === 'live' ? '0' : '—'
  return String(goals)
}

function kickoffLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MatchdayFixtures({
  competitionId,
  data,
  hasNext,
}: {
  competitionId: number
  data: MatchdayFixturesResponse
  hasNext: boolean
}) {
  const prev = data.matchday > 1 ? data.matchday - 1 : null
  const next = hasNext ? data.matchday + 1 : null

  return (
    <section className="g-panel g-matchday-strip" aria-label={`Matchday ${data.matchday} fixtures`} data-testid="matchday-fixtures">
      <div className="g-panel-heading g-matchday-heading">
        <h2>Matchday {data.matchday}</h2>
        <div className="g-matchday-nav" role="group" aria-label="Matchday navigation">
          {prev != null ? (
            <Link
              href={`/leagues/${competitionId}?matchday=${prev}`}
              className="g-matchday-btn"
              aria-label={`Previous matchday, ${prev}`}
            >
              Previous
            </Link>
          ) : (
            <span className="g-matchday-btn is-disabled" aria-disabled="true">Previous</span>
          )}
          {next != null ? (
            <Link
              href={`/leagues/${competitionId}?matchday=${next}`}
              className="g-matchday-btn"
              aria-label={`Next matchday, ${next}`}
            >
              Next
            </Link>
          ) : (
            <span className="g-matchday-btn is-disabled" aria-disabled="true">Next</span>
          )}
        </div>
      </div>

      {data.fixtures.length === 0 ? (
        <p className="g-empty" style={{ padding: 16 }} data-testid="matchday-empty">
          No fixtures for this matchday.
        </p>
      ) : (
        <ul className="g-fixture-list">
          {data.fixtures.map((f) => (
            <li key={f.id}>
              <Link href={`/match/${f.id}`} className="g-fixture-row">
                <span className="g-fixture-kickoff">{kickoffLabel(f.kickoffAt)}</span>
                <span className="g-fixture-sides">
                  <span className="g-fixture-home">{f.home.name}</span>
                  <span className="g-fixture-score" aria-label={`${scoreLabel(f.home.goals, f.status)} to ${scoreLabel(f.away.goals, f.status)}`}>
                    <span>{scoreLabel(f.home.goals, f.status)}</span>
                    <span aria-hidden="true">–</span>
                    <span>{scoreLabel(f.away.goals, f.status)}</span>
                  </span>
                  <span className="g-fixture-away">{f.away.name}</span>
                </span>
                <span className="g-fixture-status">{f.status}{f.hasDetail ? ' · detail' : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="g-panel-intro" style={{ padding: '8px 16px 16px' }}>Data: {data.source}</p>
    </section>
  )
}
