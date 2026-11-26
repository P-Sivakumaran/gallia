/**
 * Transfer ledger writes (docs/transfer-database-plan.md). One Transfer row per move, however many
 * sources report it (dedupeKey = player | destination | YYYY-MM). A better source upgrades the row;
 * every source's reading is kept as SourcedFact rows so the page can cite them all.
 * Contract history keeps one live row per player; a changed expiry supersedes it (an extension).
 * Provider values are stored as given, as an internal benchmark only.
 */
import type { PrismaClient } from '@prisma/client'

export const SOURCE_RANK: Record<string, number> = { filing: 4, news: 3, wikidata: 2, thestatsapi: 1, manual: 5 }

export interface TransferInput {
  playerId: number
  fromClubId?: number | null
  toClubId?: number | null
  fromTeamName?: string | null
  toTeamName?: string | null
  fromTeamQid?: string | null
  toTeamQid?: string | null
  date: Date | null
  datePrecision: 'day' | 'month' | 'year' | 'detected'
  type: 'permanent' | 'loan' | 'loan_end' | 'free' | 'unknown'
  source: 'wikidata' | 'thestatsapi' | 'news' | 'filing' | 'manual'
  sourceUrl?: string | null
  licence: string
  confidence: number
}

export function dedupeKey(t: Pick<TransferInput, 'playerId' | 'toClubId' | 'toTeamQid' | 'toTeamName' | 'date'>): string {
  const dest = t.toClubId != null ? `c${t.toClubId}` : t.toTeamQid ? `q${t.toTeamQid}` : `n${(t.toTeamName ?? '?').toLowerCase()}`
  const month = t.date ? t.date.toISOString().slice(0, 7) : 'undated'
  return `${t.playerId}|${dest}|${month}`
}

/** Insert or upgrade a transfer; returns 'created' | 'upgraded' | 'kept'. */
export async function recordTransfer(db: PrismaClient, t: TransferInput): Promise<'created' | 'upgraded' | 'kept'> {
  const key = dedupeKey(t)
  const existing = await db.transfer.findUnique({ where: { dedupeKey: key } })
  const data = {
    playerId: t.playerId, fromClubId: t.fromClubId ?? null, toClubId: t.toClubId ?? null,
    fromTeamName: t.fromTeamName ?? null, toTeamName: t.toTeamName ?? null, fromTeamQid: t.fromTeamQid ?? null, toTeamQid: t.toTeamQid ?? null,
    date: t.date, datePrecision: t.datePrecision, type: t.type, source: t.source, confidence: t.confidence,
  }
  let result: 'created' | 'upgraded' | 'kept'
  let id: number
  if (!existing) {
    id = (await db.transfer.create({ data: { ...data, dedupeKey: key } })).id
    result = 'created'
  } else {
    id = existing.id
    if ((SOURCE_RANK[t.source] ?? 0) > (SOURCE_RANK[existing.source] ?? 0)) {
      // Keep a known type or a finer date from the weaker source when the better one lacks them.
      await db.transfer.update({
        where: { id },
        data: {
          ...data,
          type: t.type === 'unknown' ? existing.type : t.type,
          date: t.date ?? existing.date,
          fromClubId: t.fromClubId ?? existing.fromClubId,
          fromTeamName: t.fromTeamName ?? existing.fromTeamName,
          fromTeamQid: t.fromTeamQid ?? existing.fromTeamQid,
        },
      })
      result = 'upgraded'
    } else {
      result = 'kept'
    }
  }
  // Each source's reading of the move, once per source.
  const seen = await db.sourcedFact.findFirst({ where: { entityType: 'TRANSFER', entityId: id, field: 'move', source: t.source, supersededAt: null } })
  if (!seen) {
    await db.sourcedFact.create({
      data: {
        entityType: 'TRANSFER', entityId: id, field: 'move',
        value: JSON.stringify({ from: t.fromTeamName ?? t.fromClubId ?? null, to: t.toTeamName ?? t.toClubId ?? null, date: t.date?.toISOString().slice(0, 10) ?? null, type: t.type }),
        source: t.source, sourceUrl: t.sourceUrl ?? null, licence: t.licence, confidence: t.confidence, applied: result !== 'kept',
      },
    })
  }
  return result
}

/** Keep one live contract row per player; a new expiry supersedes the old (an extension or a new club). */
export async function recordContract(db: PrismaClient, playerId: number, clubId: number | null, expiresOn: Date, source: string): Promise<'created' | 'extended' | 'unchanged'> {
  const live = await db.contractFact.findFirst({ where: { playerId, supersededAt: null }, orderBy: { observedAt: 'desc' } })
  if (live && live.expiresOn.getTime() === expiresOn.getTime() && live.clubId === clubId) return 'unchanged'
  if (live) await db.contractFact.update({ where: { id: live.id }, data: { supersededAt: new Date() } })
  await db.contractFact.create({ data: { playerId, clubId, expiresOn, source } })
  return live ? 'extended' : 'created'
}

/** One provider value per player per day. */
export async function recordProviderValue(db: PrismaClient, playerId: number, value: number, currency: string | null, day = new Date()): Promise<void> {
  const observedOn = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()))
  await db.providerValue.upsert({
    where: { playerId_observedOn: { playerId, observedOn } },
    create: { playerId, value, currency, observedOn },
    update: { value, currency },
  })
}
