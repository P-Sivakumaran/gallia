import { ImageResponse } from 'next/og'
import { BRAND } from '@/lib/brand'

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
          backgroundColor: '#020617',
          backgroundImage:
            'radial-gradient(circle at 75% 25%, rgba(34, 197, 94, 0.18) 0%, transparent 60%), radial-gradient(circle at 15% 85%, rgba(5, 46, 22, 0.5) 0%, transparent 55%)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Top bar: Wordmark & Tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ display: 'flex', fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: '#ffffff' }}>
              SMOKE &amp;
            </div>
            <div style={{ display: 'flex', fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: '#22c55e' }}>
              FIRE
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
              color: '#22c55e',
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
                backgroundColor: '#22c55e',
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
                color: '#ffffff',
              }}
            >
              Every transfer rumour, <span style={{ color: '#22c55e', marginLeft: '12px' }}>scored 0–100.</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '22px',
                lineHeight: 1.4,
                color: '#94a3b8',
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
              border: '1px solid rgba(51, 65, 85, 0.8)',
              borderRadius: '24px',
              padding: '32px 40px',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', fontSize: '13px', fontWeight: 800, color: '#f97316', letterSpacing: '0.12em' }}>
              HIGH LIKELIHOOD
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '76px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em' }}>
              84<span style={{ fontSize: '32px', color: '#64748b' }}>%</span>
            </div>
            <div
              style={{
                display: 'flex',
                padding: '4px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                color: '#fb923c',
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
            color: '#64748b',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ display: 'flex' }}>• Independent Source Corroboration</div>
            <div style={{ display: 'flex' }}>• Brier-Score Model Calibration</div>
            <div style={{ display: 'flex' }}>• Zero Paywalled Denials</div>
          </div>
          <div style={{ display: 'flex', fontWeight: 700, color: '#94a3b8' }}>smokeandfire.app</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
