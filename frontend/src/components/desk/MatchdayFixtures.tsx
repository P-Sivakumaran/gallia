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
        <div className="g-empty" style={{ padding: 16 }} data-testid="matchday-empty">
          <p>No fixtures for this matchday.</p>
          <p style={{ marginTop: 12 }}>
            <Link
              href={`/leagues/${competitionId}`}
              className="g-green-link"
              data-testid="matchday-empty-league-cta"
            >
              See league table →
            </Link>
          </p>
        </div>
      ) : (
        <ul className="g-fixture-list">
          {data.fixtures.map((f) => {
            const homeGoals = scoreLabel(f.home.goals, f.status)
            const awayGoals = scoreLabel(f.away.goals, f.status)
            const matchHref = `/match/${f.id}`
            return (
              <li key={f.id}>
                <div className="g-fixture-row">
                  <Link href={matchHref} className="g-fixture-kickoff g-green-link">
                    {kickoffLabel(f.kickoffAt)}
                  </Link>
                  <span className="g-fixture-sides">
                    <Link href={`/club/${f.home.id}`} className="g-fixture-home g-green-link" data-testid="fixture-home-club">
                      {f.home.name}
                    </Link>
                    <Link
                      href={matchHref}
                      className="g-fixture-score g-green-link"
                      aria-label={`${homeGoals} to ${awayGoals}, open match`}
                      data-testid="fixture-match-link"
                    >
                      <span>{homeGoals}</span>
                      <span aria-hidden="true">–</span>
                      <span>{awayGoals}</span>
                    </Link>
                    <Link href={`/club/${f.away.id}`} className="g-fixture-away g-green-link" data-testid="fixture-away-club">
                      {f.away.name}
                    </Link>
                  </span>
                  <Link href={matchHref} className="g-fixture-status g-green-link">
                    {f.status}{f.hasDetail ? ' · detail' : ''}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="g-panel-intro" style={{ padding: '8px 16px 16px' }}>Data: {data.source}</p>
    </section>
  )
}
