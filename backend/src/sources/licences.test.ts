import { describe, it, expect } from 'vitest'
import { RSS_FEEDS } from '../ingestion/sources/rss.js'
import { SOURCE_LICENCES, licenceWarning } from './licences.js'

describe('source licence registry', () => {
  it('has an entry for every RSS feed', () => {
    const missing = RSS_FEEDS.map((f) => f.name).filter((n) => !SOURCE_LICENCES[n])
    expect(missing).toEqual([])
  })

  it('clears Google News and publisher feeds for model-first ingest', () => {
    expect(SOURCE_LICENCES['Google News Transfers'].status).toBe('CLEARED')
    expect(SOURCE_LICENCES['BBC Sport'].status).toBe('CLEARED')
    expect(SOURCE_LICENCES['ESPN Soccer'].status).toBe('CLEARED')
  })

  it('stays quiet for cleared sources, warns only for blocked or missing', () => {
    expect(licenceWarning('Google News Transfers')).toBeNull()
    expect(licenceWarning('BBC Sport')).toBeNull()
    expect(licenceWarning('Sportmonks Aggregator')).toMatch(/BLOCKED/)
    expect(licenceWarning('Some New Feed')).toMatch(/no registry entry/)
  })
})
