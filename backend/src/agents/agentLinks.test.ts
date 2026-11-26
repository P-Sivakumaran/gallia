import { describe, it, expect } from 'vitest'
import { canonicalCitationUrl, citationUrlProblem, normaliseAgentName } from './agentLinks.js'

describe('citationUrlProblem', () => {
  it('accepts a publisher article', () => {
    expect(citationUrlProblem('https://football-italia.net/lazio-walk-away-from-dieng-transfer/')).toBeNull()
  })

  it('rejects redirectors, including Google News links', () => {
    expect(citationUrlProblem('https://news.google.com/rss/articles/CBMimgFBVV95cUxQ')).toMatch(/publisher/)
    expect(citationUrlProblem('https://t.co/abc')).toMatch(/redirects/)
  })

  it('rejects non-URLs, other schemes and credentials', () => {
    expect(citationUrlProblem('not a url')).toBe('not a URL')
    expect(citationUrlProblem('javascript:alert(1)')).toMatch(/http/)
    expect(citationUrlProblem('https://user:pw@example.com/a')).toMatch(/credentials/)
  })
})

describe('normaliseAgentName', () => {
  it('trims and collapses whitespace, keeping case', () => {
    expect(normaliseAgentName('  Jorge   Mendes ')).toBe('Jorge Mendes')
  })
})

describe('canonicalCitationUrl', () => {
  it('drops tracking parameters and the fragment, keeps real ones', () => {
    expect(canonicalCitationUrl('https://x.com/a?id=4&utm_source=tw&fbclid=1#top')).toBe('https://x.com/a?id=4')
  })
})
