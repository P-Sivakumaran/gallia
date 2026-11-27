import Link from 'next/link'
import type {
  MatchDetailPayload,
  MatchLineupPlayer,
  MatchLineupSide,
  MatchPlayerStat,
  MatchResponse,
  MatchShot,
} from '@/types'
import {
  eventLabel,
  filterTimelineEvents,
  formatStatKey,
  isStatPair,
  minuteLabel,
  orderedStatKeys,
  parseFormationRows,
  shotMarker,
} from '@/lib/matchDisplay'

function PlayerName({
  tsaId,
  name,
  galliaPlayerIds,
}: {
  tsaId: string
  name: string
  galliaPlayerIds: Record<string, number>
}) {
  const gid = galliaPlayerIds[tsaId]
  if (gid != null) {
    return (
      <Link href={`/player/${gid}`} className="g-green-link">
        {name}
      </Link>
    )
  }
  return <span>{name}</span>
}

function FormationPitch({
  side,
  label,
  galliaPlayerIds,
}: {
  side: MatchLineupSide
  label: string
  galliaPlayerIds: Record<string, number>
}) {
  const rows = parseFormationRows(side.formation)
  const xi = side.startingXi
  const gk = xi[0]
  const outfield = xi.slice(1)
  let cursor = 0
  const layers: MatchLineupPlayer[][] = []
  if (gk) layers.push([gk])
  for (const count of rows) {
    layers.push(outfield.slice(cursor, cursor + count))
    cursor += count
  }
  if (cursor < outfield.length) layers.push(outfield.slice(cursor))

  return (
    <div className="g-formation" data-testid={`formation-${label.toLowerCase()}`}>
      <div className="g-formation-meta">
        <strong>{label}</strong>
        <span className="g-muted">{side.formation ?? 'Formation TBD'}</span>
      </div>
      <div className="g-pitch" role="img" aria-label={`${label} formation ${side.formation ?? 'unknown'}`}>
        {layers.map((row, ri) => (
          <div key={ri} className="g-pitch-row">
            {row.map((p) => (
              <div key={p.id} className="g-pitch-dot" title={p.name}>
                <span className="g-pitch-shirt" aria-hidden="true">
                  {p.shirt ?? '·'}
                </span>
                <span className="g-pitch-name">
                  <PlayerName tsaId={p.id} name={p.name} galliaPlayerIds={galliaPlayerIds} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <details className="g-lineup-list">
        <summary>List view · XI and bench</summary>
        <ol>
          {xi.map((p) => (
            <li key={p.id}>
              <span className="g-muted">{p.shirt ?? '—'}</span>{' '}
              <PlayerName tsaId={p.id} name={p.name} galliaPlayerIds={galliaPlayerIds} />
              {p.position ? <span className="g-muted"> · {p.position}</span> : null}
            </li>
          ))}
        </ol>
        {side.bench.length > 0 && (
          <>
            <p className="g-eyebrow" style={{ marginTop: 12 }}>
              Bench
            </p>
            <ul>
              {side.bench.map((p) => (
                <li key={p.id}>
                  <span className="g-muted">{p.shirt ?? '—'}</span>{' '}
                  <PlayerName tsaId={p.id} name={p.name} galliaPlayerIds={galliaPlayerIds} />
                </li>
              ))}
            </ul>
          </>
        )}
      </details>
    </div>
  )
}

function StatBars({
  stats,
  homeName,
  awayName,
}: {
  stats: MatchDetailPayload['teamStats']
  homeName: string
  awayName: string
}) {
  const keys = orderedStatKeys(stats as Record<string, unknown>)
  if (keys.length === 0) {
    return <p className="g-empty" style={{ padding: 16 }}>No team stats yet.</p>
  }
  return (
    <ul className="g-stat-bars" data-testid="match-stat-bars">
      {keys.map((key) => {
        const pair = stats[key]
        if (!isStatPair(pair)) return null
        const home = pair.home ?? 0
        const away = pair.away ?? 0
        const total = home + away || 1
        const homePct = (home / total) * 100
        const awayPct = (away / total) * 100
        return (
          <li key={key}>
            <div className="g-stat-bar-label">
              <span>{home}</span>
              <span>{formatStatKey(key)}</span>
              <span>{away}</span>
            </div>
            <div
              className="g-stat-bar-track"
              role="img"
              aria-label={`${formatStatKey(key)}: ${homeName} ${home}, ${awayName} ${away}`}
            >
              <span className="g-stat-bar-home" style={{ width: `${homePct}%` }} />
              <span className="g-stat-bar-away" style={{ width: `${awayPct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Shotmap({
  shots,
  homeTeamId,
  homeName,
  awayName,
}: {
  shots: MatchShot[]
  homeTeamId: string | null
  homeName: string
  awayName: string
}) {
  if (shots.length === 0) {
    return <p className="g-empty" style={{ padding: 16 }}>No shots recorded.</p>
  }
  return (
    <div className="g-shotmap" data-testid="match-shotmap">
      <svg viewBox="0 0 100 60" className="g-shotmap-svg" role="img" aria-label="Shot map, attacking half">
        <rect x="0" y="0" width="100" height="60" className="g-shotmap-turf" />
        <line x1="0" y1="0" x2="100" y2="0" className="g-shotmap-line" />
        <rect x="21" y="0" width="58" height="18" className="g-shotmap-box" fill="none" />
        <rect x="36" y="0" width="28" height="7" className="g-shotmap-box" fill="none" />
        <path d="M 30 18 A 20 20 0 0 0 70 18" className="g-shotmap-line" fill="none" />
        {shots.map((s, i) => {
          const { cx, cy, r } = shotMarker(s)
          const isHome = homeTeamId != null && s.teamId === homeTeamId
          const cls = s.isGoal ? 'g-shot-goal' : isHome ? 'g-shot-home' : 'g-shot-away'
          if (s.isGoal) {
            return (
              <g key={`${s.playerId}-${s.minute}-${i}`} className={cls}>
                <polygon
                  points={`${cx},${cy - r} ${cx + r * 0.9},${cy + r * 0.7} ${cx - r * 0.9},${cy + r * 0.7}`}
                  aria-label={`Goal by ${s.player}, minute ${s.minute ?? '?'}, xG ${s.xg ?? '—'}`}
                />
                <text x={cx} y={cy + r + 4} textAnchor="middle" className="g-shot-label">
                  G
                </text>
              </g>
            )
          }
          return (
            <circle
              key={`${s.playerId}-${s.minute}-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              className={cls}
              aria-label={`Shot by ${s.player}, xG ${s.xg ?? '—'}`}
            />
          )
        })}
      </svg>
      <ul className="g-shotmap-legend">
        <li>
          <span className="g-shot-swatch g-shot-home" aria-hidden="true" /> {homeName} shot
        </li>
        <li>
          <span className="g-shot-swatch g-shot-away" aria-hidden="true" /> {awayName} shot
        </li>
        <li>
          <span className="g-shot-swatch g-shot-goal is-tri" aria-hidden="true" /> Goal (triangle + G)
        </li>
        <li className="g-muted">Marker size scales with xG</li>
      </ul>
    </div>
  )
}

function RatingsTable({
  players,
  galliaPlayerIds,
}: {
  players: MatchPlayerStat[]
  galliaPlayerIds: Record<string, number>
}) {
  const sorted = [...players].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
  return (
    <div className="g-table-scroll" tabIndex={0} role="region" aria-label="Player ratings">
      <table className="g-table g-ratings-table" data-testid="match-ratings">
        <thead>
          <tr>
            <th scope="col" className="g-sticky-col">
              Player
            </th>
            <th scope="col" className="num">
              Min
            </th>
            <th scope="col" className="num">
              Rating
            </th>
            <th scope="col" className="num">
              G
            </th>
            <th scope="col" className="num">
              A
            </th>
            <th scope="col" className="num">
              xG
            </th>
            <th scope="col" className="num">
              Shots
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.playerId}>
              <td className="g-sticky-col">
                <PlayerName tsaId={p.playerId} name={p.name} galliaPlayerIds={galliaPlayerIds} />
                {p.position ? <span className="g-muted"> · {p.position}</span> : null}
              </td>
              <td className="num">{p.minutes}</td>
              <td className="num">{p.rating != null ? p.rating.toFixed(1) : '—'}</td>
              <td className="num">{p.goals}</td>
              <td className="num">{p.assists}</td>
              <td className="num">{p.xg != null ? p.xg.toFixed(2) : '—'}</td>
              <td className="num">{p.shots}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatchDetail({
  detail,
  homeName,
  awayName,
  galliaPlayerIds,
}: {
  detail: MatchDetailPayload
  homeName: string
  awayName: string
  galliaPlayerIds: Record<string, number>
}) {
  const events = filterTimelineEvents(detail.events ?? [])
  const homeTeamId = detail.lineups?.home?.teamId ?? null

  return (
    <div className="g-match-detail" data-testid="match-detail">
      {(detail.lineups?.home || detail.lineups?.away) && (
        <section className="g-panel" aria-label="Lineups">
          <div className="g-panel-heading">
            <h2>Lineups</h2>
            <span className="g-count-label">{detail.lineups.confirmed ? 'Confirmed' : 'Provisional'}</span>
          </div>
          <div className="g-lineups-grid">
            {detail.lineups.home && (
              <FormationPitch side={detail.lineups.home} label={homeName} galliaPlayerIds={galliaPlayerIds} />
            )}
            {detail.lineups.away && (
              <FormationPitch side={detail.lineups.away} label={awayName} galliaPlayerIds={galliaPlayerIds} />
            )}
          </div>
        </section>
      )}

      <section className="g-panel" aria-label="Key events">
        <div className="g-panel-heading">
          <h2>Key events</h2>
        </div>
        {events.length === 0 ? (
          <p className="g-empty" style={{ padding: 16 }}>No key events yet.</p>
        ) : (
          <ol className="g-match-timeline" data-testid="match-timeline">
            {events.map((e, i) => (
              <li key={`${e.type}-${e.minute}-${i}`}>
                <span className="g-timeline-min">{minuteLabel(e.minute, e.extra)}</span>
                <span className="g-timeline-type">{eventLabel(e.type)}</span>
                <span className="g-timeline-who">
                  {e.player ? (
                    <PlayerName tsaId={e.player.id} name={e.player.name} galliaPlayerIds={galliaPlayerIds} />
                  ) : (
                    '—'
                  )}
                  {e.related ? (
                    <>
                      {' '}
                      <span className="g-muted">({e.related.name})</span>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="g-panel" aria-label="Team stats">
        <div className="g-panel-heading">
          <h2>Team stats</h2>
          <span className="g-muted" style={{ fontSize: 12 }}>
            {homeName} · {awayName}
          </span>
        </div>
        <StatBars stats={detail.teamStats ?? {}} homeName={homeName} awayName={awayName} />
      </section>

      <section className="g-panel" aria-label="Shot map">
        <div className="g-panel-heading">
          <h2>Shot map</h2>
        </div>
        <Shotmap
          shots={detail.shots ?? []}
          homeTeamId={homeTeamId}
          homeName={homeName}
          awayName={awayName}
        />
      </section>

      <section className="g-panel" aria-label="Player ratings">
        <div className="g-panel-heading">
          <h2>Player ratings</h2>
        </div>
        {(detail.playerStats ?? []).length === 0 ? (
          <p className="g-empty" style={{ padding: 16 }}>No player lines yet.</p>
        ) : (
          <RatingsTable players={detail.playerStats} galliaPlayerIds={galliaPlayerIds} />
        )}
      </section>
    </div>
  )
}

export default function MatchView({ data }: { data: MatchResponse }) {
  const { match, detail, galliaPlayerIds, source } = data
  const kickoff = new Date(match.kickoffAt).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const homeGoals = match.home.goals ?? (match.status === 'scheduled' ? null : 0)
  const awayGoals = match.away.goals ?? (match.status === 'scheduled' ? null : 0)

  return (
    <div className="g-match-view" data-testid="match-view">
      <header className="g-match-scoreboard" data-testid="match-scoreboard">
        <p className="g-panel-intro">
          <Link href={`/leagues/${match.competition.id}`} className="g-green-link">
            {match.competition.name}
          </Link>
          {' · '}
          {match.season} · Matchday {match.matchday} · {match.status}
        </p>
        <div className="g-match-scoreline" aria-label={`${match.home.name} ${homeGoals ?? 'versus'} ${match.away.name} ${awayGoals ?? ''}`}>
          <div className="g-match-team is-home">
            {match.home.id != null ? (
              <Link href={`/club/${match.home.id}`} className="g-green-link">
                {match.home.name}
              </Link>
            ) : (
              <span>{match.home.name}</span>
            )}
          </div>
          <div className="g-match-score-nums">
            <span>{homeGoals == null ? '—' : homeGoals}</span>
            <span aria-hidden="true">–</span>
            <span>{awayGoals == null ? '—' : awayGoals}</span>
          </div>
          <div className="g-match-team is-away">
            {match.away.id != null ? (
              <Link href={`/club/${match.away.id}`} className="g-green-link">
                {match.away.name}
              </Link>
            ) : (
              <span>{match.away.name}</span>
            )}
          </div>
        </div>
        <p className="g-muted" style={{ textAlign: 'center', marginTop: 8 }}>
          {kickoff}
        </p>
      </header>

      {detail == null ? (
        <section className="g-panel" data-testid="match-detail-pending">
          <div className="g-panel-heading">
            <h2>Match detail</h2>
          </div>
          <div className="g-panel-body" style={{ padding: '0 24px 24px' }}>
            <p className="g-note">
              Match detail arrives a few hours after full time. Score and fixture are shown above meanwhile.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link
                href={`/leagues/${match.competition.id}`}
                className="g-green-link"
                data-testid="pending-league-link"
              >
                Open league table →
              </Link>
            </p>
          </div>
        </section>
      ) : (
        <MatchDetail
          detail={detail}
          homeName={match.home.name}
          awayName={match.away.name}
          galliaPlayerIds={galliaPlayerIds}
        />
      )}

      <p className="g-panel-intro" data-testid="match-source">
        Data: {source}
      </p>
    </div>
  )
}
