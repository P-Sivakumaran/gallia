import { describe, it, expect } from 'vitest'
import { RSS_FEEDS } from '../ingestion/sources/rss.js'
import { SOURCE_LICENCES, licenceWarning } from './licences.js'

describe('source licence registry', () => {
  it('has an entry for every RSS feed, so no feed is added without its terms being read', () => {
    const missing = RSS_FEEDS.map((f) => f.name).filter((n) => !SOURCE_LICENCES[n])
    expect(missing).toEqual([])
  })

  it('classifies Google News as personal use only', () => {
    expect(SOURCE_LICENCES['Google News Transfers'].status).toBe('PERSONAL_ONLY')
  })

  it('warns for uncleared or unknown sources and stays quiet for cleared ones', () => {
    for (const [name, l] of Object.entries(SOURCE_LICENCES)) if (l.status === 'CLEARED') expect(licenceWarning(name)).toBeNull()
    expect(licenceWarning('ESPN Soccer')).toMatch(/NEEDS_LICENCE/)
    expect(licenceWarning('BBC Sport')).toMatch(/NEEDS_LICENCE/)
    expect(licenceWarning('Some New Feed')).toMatch(/no licence entry/)
  })
})
