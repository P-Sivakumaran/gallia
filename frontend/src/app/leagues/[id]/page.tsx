import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import DeskPage from '@/components/desk/DeskPage'
import LeagueStandings from '@/components/desk/LeagueStandings'
import MatchdayFixtures from '@/components/desk/MatchdayFixtures'

export default async function LeagueTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ matchday?: string }>
}) {
  const { id: rawId } = await params
  const { matchday: rawMd } = await searchParams
  const id = parseInt(rawId, 10)
  if (Number.isNaN(id)) notFound()

  const requestedMd = rawMd != null ? parseInt(rawMd, 10) : undefined
  const matchday = requestedMd != null && !Number.isNaN(requestedMd) ? requestedMd : undefined

  const [table, fixtures] = await Promise.all([
    api.football.table(id).catch(() => null),
    api.football.fixtures(id, matchday).catch(() => null),
  ])
  if (!table) notFound()

  let hasNext = false
  if (fixtures) {
    const next = await api.football.fixtures(id, fixtures.matchday + 1).catch(() => null)
    hasNext = (next?.fixtures.length ?? 0) > 0
  }

  return (
    <DeskPage
      eyebrow="LEAGUE TABLE"
      title={table.competition}
      intro={<>{table.season} · standings, fixtures and leaders from gameweek snapshots.</>}
      actions={
        <Link href="/leagues" className="g-green-link" data-testid="all-leagues-link">
          All leagues →
        </Link>
      }
    >
      <div className="g-stack" style={{ display: 'grid', gap: 16 }}>
        {fixtures && (
          <MatchdayFixtures competitionId={id} data={fixtures} hasNext={hasNext} />
        )}
        <LeagueStandings table={table} />
      </div>
    </DeskPage>
  )
}
