'use client'

import { useState } from 'react'
import Link from 'next/link'
import UpgradePrompt from './UpgradePrompt'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  playerId: number
  initialWatched: boolean
  authenticated: boolean
}

export default function WatchlistButton({ playerId, initialWatched, authenticated }: Props) {
  const [watched, setWatched] = useState(initialWatched)
  const [pending, setPending] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:border-line-emphasis hover:text-ink-primary"
      >
        Log in to watch
      </Link>
    )
  }

  async function toggle(): Promise<void> {
    setPending(true)
    setError(null)
    try {
      if (watched) {
        const res = await fetch(`${BASE}/watchlist/${playerId}`, { method: 'DELETE', credentials: 'include' })
        if (!res.ok) throw new Error(`DELETE /watchlist ${res.status}`)
        setWatched(false)
        setLimitReached(false)
        return
      }

      const res = await fetch(`${BASE}/watchlist`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })

      if (res.status === 403) {
        // Free-tier watchlist cap (entitlements/watchlistLimit.ts) — server
        // is the source of truth, this UI just surfaces its answer. See
        // docs/monetisation-proposal.md — requirement 3: never rely only on
        // frontend gating.
        setLimitReached(true)
        return
      }
      if (!res.ok) throw new Error(`POST /watchlist ${res.status}`)

      setWatched(true)
      setLimitReached(false)
    } catch {
      // The button keeps showing the last state the server confirmed.
      setError(watched ? 'Couldn’t remove from your watchlist. Try again.' : 'Couldn’t add to your watchlist. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={toggle}
        disabled={pending}
        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          watched
            ? 'border-pitch-500 bg-pitch-500/10 text-pitch-500'
            : 'border-line text-ink-secondary hover:border-line-emphasis hover:text-ink-primary'
        }`}
      >
        {watched ? '★ Watching' : '☆ Watch'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-failed-fg">
          {error}
        </p>
      )}
      {limitReached && (
        <UpgradePrompt
          description="Free watchlists hold up to 5 players. Unlimited watchlists are part of Supporter/Pro."
          requiredTier="PRO"
          featureKey="UNLIMITED_WATCHLIST"
          compact
        />
      )}
    </div>
  )
}
