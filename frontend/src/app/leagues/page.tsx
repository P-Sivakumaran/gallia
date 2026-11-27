import Link from 'next/link'
import { api } from '@/lib/api'
import DeskPage from '@/components/desk/DeskPage'
import { groupCompetitionsByCountry } from '@/lib/leaguesHub'

export default async function LeaguesHubPage() {
  const data = await api.football.competitions().catch(() => ({ source: 'TheStatsAPI', competitions: [] }))
  const comps = data.competitions
  const groups = groupCompetitionsByCountry(comps)

  return (
    <DeskPage
      eyebrow="FOOTBALL"
      title="Leagues"
      intro="Tracked competitions with tables and leaders from TheStatsAPI gameweek snapshots."
    >
      <section className="g-panel" aria-labelledby="leagues-hub-title">
        <div className="g-panel-heading">
          <h2 id="leagues-hub-title">Competitions</h2>
          <span className="g-count-label">{comps.length} tracked · {data.source}</span>
        </div>
        {comps.length === 0 ? (
          <p className="g-empty" style={{ padding: 24 }}>
            No competitions synced yet. Run the football-data sync when TheStatsAPI is on a paid plan.
          </p>
        ) : (
          <div className="g-leagues-hub" data-testid="leagues-hub-groups">
            {groups.map((g) => (
              <div key={g.country} className="g-squad-group">
                <div className="g-panel-heading g-squad-group-head">
                  <h3>{g.country}</h3>
                  <span className="g-count-label">{g.competitions.length}</span>
                </div>
                <ul className="g-list">
                  {g.competitions.map((c) => (
                    <li key={c.id} className="g-admin-item">
                      <div className="g-admin-head">
                        <Link href={`/leagues/${c.id}`} className="g-green-link">
                          <strong>{c.name}</strong>
                        </Link>
                        <span className="g-tag">{c.type.toLowerCase()}</span>
                      </div>
                      <p className="g-note">{c.season?.name || 'Season pending'}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </DeskPage>
  )
}
