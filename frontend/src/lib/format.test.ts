import { describe, it, expect } from 'vitest'
import { feeLabel } from './format'

describe('feeLabel', () => {
  it('formats fees stored in millions', () => {
    expect(feeLabel(95, 115, 'EUR')).toBe('€95–115M')
    expect(feeLabel(2.5, null, 'GBP')).toBe('£2.5M')
  })
  it('reads raw currency units as euros, not millions', () => {
    expect(feeLabel(45000, 55000.00000000001, 'EUR')).toBe('€45–55K')
    expect(feeLabel(5400000, 6600000.000000001, 'EUR')).toBe('€5.4–6.6M')
  })
  it('collapses an equal range and handles undisclosed', () => {
    expect(feeLabel(30, 30, 'EUR')).toBe('€30M')
    expect(feeLabel(null, null, 'EUR')).toBe('Undisclosed')
  })
})
