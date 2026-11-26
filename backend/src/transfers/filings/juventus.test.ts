import { describe, expect, it, vi } from 'vitest'
import zlib from 'zlib'
import { parseDateString, parseJuventusAnnouncementText } from './juventus.js'
import { extractTextFromPdfBuffer } from './pdfExtractor.js'
import { listPortals, getPortal } from './portals.js'
import { ingestFilingFact } from './runner.js'
import type { ExtractedTransferFact, FilingAnnouncement } from './types.js'

describe('parseDateString', () => {
  it('parses standard announcement date strings', () => {
    const d = parseDateString('15 June 2026')
    expect(d).not.toBeNull()
    expect(d?.toISOString().slice(0, 10)).toBe('2026-06-15')

    const d2 = parseDateString('30 June 2029')
    expect(d2?.toISOString().slice(0, 10)).toBe('2029-06-30')

    const d3 = parseDateString('2 February 2026')
    expect(d3?.toISOString().slice(0, 10)).toBe('2026-02-02')
  })
})

describe('parseJuventusAnnouncementText - Synthetic Fixtures', () => {
  it('extracts definitive acquisition with instalments, add-ons and contract end', () => {
    const syntheticText = `
      AGREEMENT WITH SPORTING CP FOR THE DEFINITIVE ACQUISITION OF THE PLAYER VANCE
      Turin, 18 July 2026 - Juventus Football Club S.p.A. announces that an agreement with Sporting CP
      has been reached for the definitive acquisition of the registration rights of the player Marcus Vance
      for a consideration of € 24.5 million, payable in three financial years.
      Ancillary costs up to € 2.0 million may be paid upon achievement of specific sports objectives.
      Juventus and the player have signed a contract of employment until 30 June 2031.
    `
    const fact = parseJuventusAnnouncementText(
      syntheticText,
      'Agreement with Sporting CP for the definitive acquisition of the player Vance',
      new Date('2026-07-18'),
      'https://synthetic.juventus.com/announcements/vance.pdf'
    )

    expect(fact).not.toBeNull()
    expect(fact?.playerName).toBe('Marcus Vance')
    expect(fact?.counterpartyName).toBe('Sporting CP')
    expect(fact?.direction).toBe('acquisition')
    expect(fact?.transferType).toBe('permanent')
    expect(fact?.isLoan).toBe(false)
    expect(fact?.feeAmount).toBe(24_500_000)
    expect(fact?.feeCurrency).toBe('EUR')
    expect(fact?.feeStatus).toBe('disclosed')
    expect(fact?.instalmentYears).toBe(3)
    expect(fact?.addOnsAmount).toBe(2_000_000)
    expect(fact?.contractExpiresOn?.toISOString().slice(0, 10)).toBe('2031-06-30')
    expect(fact?.effectiveDate?.toISOString().slice(0, 10)).toBe('2026-07-18')
  })

  it('extracts loan with option to buy and free loan basis', () => {
    const syntheticText = `
      AGREEMENT WITH MALMO FF FOR THE ACQUISITION OF THE PLAYER LINDQVIST
      Turin, 10 January 2026 - Juventus Football Club S.p.A. announces that an agreement with Malmo FF
      has been reached for the temporary acquisition, on a free loan basis, until 30 June 2026,
      of the registration rights of the player Jonas Lindqvist.
      The agreement further entails the right for Juventus to definitively acquire the player's registration rights.
      The agreed consideration for the potential definitive acquisition is € 8.0 million, payable in two financial years;
      this consideration may be increased up to a maximum of € 1.5 million.
    `
    const fact = parseJuventusAnnouncementText(
      syntheticText,
      'Agreement with Malmo FF for the acquisition of the player Lindqvist',
      new Date('2026-01-10'),
      'https://synthetic.juventus.com/announcements/lindqvist.pdf'
    )

    expect(fact).not.toBeNull()
    expect(fact?.playerName).toBe('Jonas Lindqvist')
    expect(fact?.counterpartyName).toBe('Malmo FF')
    expect(fact?.direction).toBe('acquisition')
    expect(fact?.transferType).toBe('loan')
    expect(fact?.isLoan).toBe(true)
    expect(fact?.loanOptionOrObligation).toBe('option')
    expect(fact?.feeAmount).toBe(0) // free loan
    expect(fact?.feeStatus).toBe('free')
    expect(fact?.contractExpiresOn?.toISOString().slice(0, 10)).toBe('2026-06-30')
  })

  it('extracts definitive disposal with capital gain and instalments', () => {
    const syntheticText = `
      AGREEMENT WITH WEST HAM UNITED FOR THE DEFINITIVE DISPOSAL OF THE PLAYER ROSSI
      Turin, 25 August 2026 - Juventus Football Club S.p.A. announces that an agreement with West Ham United
      has been finalized for the definitive disposal of the registration rights of the player Federico Rossi
      for a consideration of € 32.0 million payable in four financial years.
      This transaction generates a positive economic effect (capital gain) of € 18.4 million.
    `
    const fact = parseJuventusAnnouncementText(
      syntheticText,
      'Agreement with West Ham United for the definitive disposal of the player Rossi',
      new Date('2026-08-25'),
      'https://synthetic.juventus.com/announcements/rossi.pdf'
    )

    expect(fact).not.toBeNull()
    expect(fact?.playerName).toBe('Federico Rossi')
    expect(fact?.counterpartyName).toBe('West Ham United')
    expect(fact?.direction).toBe('disposal')
    expect(fact?.transferType).toBe('permanent')
    expect(fact?.feeAmount).toBe(32_000_000)
    expect(fact?.feeStatus).toBe('disclosed')
    expect(fact?.instalmentYears).toBe(4)
    expect(fact?.capitalGainAmount).toBe(18_400_000)
  })

  it('extracts mutual termination', () => {
    const syntheticText = `
      MUTUAL TERMINATION WITH THE PLAYER SILVA
      Turin, 12 August 2026 - Juventus Football Club S.p.A. announces the mutual termination of the contract of employment with the player Gabriel Silva.
    `
    const fact = parseJuventusAnnouncementText(
      syntheticText,
      'Mutual termination with the player Silva',
      new Date('2026-08-12')
    )

    expect(fact).not.toBeNull()
    expect(fact?.playerName).toBe('Gabriel Silva')
    expect(fact?.direction).toBe('termination')
  })

  it('ignores non-transfer corporate press releases', () => {
    const corporateText = `
      Turin, 10 October 2026 - Juventus Football Club S.p.A. announces that the Board of Directors approved the draft financial statements.
    `
    const fact = parseJuventusAnnouncementText(
      corporateText,
      'Approved the draft financial statements',
      new Date('2026-10-10')
    )
    expect(fact).toBeNull()
  })
})

describe('extractTextFromPdfBuffer - Synthetic PDF', () => {
  it('decompresses and extracts text from synthetic PDF stream', () => {
    // Construct a minimal valid synthetic PDF with FlateDecode text stream
    const innerText = 'BT /F1 10 Tf [(Synthetic ) -5 (Player ) 10 (Test)] TJ ET'
    const deflated = zlib.deflateSync(Buffer.from(innerText, 'latin1'))
    const streamHeader = Buffer.from('stream\r\n', 'latin1')
    const streamFooter = Buffer.from('\r\nendstream', 'latin1')
    const syntheticPdf = Buffer.concat([streamHeader, deflated, streamFooter])

    const extracted = extractTextFromPdfBuffer(syntheticPdf)
    expect(extracted).toContain('Synthetic Player Test')
  })
})

describe('Listed Club Portals Registry', () => {
  it('contains survey for all 12 key European listed clubs', () => {
    const portals = listPortals()
    expect(portals.length).toBeGreaterThanOrEqual(10)
    const portalIds = portals.map((p) => p.id)
    expect(portalIds).toContain('juventus')
    expect(portalIds).toContain('kap_turkey')
    expect(portalIds).toContain('manchester_united')
    expect(portalIds).toContain('lazio')
    expect(portalIds).toContain('benfica')
    expect(portalIds).toContain('porto')
    expect(portalIds).toContain('sporting_cp')
    expect(portalIds).toContain('ajax')
    expect(portalIds).toContain('celtic')
    expect(portalIds).toContain('borussia_dortmund')
    expect(portalIds).toContain('copenhagen_parken')
    expect(portalIds).toContain('lyon_eagle')
  })

  it('identifies KAP as blocked with automated access forbidden', () => {
    const kap = getPortal('kap_turkey')
    expect(kap).toBeDefined()
    expect(kap?.automatedAccessAllowed).toBe(false)
    expect(kap?.termsQuotation).toContain('error 5198321-PPE1')
  })

  it('identifies SEC EDGAR as permitted with contact User-Agent', () => {
    const manu = getPortal('manchester_united')
    expect(manu).toBeDefined()
    expect(manu?.automatedAccessAllowed).toBe(true)
    expect(manu?.termsQuotation).toContain('User-Agent')
  })
})

describe('ingestFilingFact - Ingestion Runner with Mocks', () => {
  it('applies transfer and contract when player is matched in database', async () => {
    const mockDb: any = {
      club: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          if (JSON.stringify(where).includes('Juventus')) {
            return Promise.resolve({ id: 10, name: 'Juventus FC' })
          }
          return Promise.resolve({ id: 25, name: 'Sporting CP' })
        }),
      },
      player: {
        findFirst: vi.fn().mockResolvedValue({ id: 99, name: 'Marcus Vance' }),
      },
      transfer: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 101 }),
      },
      contractFact: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 201 }),
      },
      sourcedFact: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 301 }),
      },
    }

    const fact: ExtractedTransferFact = {
      portal: 'juventus',
      sourceUrl: 'https://synthetic.juventus.com/announcements/vance.pdf',
      publishedAt: new Date('2026-07-18'),
      title: 'Agreement with Sporting CP for the acquisition of Marcus Vance',
      playerName: 'Marcus Vance',
      counterpartyName: 'Sporting CP',
      direction: 'acquisition',
      transferType: 'permanent',
      isLoan: false,
      loanOptionOrObligation: 'none',
      feeAmount: 24_500_000,
      feeCurrency: 'EUR',
      feeStatus: 'disclosed',
      contractExpiresOn: new Date('2031-06-30'),
      effectiveDate: new Date('2026-07-18'),
      details: {},
    }

    const announcement: FilingAnnouncement = {
      portal: 'juventus',
      sourceUrl: fact.sourceUrl,
      publishedAt: fact.publishedAt,
      title: fact.title,
    }

    const res = await ingestFilingFact(mockDb, fact, announcement)
    expect(res.status).toBe('applied')
    expect(res.matchedPlayerId).toBe(99)
    expect(res.matchedClubId).toBe(25)
    expect(res.transferRecordStatus).toBe('created')
    expect(res.contractRecordStatus).toBe('created')

    // Verify recordTransfer called with confidence 0.95 and source 'filing'
    expect(mockDb.transfer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerId: 99,
          toClubId: 10,
          fromClubId: 25,
          feeAmount: 24_500_000,
          feeCurrency: 'EUR',
          source: 'filing',
          confidence: 0.95,
        }),
      })
    )

    // Verify contractFact recorded
    expect(mockDb.contractFact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerId: 99,
          clubId: 10,
          source: 'filing',
        }),
      })
    )
  })

  it('routes unmatched player to admin review as unapplied SourcedFact without creating transfer', async () => {
    const mockDb: any = {
      club: {
        findFirst: vi.fn().mockResolvedValue({ id: 10, name: 'Juventus FC' }),
      },
      player: {
        findFirst: vi.fn().mockResolvedValue(null), // Player NOT in DB
      },
      transfer: {
        create: vi.fn(),
      },
      sourcedFact: {
        create: vi.fn().mockResolvedValue({ id: 555 }),
      },
    }

    const fact: ExtractedTransferFact = {
      portal: 'juventus',
      sourceUrl: 'https://synthetic.juventus.com/announcements/unknown.pdf',
      publishedAt: new Date('2026-07-18'),
      title: 'Agreement with Sporting CP for the acquisition of Unknown Player',
      playerName: 'Unknown Player',
      counterpartyName: 'Sporting CP',
      direction: 'acquisition',
      transferType: 'permanent',
      isLoan: false,
      loanOptionOrObligation: 'none',
      feeAmount: 10_000_000,
      feeCurrency: 'EUR',
      feeStatus: 'disclosed',
      details: {},
    }

    const announcement: FilingAnnouncement = {
      portal: 'juventus',
      sourceUrl: fact.sourceUrl,
      publishedAt: fact.publishedAt,
      title: fact.title,
    }

    const res = await ingestFilingFact(mockDb, fact, announcement)
    expect(res.status).toBe('unmatched_player')
    expect(res.matchedPlayerId).toBeNull()
    expect(res.unmatchedFactId).toBe(555)

    // Ensure NO transfer was created
    expect(mockDb.transfer.create).not.toHaveBeenCalled()

    // Ensure unapplied SourcedFact was created for admin review
    expect(mockDb.sourcedFact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'UNMATCHED_TRANSFER',
          entityId: 0,
          field: 'filing_unmatched',
          applied: false,
          source: 'filing',
          confidence: 0.95,
        }),
      })
    )
  })
})
