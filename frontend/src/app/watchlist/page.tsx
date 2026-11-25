import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeskPage from '@/components/desk/DeskPage'
import { RumourRowsPanel } from '@/components/desk/RumourLedger'
import type { PaginatedResponse, Rumour } from '@/types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function WatchlistPage() {
  const cookieStore = await cookies()
  if (!cookieStore.get('token')) redirect('/login')

  const res = await fetch(`${BASE}/rumours?watchlist=true&limit=50`, {
    headers: { Cookie: cookieStore.toString() },
    cache: 'no-store',
  })
  if (res.status === 401) redirect('/login')
  if (!res.ok) throw new Error(`API ${res.status}: /rumours?watchlist=true`)

  const { data: rumours, total } = (await res.json()) as PaginatedResponse<Rumour>

  return (
    <DeskPage eyebrow="ACCOUNT" title="Watchlist" intro={`Rumours about the players you follow. ${total} in total.`}>
      {rumours.length === 0 ? (
        <section className="g-panel">
          <div className="g-panel-body">
            <p>No rumours for watched players yet.</p>
            <p><Link href="/rumours" className="g-green-link" style={{ display: 'inline-flex' }}>Browse rumours →</Link></p>
          </div>
        </section>
      ) : (
        <RumourRowsPanel title="Watched players" rumours={rumours} empty="No rumours for watched players yet." />
      )}
    </DeskPage>
  )
}
