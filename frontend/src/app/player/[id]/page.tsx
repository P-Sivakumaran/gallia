import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import DeskPage, { Metric } from '@/components/desk/DeskPage'
import { RumourRowsPanel } from '@/components/desk/RumourLedger'
import PlayerAgents from '@/components/desk/PlayerAgents'
import { formatMillions, toMillions } from '@/lib/format'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  const player = await api.players.get(id).catch(() => null)
  if (!player) notFound()
  const agents = await api.players.agents(id).catch(() => [])

  const contractEnd = player.contractEnd
    ? new Date(player.contractEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'Unknown'
  const facts = [player.position, player.nationality, player.age ? `age ${player.age}` : null].filter(Boolean).join(' · ')
  const open = player.rumours.filter((r) => r.status === 'HOT' || r.status === 'PENDING').length

  return (
    <DeskPage
      eyebrow="PLAYER"
      title={player.name}
      intro={<>{facts}{player.currentClub && <> · now at <Link href={`/club/${player.currentClub.id}`} className="g-green-link" style={{ display: 'inline' }}>{player.currentClub.name}</Link></>}</>}
    >
      <div className="g-metrics">
        <Metric label="CURRENT CLUB" value={<span style={{ fontSize: 20 }}>{player.currentClub?.name ?? 'Unknown'}</span>} note="From the nightly club sync" />
        <Metric label="MARKET VALUE" value={player.marketValue ? `€${formatMillions(toMillions(player.marketValue))}` : '—'} note={player.marketValue ? 'Reported estimate' : 'No estimate stored'} />
        <Metric label="CONTRACT UNTIL" value={<span style={{ fontSize: 20 }}>{contractEnd}</span>} />
        <Metric label="OPEN RUMOURS" value={open} tone={open ? 'amber' : undefined} note={`${player.rumours.length} in total`} />
      </div>
      <div className="g-stack">
        <PlayerAgents playerId={id} initialLinks={agents} />
        <RumourRowsPanel title="Transfer rumours" rumours={player.rumours} empty="No rumours for this player." />
      </div>
    </DeskPage>
  )
}
