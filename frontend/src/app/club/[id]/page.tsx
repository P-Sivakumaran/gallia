import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import ClubDashboard from '@/components/ClubDashboard'
import DeskPage from '@/components/desk/DeskPage'
import ClubLinkedPlayers from '@/components/desk/ClubLinkedPlayers'
import ClubSquad from '@/components/desk/ClubSquad'

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  const club = await api.clubs.get(id).catch(() => null)
  if (!club) notFound()
  const squad = await api.football.squad(id).catch(() => null)

  const where = [club.league, club.country].filter((v) => v && v !== 'Unknown').join(' · ')
  return (
    <DeskPage eyebrow={where ? `CLUB · ${where.toUpperCase()}` : 'CLUB'} title={club.name} intro="Rumoured arrivals and departures, with the spend they would add up to if each went through at its current likelihood.">
      <div className="g-stack">
        <ClubDashboard club={club} />
        <ClubLinkedPlayers players={club.players} />
        {squad && <ClubSquad squad={squad} />}
      </div>
    </DeskPage>
  )
}
