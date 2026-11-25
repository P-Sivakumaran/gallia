import { describe, it, expect, vi } from 'vitest'

vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(), RumourStatus: {} }))
import { publicNotes } from './rumoursService.js'

describe('publicNotes', () => {
  it('strips owner review tags and keeps the headline', () => {
    expect(publicNotes('VOID: duplicate of #146 (2026-11-25). [clubs corrected 2026-11-25, was A -> B] Newcastle reject bid')).toBe('Newcastle reject bid')
    expect(publicNotes('[reopened 2026-11-25: COMPLETED wrong] Arsenal turn to Brighton midfielder')).toBe('Arsenal turn to Brighton midfielder')
  })
  it('leaves an untagged headline alone', () => {
    expect(publicNotes('Romero seals transfer to Atlético')).toBe('Romero seals transfer to Atlético')
    expect(publicNotes(null)).toBeNull()
  })
  it('returns null when only tags were stored', () => {
    expect(publicNotes('[reviewed 2026-11-25]')).toBeNull()
  })
})
