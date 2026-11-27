import { describe, it, expect, vi } from 'vitest'
import { isActive } from './SiteNav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

describe('SiteNav isActive', () => {
  it('marks Desk on home and watchlist', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/watchlist', '/')).toBe(true)
    expect(isActive('/rumours', '/')).toBe(false)
  })
  it('keeps Rumours active on a single rumour page', () => {
    expect(isActive('/rumour/12', '/rumours')).toBe(true)
    expect(isActive('/scorecard', '/rumours')).toBe(false)
  })
  it('marks Leagues active on hub, table, and football desk pages', () => {
    expect(isActive('/leagues', '/leagues')).toBe(true)
    expect(isActive('/leagues/3', '/leagues')).toBe(true)
    expect(isActive('/club/1', '/leagues')).toBe(true)
    expect(isActive('/match/9', '/leagues')).toBe(true)
    expect(isActive('/player/4', '/leagues')).toBe(true)
    expect(isActive('/compare?a=1', '/leagues')).toBe(true)
    expect(isActive('/network', '/leagues')).toBe(false)
  })
})
