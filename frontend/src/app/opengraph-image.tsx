import { ImageResponse } from 'next/og'
import { BRAND } from '@/lib/brand'
import { pitch, ink, status, surface, line } from '@/lib/tokens'

export const alt = `${BRAND.name} — ${BRAND.tagline}`
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: surface.base,
          backgroundImage:
            'radial-gradient(circle at 75% 25%, rgba(34, 197, 94, 0.18) 0%, transparent 60%), radial-gradient(circle at 15% 85%, rgba(5, 46, 22, 0.5) 0%, transparent 55%)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          color: ink.primary,
        }}
      >
        {/* Top bar: Wordmark & Tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: pitch[500],
              }}
            />
            <div style={{ display: 'flex', fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: ink.primary }}>
              GALLIA
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: pitch[500],
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: pitch[500],
              }}
            />
            <div style={{ display: 'flex' }}>Live Transfer Intelligence</div>
          </div>
        </div>

        {/* Center: Main Statement & Visual Meter Graphic */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '48px', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '680px' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                fontSize: '60px',
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.035em',
                color: ink.primary,
              }}
            >
              Every transfer rumour, <span style={{ color: pitch[500], marginLeft: '12px' }}>scored 0–100.</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '22px',
                lineHeight: 1.4,
                color: ink.secondary,
              }}
            >
              Calibrated machine forecasts, multi-source provenance, and an open scorecard of past hits and misses.
            </div>
          </div>

          {/* Right Card: Sample Truth Meter Visual */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: `1px solid ${line.DEFAULT}`,
              borderRadius: '24px',
              padding: '32px 40px',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', fontSize: '13px', fontWeight: 800, color: status.hot.DEFAULT, letterSpacing: '0.12em' }}>
              HIGH LIKELIHOOD
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '76px', fontWeight: 900, color: ink.primary, letterSpacing: '-0.04em' }}>
              84<span style={{ fontSize: '32px', color: ink.muted }}>%</span>
            </div>
            <div
              style={{
                display: 'flex',
                padding: '4px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                color: status.hot.fg,
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              HOT
            </div>
          </div>
        </div>

        {/* Bottom bar: Trust signals */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(51, 65, 85, 0.5)',
            paddingTop: '24px',
            fontSize: '15px',
            color: ink.muted,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ display: 'flex' }}>• Independent Source Corroboration</div>
            <div style={{ display: 'flex' }}>• Brier-Score Model Calibration</div>
            <div style={{ display: 'flex' }}>• Zero Paywalled Denials</div>
          </div>
          <div style={{ display: 'flex', fontWeight: 700, color: ink.secondary }}>gallia.app</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
