import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import DeskPage from '@/components/desk/DeskPage'
import MatchView from '@/components/desk/MatchView'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (Number.isNaN(id)) notFound()

  const data = await api.football.match(id).catch(() => null)
  if (!data) notFound()

  const title = `${data.match.home.name} vs ${data.match.away.name}`
  const competitionId = data.match.competition.id

  return (
    <DeskPage
      eyebrow="MATCH"
      title={title}
      intro={
        <>
          <Link href={`/leagues/${competitionId}`} className="g-green-link" style={{ display: 'inline' }}>
            {data.match.competition.name}
          </Link>
          {` · Matchday ${data.match.matchday}`}
        </>
      }
      actions={
        <Link href="/leagues" className="g-green-link" data-testid="all-leagues-link">
          All leagues →
        </Link>
      }
    >
      <MatchView data={data} />
    </DeskPage>
  )
}
