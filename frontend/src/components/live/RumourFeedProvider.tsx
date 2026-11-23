'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Rumour, RumourStatus } from '@/types'
import { useRumourFeed, type FeedState } from '@/lib/useRumourFeed'

/** One SSE connection for the whole page, so the hero, ticker and feed always agree. */
const FeedContext = createContext<FeedState | null>(null)

export function RumourFeedProvider({ initialRumours, children }: { initialRumours: Rumour[]; children: ReactNode }) {
  const state = useRumourFeed(initialRumours)
  return <FeedContext.Provider value={state}>{children}</FeedContext.Provider>
}

export function useFeed(): FeedState {
  const state = useContext(FeedContext)
  if (!state) throw new Error('useFeed() needs a <RumourFeedProvider> above it')
  return state
}

/**
 * Rumour of the Day: the most likely HOT rumour on the current page, else the most likely PENDING one.
 * Settled rumours (COMPLETED / FAILED / DENIED) are never featured; with none open there is no feature.
 */
export function pickFeatured(rumours: Rumour[]): Rumour | null {
  const by = (s: RumourStatus) =>
    rumours.filter((r) => r.status === s).sort((a, b) => b.computedLikelihood - a.computedLikelihood)[0]
  return by('HOT') ?? by('PENDING') ?? null
}

/** One verdict per status, as on the raea meter-states card. */
export const VERDICT: Record<RumourStatus, string> = {
  HOT: 'Heating up',
  PENDING: 'Early talks',
  COMPLETED: 'Signed',
  FAILED: 'Deal off',
  DENIED: 'Denied',
}
