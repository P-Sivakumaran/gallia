import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import RumourCard from '@/components/RumourCard'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  const player = await api.players.get(id).catch(() => null)
  if (!player) notFound()

  const contractEnd = player.contractEnd
    ? new Date(player.contractEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'Unknown'

  return (
    <div className="space-y-8">
      {/* Player header */}
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-line bg-surface-raised text-3xl font-bold text-ink-secondary">
          {player.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-black tracking-display">{player.name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-ink-secondary">
            <span>{player.position}</span>
            {player.nationality && <span>· {player.nationality}</span>}
            {player.age && <span>· Age {player.age}</span>}
            {player.currentClub && <span>· {player.currentClub.name}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {player.marketValue && (
              <div>
                <span className="text-ink-muted">Market value</span>
                <span className="ml-1.5 font-mono font-semibold text-ink-primary">€{player.marketValue}M</span>
              </div>
            )}
            <div>
              <span className="text-ink-muted">Contract until</span>
              <span className="ml-1.5 font-mono font-semibold text-ink-primary">{contractEnd}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rumours */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Transfer rumours ({player.rumours.length})
        </h2>
        <div className="space-y-3">
          {player.rumours.map((r) => (
            <RumourCard key={r.id} rumour={r} />
          ))}
          {player.rumours.length === 0 && (
            <p className="text-sm italic text-ink-muted">No rumours for this player.</p>
          )}
        </div>
      </section>
    </div>
  )
}
