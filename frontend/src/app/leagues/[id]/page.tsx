import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import DeskPage from '@/components/desk/DeskPage'
import LeagueStandings from '@/components/desk/LeagueStandings'

export default async function LeagueTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (Number.isNaN(id)) notFound()
  const table = await api.football.table(id).catch(() => null)
  if (!table) notFound()

  return (
    <DeskPage
      eyebrow="LEAGUE TABLE"
      title={table.competition}
      intro={<>{table.season} · standings and leaders from gameweek snapshots.</>}
    >
      <LeagueStandings table={table} />
    </DeskPage>
  )
}
