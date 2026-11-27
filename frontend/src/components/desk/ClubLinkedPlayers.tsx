import Link from 'next/link'
import type { Player } from '@/types'
import { formatMillions, toMillions } from '@/lib/format'

export function sortLinkedPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const pos = a.position.localeCompare(b.position)
    if (pos !== 0) return pos
    return a.name.localeCompare(b.name)
  })
}

export default function ClubLinkedPlayers({ players }: { players: Player[] }) {
  const rows = sortLinkedPlayers(players)

  return (
    <section className="g-panel" aria-labelledby="linked-players-title" data-testid="club-linked-players">
      <div className="g-panel-heading">
        <h2 id="linked-players-title">Linked players</h2>
        <span className="g-count-label">{rows.length} PLAYER{rows.length === 1 ? '' : 'S'}</span>
      </div>
      {rows.length === 0 ? (
        <p className="g-empty" style={{ padding: 24 }} data-testid="linked-players-empty">
          No Gallia players linked to this club yet.
        </p>
      ) : (
        <div className="g-table-scroll" tabIndex={0} role="region" aria-label="Linked players">
          <table className="g-table g-squad-table">
            <thead>
              <tr>
                <th scope="col" className="g-sticky-col">Name</th>
                <th scope="col">Pos</th>
                <th scope="col" className="num">Age</th>
                <th scope="col">Nat</th>
                <th scope="col" className="num">Value</th>
                <th scope="col">Contract</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const contract = p.contractEnd
                  ? new Date(p.contractEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  : '—'
                return (
                  <tr key={p.id}>
                    <td className="g-sticky-col">
                      <Link href={`/player/${p.id}`} className="g-green-link" data-testid="linked-player-link">
                        {p.name}
                      </Link>
                    </td>
                    <td>{p.position}</td>
                    <td className="num">{p.age ?? '—'}</td>
                    <td>{p.nationality ?? '—'}</td>
                    <td className="num">
                      {p.marketValue != null ? `€${formatMillions(toMillions(p.marketValue))}` : '—'}
                    </td>
                    <td>{contract}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
