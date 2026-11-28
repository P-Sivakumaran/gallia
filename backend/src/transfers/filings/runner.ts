import type { PrismaClient } from '@prisma/client'
import { recordContract, recordTransfer, recordUnmatchedFiling } from '../ledger.js'
import { fetchAmfFacts } from './amfFrance.js'
import { fetchJuventusAnnouncements } from './juventus.js'
import { FILING_CHANNELS, LISTED_CLUB_PORTALS } from './portals.js'
import type { ExtractedTransferFact, FilingAnnouncement, IngestionMatchResult } from './types.js'

/**
 * Matches extracted filing facts against Gallia's players and clubs. Confirmed moves go to the
 * ledger; anything that doesn't match exactly one player goes to admin review as an unapplied
 * SourcedFact. Never creates players or clubs.
 */
async function findIssuerClub(db: PrismaClient, names: string[]) {
  for (const name of names) {
    const club = await db.club.findFirst({
      where: { OR: [{ name: { contains: name, mode: 'insensitive' } }, { shortName: { contains: name, mode: 'insensitive' } }] },
    })
    if (club) return club
  }
  return null
}

/** One player whose name contains every token, or null when none or several do. */
async function findUniquePlayer(db: PrismaClient, playerName: string): Promise<number | null> {
  const exact = await db.player.findMany({ where: { name: { equals: playerName, mode: 'insensitive' } }, take: 2 })
  if (exact.length === 1) return exact[0].id
  if (exact.length > 1) return null
  const tokens = playerName.trim().split(/\s+/).filter((t) => t.length > 1)
  if (tokens.length === 0) return null
  const all = await db.player.findMany({
    where: { AND: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' as const } })) },
    take: 2,
  })
  if (all.length === 1) return all[0].id
  if (all.length > 1 || tokens.length === 1) return null
  // Fall back to the surname alone, only when exactly one player carries it.
  const surname = tokens[tokens.length - 1]
  if (surname.length <= 3) return null
  const bySurname = await db.player.findMany({ where: { name: { contains: surname, mode: 'insensitive' } }, take: 2 })
  return bySurname.length === 1 ? bySurname[0].id : null
}

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
    const portal = LISTED_CLUB_PORTALS[fact.portal]
    if (!portal) throw new Error(`Unknown portal "${fact.portal}"`)
    const licence = FILING_CHANNELS[portal.channelId]?.licence ?? 'primary-disclosure'

    const issuer = await findIssuerClub(db, portal.clubMatchNames)
    const issuerClubId = issuer?.id ?? null
    const issuerName = issuer?.name ?? portal.clubMatchNames[0]

    let counterpartyClubId: number | null = null
    let counterpartyClubName = fact.counterpartyName
    if (fact.counterpartyName) {
      const found = await findIssuerClub(db, [fact.counterpartyName])
      if (found) {
        counterpartyClubId = found.id
        counterpartyClubName = found.name
      }
    }

    const playerId = await findUniquePlayer(db, fact.playerName)
    result.matchedPlayerId = playerId
    result.matchedClubId = counterpartyClubId

    if (!playerId) {
      result.status = 'unmatched_player'
      result.unmatchedFactId = await recordUnmatchedFiling(db, {
        playerName: fact.playerName,
        counterpartyName: fact.counterpartyName,
        portal: fact.portal,
        sourceUrl: fact.sourceUrl,
        publishedAt: fact.publishedAt,
        raw: {
          ...fact.details,
          title: fact.title,
          direction: fact.direction,
          transferType: fact.transferType,
          feeAmount: fact.feeAmount,
          contractExpiresOn: fact.contractExpiresOn?.toISOString(),
          reason: 'No single matching player in Gallia database',
        },
      })
      return result
    }

    let fromClubId: number | null = null
    let toClubId: number | null = null
    let fromTeamName: string | null = null
    let toTeamName: string | null = null
    if (fact.direction === 'acquisition') {
      fromClubId = counterpartyClubId
      fromTeamName = counterpartyClubName
      toClubId = issuerClubId
      toTeamName = issuerName
    } else if (fact.direction === 'disposal') {
      fromClubId = issuerClubId
      fromTeamName = issuerName
      toClubId = counterpartyClubId
      toTeamName = counterpartyClubName
    } else {
      toClubId = issuerClubId
      toTeamName = issuerName
    }

    // Extensions and terminations are contract events, not moves.
    if (fact.direction === 'acquisition' || fact.direction === 'disposal') {
      result.transferRecordStatus = await recordTransfer(db, {
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
        details: { ...fact.details, sellOnPercent: fact.sellOnPercent ?? null },
        source: 'filing',
        sourceUrl: fact.sourceUrl,
        licence,
        confidence: 0.95,
      })
    }

    if (fact.contractExpiresOn && (fact.direction === 'acquisition' || fact.direction === 'extension')) {
      result.contractRecordStatus = await recordContract(db, playerId, toClubId, fact.contractExpiresOn, 'filing', fact.sourceUrl, licence, 0.95)
    }

    result.status = 'applied'
    return result
  } catch (err: unknown) {
    result.status = 'error'
    result.error = err instanceof Error ? err.message : String(err)
    return result
  }
}

export interface FilingsIngestOptions {
  /** AMF issuer portal ids (default: lyon_eagle). */
  amfPortals?: string[]
  /** Earliest AMF filing date (default: 365 days ago). */
  amfSince?: Date
  juventusSeasons?: string[]
  juventusMaxPages?: number
  skipAmf?: boolean
  skipJuventus?: boolean
}

export interface FilingsIngestSummary {
  facts: number
  applied: number
  unmatched: number
  errors: number
  byPortal: Record<string, { facts: number; applied: number; unmatched: number; errors: number }>
}

function emptyBucket() {
  return { facts: 0, applied: 0, unmatched: 0, errors: 0 }
}

function announcementFor(
  fact: ExtractedTransferFact,
  announcements: FilingAnnouncement[]
): FilingAnnouncement {
  return (
    announcements.find((a) => a.sourceUrl === fact.sourceUrl) ?? {
      portal: fact.portal,
      sourceUrl: fact.sourceUrl,
      publishedAt: fact.publishedAt,
      title: fact.title,
    }
  )
}

async function ingestFactBatch(
  db: PrismaClient,
  facts: ExtractedTransferFact[],
  announcements: FilingAnnouncement[],
  summary: FilingsIngestSummary
): Promise<void> {
  for (const fact of facts) {
    const portal = fact.portal
    if (!summary.byPortal[portal]) summary.byPortal[portal] = emptyBucket()
    summary.facts++
    summary.byPortal[portal].facts++
    const result = await ingestFilingFact(db, fact, announcementFor(fact, announcements))
    if (result.status === 'applied') {
      summary.applied++
      summary.byPortal[portal].applied++
    } else if (result.status === 'unmatched_player' || result.status === 'unmatched_club' || result.status === 'unmatched_both') {
      summary.unmatched++
      summary.byPortal[portal].unmatched++
    } else {
      summary.errors++
      summary.byPortal[portal].errors++
    }
  }
}

/**
 * Fetch listed-club filings (AMF + Juventus IR) and write them through the ledger.
 * Idempotent via transfer dedupeKey / SourcedFact uniqueness. Rate-limited by filings HTTP.
 */
export async function runListedClubFilingsIngest(
  db: PrismaClient,
  opts: FilingsIngestOptions = {}
): Promise<FilingsIngestSummary> {
  const summary: FilingsIngestSummary = { facts: 0, applied: 0, unmatched: 0, errors: 0, byPortal: {} }

  if (!opts.skipAmf) {
    const portals = opts.amfPortals ?? ['lyon_eagle']
    const since = opts.amfSince ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    for (const portalId of portals) {
      const { announcements, facts } = await fetchAmfFacts(portalId, since)
      await ingestFactBatch(db, facts, announcements, summary)
    }
  }

  if (!opts.skipJuventus) {
    const seasons = opts.juventusSeasons ?? ['season-2026-27', 'season-2025-26']
    const { announcements, facts } = await fetchJuventusAnnouncements(seasons, opts.juventusMaxPages ?? 5)
    await ingestFactBatch(db, facts, announcements, summary)
  }

  return summary
}
