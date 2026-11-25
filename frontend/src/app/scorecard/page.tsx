import type { Metadata } from 'next'
import ScorecardView from '@/components/ScorecardView'
import { api } from '@/lib/api'
import { BRAND } from '@/lib/brand'
import { loadGalliaWorkspace } from '@/lib/gallia-data'
import type { ModelHealthResponse } from '@/types'

export const metadata: Metadata = {
  title: `Scorecard — ${BRAND.name}`,
  description: 'How accurate our transfer forecasts have been, checked against real outcomes.',
}

export const dynamic = 'force-dynamic'

export default async function ScorecardPage() {
  let health: ModelHealthResponse | null = null
  let error: string | null = null
  const [healthResult, workspace] = await Promise.all([
    api.forecast.modelHealth().then((h) => ({ h }), (e: unknown) => ({ e })),
    loadGalliaWorkspace().catch(() => null),
  ])
  if ('h' in healthResult) health = healthResult.h
  else error = healthResult.e instanceof Error ? healthResult.e.message : 'unknown error'
  // Only the connected desk's ledger is real; the illustrative fallback is never scored here.
  const ledger = workspace?.mode === 'connected' ? workspace.ledger ?? null : null
  return <ScorecardView health={health} error={error} ledger={ledger} />
}
