import type { Metadata } from 'next'
import ScorecardView from '@/components/ScorecardView'
import { api } from '@/lib/api'
import { BRAND } from '@/lib/brand'
import type { ModelHealthResponse } from '@/types'

export const metadata: Metadata = {
  title: `Scorecard — ${BRAND.name}`,
  description: 'How accurate our transfer forecasts have been, checked against real outcomes.',
}

export const dynamic = 'force-dynamic'

export default async function ScorecardPage() {
  let health: ModelHealthResponse | null = null
  let error: string | null = null
  try {
    health = await api.forecast.modelHealth()
  } catch (e) {
    error = e instanceof Error ? e.message : 'unknown error'
  }
  return <ScorecardView health={health} error={error} />
}
