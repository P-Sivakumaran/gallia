import { api } from '@/lib/api'
import DeskPage from '@/components/desk/DeskPage'
import PlayerCompareView, { PlayerComparePlayerData } from '@/components/desk/PlayerCompareView'

export const dynamic = 'force-dynamic'

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { a, b } = await searchParams
  const idA = a ? parseInt(a, 10) : NaN
  const idB = b ? parseInt(b, 10) : NaN

  const [resA, resB] = await Promise.all([
    !isNaN(idA)
      ? Promise.all([
          api.players.get(idA).catch(() => null),
          api.football.player(idA).catch(() => null),
        ])
      : Promise.resolve([null, null]),
    !isNaN(idB)
      ? Promise.all([
          api.players.get(idB).catch(() => null),
          api.football.player(idB).catch(() => null),
        ])
      : Promise.resolve([null, null]),
  ])

  const initialPlayerA: PlayerComparePlayerData | null = resA[0]
    ? { player: resA[0], footballData: resA[1] }
    : null
  const initialPlayerB: PlayerComparePlayerData | null = resB[0]
    ? { player: resB[0], footballData: resB[1] }
    : null

  return (
    <DeskPage
      eyebrow="COMPARE"
      title="Player comparison"
      intro="Side-by-side Gallia ratings, mirrored attribute profiles, and per-90 metrics across tracked competitions."
    >
      <PlayerCompareView initialPlayerA={initialPlayerA} initialPlayerB={initialPlayerB} />
    </DeskPage>
  )
}
