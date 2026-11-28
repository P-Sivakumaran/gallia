import { describe, expect, it } from 'vitest'
import { assertFetchAllowed, FetchNotAllowedError } from './http.js'
import { FILING_CHANNELS, getPortal, listPortals, portalAccess } from './portals.js'

describe('filing portals and channels', () => {
  it('covers every listed club surveyed', () => {
    const ids = listPortals().map((p) => p.id)
    for (const id of ['lyon_eagle', 'manchester_united', 'juventus', 'lazio', 'kap_turkey', 'benfica', 'fc_porto', 'sporting_cp', 'ajax', 'celtic', 'borussia_dortmund', 'copenhagen_parken']) {
      expect(ids).toContain(id)
    }
  })

  it('points every portal at a known channel, and every channel quotes its terms', () => {
    for (const p of listPortals()) {
      expect(FILING_CHANNELS[p.channelId], p.id).toBeDefined()
      for (const r of p.rejectedChannels) expect(FILING_CHANNELS[r], `${p.id} rejected ${r}`).toBeDefined()
    }
    for (const c of Object.values(FILING_CHANNELS)) {
      expect(c.termsQuotation.length, c.id).toBeGreaterThan(20)
      expect(c.hosts.length, c.id).toBeGreaterThan(0)
      if (c.access === 'CLEARED') expect(c.termsUrl, c.id).toBeTruthy()
    }
  })

  it('clears only the regulator channels whose terms allow automated reuse', () => {
    const cleared = Object.values(FILING_CHANNELS).filter((c) => c.access === 'CLEARED').map((c) => c.id).sort()
    expect(cleared).toEqual(['amf-info-financiere', 'sec-edgar'])
    expect(portalAccess('lyon_eagle')).toBe('CLEARED')
    expect(portalAccess('manchester_united')).toBe('CLEARED')
  })

  it('never fetches from club sites that ban bots', () => {
    expect(FILING_CHANNELS['juventus-site'].access).toBe('BLOCKED')
    expect(FILING_CHANNELS['lazio-site'].access).toBe('BLOCKED')
    expect(getPortal('juventus')?.rejectedChannels).toContain('juventus-site')
    expect(() => assertFetchAllowed('juventus-site', 'https://www.juventus.com/en/club/investor-relations/')).toThrow(FetchNotAllowedError)
    expect(() => assertFetchAllowed('kap', 'https://www.kap.org.tr/en/')).toThrow(FetchNotAllowedError)
    expect(() => assertFetchAllowed('cmvm-sdi', 'https://www.cmvm.pt/')).toThrow(FetchNotAllowedError)
  })

  it('refuses a host outside the cleared channel', () => {
    expect(() => assertFetchAllowed('amf-info-financiere', 'https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/x.pdf')).not.toThrow()
    expect(() => assertFetchAllowed('amf-info-financiere', 'https://www.juventus.com/x.pdf')).toThrow(FetchNotAllowedError)
  })
})
