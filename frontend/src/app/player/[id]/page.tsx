import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import DeskPage, { Metric } from '@/components/desk/DeskPage'
import { RumourRowsPanel } from '@/components/desk/RumourLedger'
import PlayerAgents from '@/components/desk/PlayerAgents'
import PlayerCard from '@/components/desk/PlayerCard'
import SeasonStatsTable from '@/components/desk/SeasonStatsTable'
import { formatMillions, toMillions } from '@/lib/format'
import { splitRumoursByOpenness } from '@/lib/rumourStatus'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  const player = await api.players.get(id).catch(() => null)
  if (!player) notFound()

  const [agents, footballData] = await Promise.all([
    api.players.agents(id).catch(() => []),
    api.football.player(id).catch(() => null),
  ])

  const contractEnd = player.contractEnd
    ? new Date(player.contractEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'Unknown'
  const facts = [player.position, player.nationality, player.age ? `age ${player.age}` : null].filter(Boolean).join(' · ')
  const { open: openRumours, resolved: resolvedRumours } = splitRumoursByOpenness(player.rumours)
  const open = openRumours.length

  const seasons = footballData?.seasons ?? []
  const currentSeason = seasons.find((s) => s.current) ?? seasons[0] ?? null
  const card = currentSeason?.card ?? null
  const competitionName = currentSeason?.competition?.name ?? null
  const competitionId = currentSeason?.competition?.id ?? null

  return (
    <DeskPage
      eyebrow="PLAYER"
      title={player.name}
      intro={
        <>
          {facts}
          {player.currentClub && (
            <>
              {' · now at '}
              <Link href={`/club/${player.currentClub.id}`} className="g-green-link" style={{ display: 'inline' }}>
                {player.currentClub.name}
              </Link>
            </>
          )}
          {' · '}
          <Link href={`/compare?a=${id}`} className="g-green-link" style={{ display: 'inline' }}>
            Compare player →
          </Link>
        </>
      }
    >
      <div className="g-metrics">
        <Metric
          label="CURRENT CLUB"
          value={
            player.currentClub ? (
              <Link href={`/club/${player.currentClub.id}`} className="g-green-link" style={{ fontSize: 20 }}>
                {player.currentClub.name}
              </Link>
            ) : (
              <span style={{ fontSize: 20 }}>Unknown</span>
            )
          }
          note="From the nightly club sync"
        />
        <Metric
          label="MARKET VALUE"
          value={player.marketValue ? `€${formatMillions(toMillions(player.marketValue))}` : '—'}
          note={player.marketValue ? 'Reported estimate' : 'No estimate stored'}
        />
        <Metric label="CONTRACT UNTIL" value={<span style={{ fontSize: 20 }}>{contractEnd}</span>} />
        <Metric
          label="OPEN RUMOURS"
          value={
            <a href="#open-rumours" className="g-green-link" data-testid="open-rumours-jump">
              {open}
            </a>
          }
          tone={open ? 'amber' : undefined}
          note={`${player.rumours.length} in total`}
        />
      </div>

      <div className="g-stack">
        <PlayerCard
          card={card}
          position={player.position}
          competitionName={competitionName}
          competitionId={competitionId}
          playerName={player.name}
        />
        <SeasonStatsTable seasons={seasons} />
        <PlayerAgents playerId={id} initialLinks={agents} />
        <RumourRowsPanel
          id="open-rumours"
          title="Open rumours"
          rumours={openRumours}
          empty="No open rumours for this player."
          emptyHref="/rumours"
          emptyCta="Browse rumours →"
        />
        <RumourRowsPanel
          title="Resolved rumours"
          rumours={resolvedRumours}
          empty="No resolved rumours for this player."
        />
      </div>
    </DeskPage>
  )
}
