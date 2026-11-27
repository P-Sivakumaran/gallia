import Link from 'next/link'
import type { CompetitionTable, LeaderEntry, StandingRow } from '@/types'

export type FormResult = 'W' | 'D' | 'L'

/** Parse a form string (e.g. "WWDLW") into W/D/L results, newest last as stored. */
export function parseForm(form: string | null | undefined): FormResult[] {
  if (!form) return []
  return [...form.toUpperCase()].filter((c): c is FormResult => c === 'W' || c === 'D' || c === 'L')
}

/** Group rows by groupLabel when any non-empty label exists (Champions League). */
export function groupStandings(rows: StandingRow[]): { label: string | null; rows: StandingRow[] }[] {
  const hasGroups = rows.some((r) => r.groupLabel && r.groupLabel.trim() !== '')
  if (!hasGroups) return [{ label: null, rows }]
  const order: string[] = []
  const map = new Map<string, StandingRow[]>()
  for (const r of rows) {
    const key = r.groupLabel?.trim() || 'Ungrouped'
    if (!map.has(key)) {
      order.push(key)
      map.set(key, [])
    }
    map.get(key)!.push(r)
  }
  return order.map((label) => ({ label, rows: map.get(label)! }))
}

export function FormPills({ form }: { form: string | null }) {
  const results = parseForm(form)
  if (results.length === 0) return <span className="g-muted">—</span>
  return (
    <span className="g-form-pills" aria-label={`Form ${results.join(' ')}`}>
      {results.map((r, i) => (
        <span key={`${r}-${i}`} className={`g-form-pill g-form-${r.toLowerCase()}`} title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}>
          {r}
        </span>
      ))}
    </span>
  )
}

function fmtXg(n: number | null): string {
  if (n == null) return '—'
  return n.toFixed(1)
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="g-table-scroll" tabIndex={0} role="region" aria-label="League table">
      <table className="g-table g-standings-table">
        <thead>
          <tr>
            <th scope="col" className="num">#</th>
            <th scope="col" className="g-sticky-col">Club</th>
            <th scope="col" className="num">P</th>
            <th scope="col" className="num">W</th>
            <th scope="col" className="num">D</th>
            <th scope="col" className="num">L</th>
            <th scope="col" className="num">GF</th>
            <th scope="col" className="num">GA</th>
            <th scope="col" className="num">GD</th>
            <th scope="col" className="num">Pts</th>
            <th scope="col">Form</th>
            <th scope="col" className="num">xGF</th>
            <th scope="col" className="num">xGA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.groupLabel}-${r.clubId}`}>
              <td className="num">{r.position}</td>
              <td className="g-sticky-col">
                <Link href={`/club/${r.clubId}`} className="g-green-link">{r.club}</Link>
              </td>
              <td className="num">{r.played}</td>
              <td className="num">{r.wins}</td>
              <td className="num">{r.draws}</td>
              <td className="num">{r.losses}</td>
              <td className="num">{r.goalsFor}</td>
              <td className="num">{r.goalsAgainst}</td>
              <td className="num">{r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
              <td className="num g-pts">{r.points}</td>
              <td><FormPills form={r.form} /></td>
              <td className="num">{fmtXg(r.xgFor)}</td>
              <td className="num">{fmtXg(r.xgAgainst)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LeadersPanel({
  title,
  entries,
  clubNames,
  format = (v) => String(v),
}: {
  title: string
  entries: LeaderEntry[]
  clubNames: Map<number, string>
  format?: (v: number) => string
}) {
  return (
    <section className="g-panel g-leaders-panel" aria-label={title}>
      <div className="g-panel-heading">
        <h2>{title}</h2>
        <span className="g-count-label">Top {Math.min(10, entries.length) || 0}</span>
      </div>
      {entries.length === 0 ? (
        <div className="g-empty" style={{ padding: 16 }} data-testid="leaders-empty">
          <p>No leaders yet.</p>
          {clubNames.size > 0 && (
            <p style={{ marginTop: 12 }}>
              <a href="#league-standings-table" className="g-green-link" data-testid="leaders-empty-standings-cta">
                See standings →
              </a>
            </p>
          )}
        </div>
      ) : (
        <ol className="g-leaders-list">
          {entries.slice(0, 10).map((e, i) => {
            const clubLabel = e.clubId != null ? clubNames.get(e.clubId) : null
            return (
              <li key={e.playerId}>
                <span className="g-leaders-rank">{i + 1}</span>
                <span className="g-leaders-player">
                  <Link href={`/player/${e.playerId}`} className="g-green-link">{e.name}</Link>
                  {e.clubId != null && (
                    <Link
                      href={`/club/${e.clubId}`}
                      className="g-leaders-club g-green-link"
                      data-testid="leader-club-link"
                    >
                      {clubLabel ?? `Club #${e.clubId}`}
                    </Link>
                  )}
                </span>
                <span className="g-leaders-val">{format(e.value)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default function LeagueStandings({ table }: { table: CompetitionTable }) {
  const groups = groupStandings(table.standings)
  const clubNames = new Map(table.standings.map((r) => [r.clubId, r.club]))
  const updated = table.frozenAt
    ? new Date(table.frozenAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="g-league-standings" data-testid="league-standings">
      <p className="g-panel-intro" data-testid="league-meta">
        {table.matchday != null ? `Matchday ${table.matchday}` : 'Pre-season'}
        {updated ? `, updated ${updated}` : ''}
        {' · '}
        Data: {table.source}
      </p>

      {table.standings.length === 0 ? (
        <div className="g-empty" style={{ padding: 24 }} data-testid="standings-empty">
          <p>No standings for this competition yet.</p>
          <p style={{ marginTop: 12 }}>
            <Link href="/leagues" className="g-green-link" data-testid="standings-empty-all-leagues-cta">
              All leagues →
            </Link>
          </p>
        </div>
      ) : (
        <div id="league-standings-table">
          {groups.map((g) => (
            <section key={g.label ?? 'main'} className="g-panel" style={{ marginBottom: 16 }}>
              {g.label && (
                <div className="g-panel-heading">
                  <h2>{g.label}</h2>
                </div>
              )}
              <StandingsTable rows={g.rows} />
            </section>
          ))}
        </div>
      )}

      <div className="g-leaders-grid" data-testid="leaders-grid">
        {table.leaders ? (
          <>
            <LeadersPanel title="Goals" entries={table.leaders.goals} clubNames={clubNames} />
            <LeadersPanel title="Assists" entries={table.leaders.assists} clubNames={clubNames} />
            <LeadersPanel title="xG" entries={table.leaders.xg} clubNames={clubNames} format={(v) => v.toFixed(1)} />
            <LeadersPanel title="Rating" entries={table.leaders.rating} clubNames={clubNames} format={(v) => v.toFixed(2)} />
          </>
        ) : (
          <p className="g-note" style={{ padding: '0 24px' }} data-testid="leaders-null">
            Leaders appear after the first gameweek snapshot closes.
          </p>
        )}
      </div>
    </div>
  )
}
