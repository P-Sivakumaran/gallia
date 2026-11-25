import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import DeskPage from '@/components/desk/DeskPage'
import { api, ApiError } from '@/lib/api'
import ForecastCard from '@/components/ForecastCard'
import WhyThisForecast from '@/components/WhyThisForecast'
import EvidenceTimeline from '@/components/EvidenceTimeline'
import ForecastHistoryChart from '@/components/ForecastHistoryChart'
import ProvenanceGraph from '@/components/ProvenanceGraph'
import type { ClaimDetail, ForecastDisplayData, ForecastHistoryPoint, EntitlementDenial } from '@/types'

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  const cookieStore = await cookies()
  const cookie = cookieStore.toString()
  const claim = await api.claims.get(id, cookie).catch(() => null)
  if (!claim) notFound()

  let forecast: ForecastDisplayData | null = null
  let forecastError: string | null = null
  try {
    forecast = await api.claims.forecast(id, cookie)
  } catch {
    forecastError = 'Could not reach the forecasting service.'
  }

  let history: ForecastHistoryPoint[] | null = null
  let historyError: string | null = null
  let historyEntitlementDenied: EntitlementDenial | null = null
  try {
    history = await api.claims.forecastHistory(id, cookie)
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      historyEntitlementDenied = err.body as EntitlementDenial
    } else {
      historyError = 'Could not load forecast history.'
    }
  }

  return (
    <DeskPage
      eyebrow={`CLAIM · C-${claim.id}`}
      title={claim.player?.name ?? `Claim #${claim.id}`}
      intro={claimIntro(claim)}
      actions={<span className="g-count-label">{claim.claimStatus}</span>}
    >
    <div className="g-claim-stack g-stack">

      <ForecastCard forecast={forecast} error={forecastError} />

      <WhyThisForecast claim={claim} />

      <ForecastHistoryChart
        history={history}
        claim={claim}
        error={historyError}
        entitlementDenied={historyEntitlementDenied}
      />

      <EvidenceTimeline claim={claim} />

      <ProvenanceGraph claim={claim} />
    </div>
    </DeskPage>
  )
}

function claimIntro(claim: ClaimDetail): string {
  const from = claim.fromClub ? claim.fromClub.name : null
  const to = claim.toClub ? claim.toClub.name : null
  const route = from && to ? `${from} to ${to}` : from ? `Leaving ${from}` : to ? `Joining ${to}` : 'Route not yet reported'
  return [route, claim.transferType.toLowerCase().replace(/_/g, ' '), claim.window?.toLowerCase()].filter(Boolean).join(' · ')
}
