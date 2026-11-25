import { describe, it, expect } from 'vitest'
import { classifyFailed } from './auditWindowFailures.js'

const row = (terminalAt: string) => ({
  id: 1,
  status: 'FAILED' as const,
  window: 'SUMMER',
  rumourDate: new Date('2026-08-01T00:00:00Z'), // cutoff 2026-09-02, grace end 2026-09-04
  sourceId: 1,
  history: [
    { computedLikelihood: 60, status: 'PENDING' as const, recordedAt: new Date('2026-08-10T00:00:00Z') },
    { computedLikelihood: 0, status: 'FAILED' as const, recordedAt: new Date(terminalAt) },
  ],
})

describe('classifyFailed', () => {
  it('flags a FAILED written after the grace end with no failure wording', () => {
    expect(classifyFailed(row('2026-09-10T00:00:00Z'), false)).toBe('window-close-unconfirmed')
  })
  it('leaves rows with failure wording alone', () => {
    expect(classifyFailed(row('2026-09-10T00:00:00Z'), true)).toBe('failure-wording')
  })
  it('leaves rows resolved before the deadline alone', () => {
    expect(classifyFailed(row('2026-08-20T00:00:00Z'), false)).toBe('before-deadline')
  })
})
