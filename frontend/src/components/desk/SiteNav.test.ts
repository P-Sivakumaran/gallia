import { describe, it, expect, vi } from 'vitest'
import { isActive } from './SiteNav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

describe('SiteNav isActive', () => {
  it('marks only the desk on the home page', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/rumours', '/')).toBe(false)
  })
  it('keeps Rumours active on a single rumour page', () => {
    expect(isActive('/rumour/12', '/rumours')).toBe(true)
    expect(isActive('/scorecard', '/rumours')).toBe(false)
  })
})
