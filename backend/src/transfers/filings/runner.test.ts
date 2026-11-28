import { describe, expect, it, vi } from 'vitest'
import { ingestFilingFact } from './runner.js'
import type { ExtractedTransferFact, FilingAnnouncement } from './types.js'

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
    player: { findMany: vi.fn().mockResolvedValue(players) },
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
