import Link from 'next/link'
import type { ClubSquad as ClubSquadData, SquadPlayer } from '@/types'

const GROUPS = [
  { key: 'GK', label: 'Goalkeepers' },
  { key: 'DEF', label: 'Defenders' },
  { key: 'MID', label: 'Midfielders' },
  { key: 'FWD', label: 'Forwards' },
] as const

export function normalisePositionGroup(raw: string | null | undefined): string {
  if (!raw) return 'MID'
  const u = raw.toUpperCase()
  if (u === 'GK' || u.startsWith('G')) return 'GK'
  if (u === 'DEF' || u.startsWith('D') || u === 'CB' || u === 'LB' || u === 'RB' || u === 'LWB' || u === 'RWB') return 'DEF'
  if (u === 'FWD' || u.startsWith('F') || u === 'ST' || u === 'CF' || u === 'LW' || u === 'RW') return 'FWD'
  return 'MID'
}

export function groupSquad(players: SquadPlayer[]): { key: string; label: string; players: SquadPlayer[] }[] {
  const buckets = new Map<string, SquadPlayer[]>()
  for (const g of GROUPS) buckets.set(g.key, [])
  for (const p of players) {
    const key = normalisePositionGroup(p.positionGroup)
    buckets.get(key)!.push(p)
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99) || a.name.localeCompare(b.name))
  }
  return GROUPS.map((g) => ({ key: g.key, label: g.label, players: buckets.get(g.key)! })).filter((g) => g.players.length > 0)
}

function SquadTable({ players }: { players: SquadPlayer[] }) {
  return (
    <div className="g-table-scroll" tabIndex={0} role="region" aria-label="Season squad">
      <table className="g-table g-squad-table">
        <thead>
          <tr>
            <th scope="col" className="num">#</th>
            <th scope="col" className="g-sticky-col">Name</th>
            <th scope="col" className="num">Age</th>
            <th scope="col">Nat</th>
            <th scope="col" className="num">Apps</th>
            <th scope="col" className="num">Min</th>
            <th scope="col" className="num">G</th>
            <th scope="col" className="num">A</th>
            <th scope="col" className="num">Rating</th>
            <th scope="col">Card</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={`${p.id}-${p.competition}`}>
              <td className="num">{p.shirtNumber ?? '—'}</td>
              <td className="g-sticky-col">
                <Link href={`/player/${p.id}`} className="g-green-link">{p.name}</Link>
              </td>
              <td className="num">{p.age ?? '—'}</td>
              <td>{p.nationality ?? '—'}</td>
              <td className="num">{p.appearances}</td>
              <td className="num">{p.minutes}</td>
              <td className="num">{p.goals}</td>
              <td className="num">{p.assists}</td>
              <td className="num">{p.rating != null ? p.rating.toFixed(2) : '—'}</td>
              <td>
                {p.card ? (
                  <span className="g-card-badge" title={p.card.limitedSample ? 'Limited sample' : undefined}>
                    {Math.round(p.card.overall)}
                    {p.card.limitedSample && <span className="g-note"> limited sample</span>}
                  </span>
                ) : (
                  <span className="g-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ClubSquad({ squad }: { squad: ClubSquadData }) {
  const groups = groupSquad(squad.players)
  return (
    <section className="g-panel" aria-labelledby="squad-title" data-testid="club-squad">
      <div className="g-panel-heading">
        <h2 id="squad-title">Season squad</h2>
        <span className="g-count-label">{squad.players.length} players · {squad.source}</span>
      </div>
      {groups.length === 0 ? (
        <p className="g-empty" style={{ padding: 24 }}>No season squad stats synced for this club yet.</p>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="g-squad-group">
            <div className="g-panel-heading g-squad-group-head">
              <h3>{g.label}</h3>
              <span className="g-count-label">{g.players.length}</span>
            </div>
            <SquadTable players={g.players} />
          </div>
        ))
      )}
    </section>
  )
}
