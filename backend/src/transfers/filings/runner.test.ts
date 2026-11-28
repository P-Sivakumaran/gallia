import { describe, expect, it, vi } from 'vitest'
import { ingestFilingFact, runListedClubFilingsIngest } from './runner.js'
import type { ExtractedTransferFact, FilingAnnouncement } from './types.js'

vi.mock('./amfFrance.js', () => ({
  fetchAmfFacts: vi.fn(),
}))
vi.mock('./juventus.js', () => ({
  fetchJuventusAnnouncements: vi.fn(),
  parseJuventusAnnouncementText: vi.fn(),
}))

import { fetchAmfFacts } from './amfFrance.js'
import { fetchJuventusAnnouncements } from './juventus.js'

function baseFact(over: Partial<ExtractedTransferFact> = {}): ExtractedTransferFact {
  return {
    portal: 'lyon_eagle',
    sourceUrl: 'https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/09/SYNTHETIC.pdf',
    publishedAt: new Date('2026-09-02'),
    title: 'TRANSFER OF JEAN TESTARD TO SUNDERLAND',
    playerName: 'Jean Testard',
    counterpartyName: 'Sunderland',
    direction: 'disposal',
    transferType: 'permanent',
    isLoan: false,
    loanOptionOrObligation: 'none',
    feeAmount: 30_000_000,
    feeCurrency: 'EUR',
    feeStatus: 'disclosed',
    sellOnPercent: 12.5,
    effectiveDate: new Date('2026-09-02'),
    details: {},
    ...over,
  }
}

const announcementOf = (f: ExtractedTransferFact): FilingAnnouncement => ({ portal: f.portal, sourceUrl: f.sourceUrl, publishedAt: f.publishedAt, title: f.title })

function mockDb(players: { id: number; name: string }[]) {
  return {
    club: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        const w = JSON.stringify(where)
        if (w.includes('Olympique Lyonnais')) return Promise.resolve({ id: 10, name: 'Olympique Lyonnais' })
        if (w.includes('Sunderland')) return Promise.resolve({ id: 25, name: 'Sunderland AFC' })
        return Promise.resolve(null)
      }),
    },
    player: {
      findMany: vi.fn().mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
        let list = players
        const name = where?.name as { equals?: string; contains?: string } | undefined
        if (name?.equals) {
          const target = name.equals.toLowerCase()
          list = players.filter((p) => p.name.toLowerCase() === target)
        } else if (Array.isArray(where?.AND)) {
          const tokens = (where.AND as { name?: { contains?: string } }[])
            .map((c) => c.name?.contains)
            .filter((t): t is string => Boolean(t))
          list = players.filter((p) => tokens.every((t) => p.name.toLowerCase().includes(t.toLowerCase())))
        } else if (name?.contains) {
          const t = name.contains.toLowerCase()
          list = players.filter((p) => p.name.toLowerCase().includes(t))
        }
        return Promise.resolve(list)
      }),
    },
    transfer: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 101 }) },
    contractFact: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 201 }) },
    sourcedFact: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 555 }) },
  }
}

describe('ingestFilingFact', () => {
  it('records a sale from the issuer to the counterparty, with the channel licence', async () => {
    const db = mockDb([{ id: 99, name: 'Jean Testard' }])
    const f = baseFact()
    const res = await ingestFilingFact(db as never, f, announcementOf(f))
    expect(res.status).toBe('applied')
    expect(res.transferRecordStatus).toBe('created')
    expect(db.transfer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ playerId: 99, fromClubId: 10, toClubId: 25, feeAmount: 30_000_000, source: 'filing', confidence: 0.95 }) })
    )
    expect(db.sourcedFact.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ licence: 'etalab-2.0' }) }))
  })

  it('records an extension as a contract only, never as a transfer', async () => {
    const db = mockDb([{ id: 99, name: 'Tom Proto' }])
    const f = baseFact({ playerName: 'Tom Proto', direction: 'extension', transferType: 'unknown', counterpartyName: null, feeAmount: null, contractExpiresOn: new Date('2029-06-30') })
    const res = await ingestFilingFact(db as never, f, announcementOf(f))
    expect(res.status).toBe('applied')
    expect(db.transfer.create).not.toHaveBeenCalled()
    expect(res.contractRecordStatus).toBe('created')
    expect(db.contractFact.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ playerId: 99, clubId: 10 }) }))
  })

  it('sends a player who matches nobody to admin review', async () => {
    const db = mockDb([])
    const f = baseFact()
    const res = await ingestFilingFact(db as never, f, announcementOf(f))
    expect(res.status).toBe('unmatched_player')
    expect(res.unmatchedFactId).toBe(555)
    expect(db.transfer.create).not.toHaveBeenCalled()
    expect(db.sourcedFact.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entityType: 'UNMATCHED_TRANSFER', applied: false }) }))
  })

  it('sends an ambiguous name (two candidates) to admin review instead of guessing', async () => {
    const db = mockDb([{ id: 1, name: 'Jean Testard' }, { id: 2, name: 'Jean Testard' }])
    const f = baseFact()
    const res = await ingestFilingFact(db as never, f, announcementOf(f))
    expect(res.status).toBe('unmatched_player')
    expect(db.transfer.create).not.toHaveBeenCalled()
  })
})

describe('runListedClubFilingsIngest', () => {
  it('fetches AMF + Juventus and writes applied + unmatched counts', async () => {
    const f = baseFact()
    const unmatched = baseFact({
      portal: 'juventus',
      playerName: 'Nobody Nowhere',
      sourceUrl: 'https://www.juventus.com/x.pdf',
      title: 'Acquisition of the player Nobody Nowhere',
    })
    vi.mocked(fetchAmfFacts).mockResolvedValue({
      announcements: [announcementOf(f)],
      facts: [f],
      failures: [],
    })
    vi.mocked(fetchJuventusAnnouncements).mockResolvedValue({
      announcements: [announcementOf(unmatched)],
      facts: [unmatched],
      failures: [],
    })

    const db = mockDb([{ id: 99, name: 'Jean Testard' }])
    const summary = await runListedClubFilingsIngest(db as never)

    expect(fetchAmfFacts).toHaveBeenCalledWith('lyon_eagle', expect.any(Date))
    expect(fetchJuventusAnnouncements).toHaveBeenCalled()
    expect(summary.facts).toBe(2)
    expect(summary.applied).toBe(1)
    expect(summary.unmatched).toBe(1)
    expect(summary.byPortal.lyon_eagle.applied).toBe(1)
    expect(summary.byPortal.juventus.unmatched).toBe(1)
  })

  it('can skip portals', async () => {
    vi.mocked(fetchAmfFacts).mockClear()
    vi.mocked(fetchJuventusAnnouncements).mockClear()
    const db = mockDb([])
    await runListedClubFilingsIngest(db as never, { skipAmf: true, skipJuventus: true })
    expect(fetchAmfFacts).not.toHaveBeenCalled()
    expect(fetchJuventusAnnouncements).not.toHaveBeenCalled()
  })
})
