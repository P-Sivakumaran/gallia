import { notFound } from 'next/navigation'
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

  return (
    <DeskPage
      eyebrow="MATCH"
      title={title}
      intro={
        <>
          {data.match.competition.name} · Matchday {data.match.matchday}
        </>
      }
    >
      <MatchView data={data} />
    </DeskPage>
  )
}
