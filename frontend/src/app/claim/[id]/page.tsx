import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
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
    <div className="mx-auto max-w-3xl space-y-8">
      <ClaimHeader claim={claim} />

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
  )
}

function ClaimHeader({ claim }: { claim: ClaimDetail }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-black tracking-display text-ink-primary">
          {claim.player ? (
            <Link href={`/player/${claim.player.id}`} className="hover:text-pitch-500">
              {claim.player.name}
            </Link>
          ) : (
            `Claim #${claim.id}`
          )}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-ink-secondary">
          {claim.fromClub && <span>{claim.fromClub.shortName ?? claim.fromClub.name}</span>}
          {claim.fromClub && claim.toClub && <span aria-hidden>→</span>}
          {claim.toClub && <span>{claim.toClub.shortName ?? claim.toClub.name}</span>}
          <span className="text-ink-faint">·</span>
          <span>{claim.transferType}</span>
          {claim.window && (
            <>
              <span className="text-ink-faint">·</span>
              <span>{claim.window}</span>
            </>
          )}
        </div>
      </div>
      <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
        {claim.claimStatus}
      </span>
    </div>
  )
}
