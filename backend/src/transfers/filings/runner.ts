import type { PrismaClient } from '@prisma/client'
import { recordContract, recordTransfer, recordUnmatchedFiling } from '../ledger.js'
import type { ExtractedTransferFact, FilingAnnouncement, IngestionMatchResult } from './types.js'

/**
 * Normalizes club/player names for fuzzy matching.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Matches extracted filing facts against Gallia's player and club database,
 * applying transfers and contracts to the ledger or routing unmatched entries
 * to the unapplied SourcedFact admin review queue.
 */
export async function ingestFilingFact(
  db: PrismaClient,
  fact: ExtractedTransferFact,
  announcement: FilingAnnouncement
): Promise<IngestionMatchResult> {
  const result: IngestionMatchResult = {
    announcement,
    extracted: fact,
    matchedPlayerId: null,
    matchedClubId: null,
    status: 'applied',
  }

  try {
    // 1. Resolve Juventus Club ID
    const juventus = await db.club.findFirst({
      where: {
        OR: [
          { name: { contains: 'Juventus', mode: 'insensitive' } },
          { shortName: { contains: 'Juventus', mode: 'insensitive' } },
        ],
      },
    })
    const juventusClubId = juventus?.id ?? null

    // 2. Resolve Counterparty Club
    let counterpartyClubId: number | null = null
    let counterpartyClubName = fact.counterpartyName
    if (fact.counterpartyName) {
      const normCounterparty = normalizeName(fact.counterpartyName)
      const foundClub = await db.club.findFirst({
        where: {
          OR: [
            { name: { contains: fact.counterpartyName, mode: 'insensitive' } },
            { shortName: { contains: fact.counterpartyName, mode: 'insensitive' } },
          ],
        },
      })
      if (foundClub) {
        counterpartyClubId = foundClub.id
        counterpartyClubName = foundClub.name
      }
    }

    // 3. Resolve Player
    let playerId: number | null = null
    const normPlayer = normalizeName(fact.playerName)

    // Direct match
    const directMatch = await db.player.findFirst({
      where: {
        OR: [
          { name: { equals: fact.playerName, mode: 'insensitive' } },
          { name: { contains: fact.playerName, mode: 'insensitive' } },
        ],
      },
    })

    if (directMatch) {
      playerId = directMatch.id
    } else {
      // Last name match fallback (many Italian filings say e.g. "player Boga" or "player Holm")
      const nameParts = fact.playerName.trim().split(/\s+/)
      const lastName = nameParts[nameParts.length - 1]
      if (lastName.length > 3) {
        const lastNameMatch = await db.player.findFirst({
          where: {
            name: { contains: lastName, mode: 'insensitive' },
          },
        })
        if (lastNameMatch) {
          playerId = lastNameMatch.id
        }
      }
    }

    result.matchedPlayerId = playerId
    result.matchedClubId = counterpartyClubId

    // 4. Handle Unmatched Entities: Admin Review via unapplied SourcedFact
    if (!playerId) {
      result.status = 'unmatched_player'
      const factId = await recordUnmatchedFiling(db, {
        playerName: fact.playerName,
        counterpartyName: fact.counterpartyName,
        portal: fact.portal,
        sourceUrl: fact.sourceUrl,
        publishedAt: fact.publishedAt,
        raw: {
          ...fact.details,
          title: fact.title,
          feeAmount: fact.feeAmount,
          contractExpiresOn: fact.contractExpiresOn?.toISOString(),
          reason: 'Unmatched player in Gallia database',
        },
      })
      result.unmatchedFactId = factId
      return result
    }

    // 5. Determine From and To clubs
    let fromClubId: number | null = null
    let toClubId: number | null = null
    let fromTeamName: string | null = null
    let toTeamName: string | null = null

    if (fact.direction === 'acquisition') {
      fromClubId = counterpartyClubId
      fromTeamName = counterpartyClubName
      toClubId = juventusClubId
      toTeamName = juventus?.name ?? 'Juventus'
    } else if (fact.direction === 'disposal') {
      fromClubId = juventusClubId
      fromTeamName = juventus?.name ?? 'Juventus'
      toClubId = counterpartyClubId
      toTeamName = counterpartyClubName
    } else {
      // Contract extension or termination
      toClubId = juventusClubId
      toTeamName = juventus?.name ?? 'Juventus'
    }

    // 6. Record Transfer in Ledger
    const transferStatus = await recordTransfer(db, {
      playerId,
      fromClubId,
      toClubId,
      fromTeamName,
      toTeamName,
      date: fact.effectiveDate ?? fact.publishedAt,
      datePrecision: 'day',
      type: fact.transferType,
      feeAmount: fact.feeAmount,
      feeCurrency: fact.feeCurrency,
      feeStatus: fact.feeStatus,
      details: fact.details,
      source: 'filing',
      sourceUrl: fact.sourceUrl,
      licence: 'primary-disclosure',
      confidence: 0.95,
    })
    result.transferRecordStatus = transferStatus

    // 7. Record Contract Extension/Expiry if disclosed
    if (fact.contractExpiresOn && (fact.direction === 'acquisition' || fact.direction === 'extension')) {
      const contractStatus = await recordContract(
        db,
        playerId,
        toClubId,
        fact.contractExpiresOn,
        'filing',
        fact.sourceUrl,
        'primary-disclosure',
        0.95
      )
      result.contractRecordStatus = contractStatus
    }

    result.status = 'applied'
    return result
  } catch (err: any) {
    result.status = 'error'
    result.error = err?.message ?? String(err)
    return result
  }
}
