'use client'

import { useEffect, useState } from 'react'
import type { ClubDetail } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { axisProps, tooltipStyle, chartHeight } from '@/lib/chartTheme'
import { Metric, PanelHeading } from '@/components/desk/DeskPage'
import { RumourRowsPanel } from '@/components/desk/RumourLedger'
import { formatMillions, toMillions } from '@/lib/format'

interface Props {
  club: ClubDetail
}

export default function ClubDashboard({ club }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Likelihood-weighted incoming fees by position, in millions (some feeds stored raw euros).
  const positionData = club.activeIn.reduce<Record<string, number>>((acc, r) => {
    const pos = r.player.position
    const fee = toMillions(r.reportedFeeMax ?? r.reportedFeeMin ?? 0)
    acc[pos] = (acc[pos] ?? 0) + fee * (r.computedLikelihood / 100)
    return acc
  }, {})

  const chartData = Object.entries(positionData)
    .map(([position, value]) => ({ position, value: Math.round(value * 10) / 10 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const spend = toMillions(club.totalExpectedSpend)

  return (
    <>
      <div className="g-metrics">
        <Metric
          label="INCOMING RUMOURS"
          value={
            <a href="#incoming-rumours" className="g-green-link" data-testid="incoming-rumours-jump">
              {club.activeIn.length}
            </a>
          }
        />
        <Metric
          label="OUTGOING RUMOURS"
          value={
            <a href="#outgoing-rumours" className="g-green-link" data-testid="outgoing-rumours-jump">
              {club.activeOut.length}
            </a>
          }
        />
        <Metric
          label="SQUAD SIZE"
          value={
            <a href="#linked-players-title" className="g-green-link" data-testid="squad-size-jump">
              {club.players.length}
            </a>
          }
          note="Players linked to this club"
        />
        <Metric label="EXPECTED SPEND" value={spend ? `€${formatMillions(spend)}` : '—'} tone={spend ? 'green' : undefined} note="Fees × current likelihood" />
      </div>

      {mounted && chartData.length > 0 && (
        <section className="g-panel" style={{ marginBottom: 24 }}>
          <PanelHeading title="Expected spend by position" right={<span className="g-count-label">€M</span>} />
          <div className="g-panel-body">
            <ResponsiveContainer width="100%" height={chartHeight.club}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="position" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} formatter={(v: number) => [`€${v}M`]} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="#9cdeb3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="g-stack">
        <RumourRowsPanel
          id="incoming-rumours"
          title="Incoming"
          rumours={club.activeIn}
          empty="No active incoming rumours."
        />
        <RumourRowsPanel
          id="outgoing-rumours"
          title="Outgoing"
          rumours={club.activeOut}
          empty="No active outgoing rumours."
        />
      </div>
    </>
  )
}
