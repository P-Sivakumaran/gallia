'use client'

import { useEffect, useReducer } from 'react'
import type { Rumour, RumourStatus } from '@/types'

export interface RumourUpdate {
  id: number
  computedLikelihood: number
  status: RumourStatus
}

/**
 * What the last live update did to one rumour, for the motion borrowed from the raea hero loop:
 * `seq` restarts the CSS animations, `delta` drives the ▲/▼ chip, `statusChanged` the badge pop and meter ring.
 */
export interface LiveChange {
  seq: number
  delta: number
  statusChanged: boolean
}

export interface FeedState {
  rumours: Rumour[]
  live: Record<number, LiveChange>
  /** The most recent update across the feed, for the LIVE ticker (`seq` counts all updates) */
  latest: { id: number; seq: number } | null
}

type Action =
  | { type: 'INIT'; rumours: Rumour[] }
  | { type: 'UPDATE'; payload: RumourUpdate }

export function feedReducer(state: FeedState, action: Action): FeedState {
  switch (action.type) {
    case 'INIT':
      return { rumours: action.rumours, live: {}, latest: null }
    case 'UPDATE': {
      const { id, computedLikelihood, status } = action.payload
      const current = state.rumours.find((r) => r.id === id)
      if (!current) return state
      const delta = Math.round(computedLikelihood) - Math.round(current.computedLikelihood)
      const statusChanged = status !== current.status
      if (delta === 0 && !statusChanged) return state
      return {
        rumours: state.rumours.map((r) => (r.id === id ? { ...r, computedLikelihood, status } : r)),
        live: { ...state.live, [id]: { seq: (state.live[id]?.seq ?? 0) + 1, delta, statusChanged } },
        latest: { id, seq: (state.latest?.seq ?? 0) + 1 },
      }
    }
    default:
      return state
  }
}

export function useRumourFeed(initialRumours: Rumour[]): FeedState {
  const [state, dispatch] = useReducer(feedReducer, { rumours: initialRumours, live: {}, latest: null })

  useEffect(() => {
    dispatch({ type: 'INIT', rumours: initialRumours })
  }, [initialRumours])

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SSE_URL ?? 'http://localhost:3001/events'
    const es = new EventSource(url)

    es.addEventListener('rumour:updated', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as RumourUpdate
        dispatch({ type: 'UPDATE', payload })
      } catch {}
    })

    es.onerror = () => console.warn('[SSE] Connection lost — auto-reconnecting')

    return () => es.close()
  }, [])

  return state
}
