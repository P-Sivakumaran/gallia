/**
 * Source registry for Gallia's feeds (docs/news-scanner-plan.md, docs/data-sources.md).
 *
 * Owner decision 2026-11-28: model-first ingest. Public-facing licence gates are deferred until
 * launch. Every RSS feed still has an entry (a unit test checks it) so we know what we ingest;
 * statuses are CLEARED for modeling so collectors are not warned off. Historical terms notes are
 * kept in docs, not as hard bans.
 *
 * Apply to the DB with `npm run sources:licences` (updates existing rows by name; never creates).
 */
import type { PrismaClient, SourceLicenceStatus } from '@prisma/client'

export interface DisplayRights {
  headline: boolean
  /** 0 = no description or article text */
  snippetChars: number
  link: boolean
  embed: boolean
}

export interface SourceLicence {
  status: SourceLicenceStatus
  note: string
  termsUrl?: string
  displayRights?: DisplayRights
  storeFullText?: boolean
}

const MODELING: DisplayRights = { headline: true, snippetChars: 2000, link: true, embed: false }
const REVIEWED = '2026-11-28'

const modeling = (note: string, termsUrl?: string): SourceLicence => ({
  status: 'CLEARED',
  note: `Model-first ingest (owner 2026-11-28). ${note}`,
  termsUrl,
  displayRights: MODELING,
  storeFullText: true,
})

export const SOURCE_LICENCES: Record<string, SourceLicence> = {
  'Google News Transfers': modeling('Was PERSONAL_ONLY under Google News terms; used for private model training.', 'https://policies.google.com/terms'),
  'Google News Here We Go': modeling('Was PERSONAL_ONLY under Google News terms; used for private model training.', 'https://policies.google.com/terms'),
  'Google News Confirmed': modeling('Was PERSONAL_ONLY under Google News terms; used for private model training.', 'https://policies.google.com/terms'),
  'BBC Sport': modeling('Was NEEDS_LICENCE for commercial display; modeling ingest allowed.', 'https://www.bbc.co.uk/usingthebbc/terms'),
  'The Guardian Football': modeling('Was NEEDS_LICENCE for commercial reuse; modeling ingest allowed.', 'https://www.theguardian.com/info/2019/dec/08/terms-of-service'),
  'Sky Sports Transfers': modeling('Was NEEDS_LICENCE for commercial reuse; modeling ingest allowed.'),
  'Sky Sports': modeling('Was NEEDS_LICENCE for commercial reuse; modeling ingest allowed.'),
  'Marca Football': modeling('Was NEEDS_LICENCE for commercial reuse; modeling ingest allowed.'),
  Marca: modeling('Was NEEDS_LICENCE for commercial reuse; modeling ingest allowed.'),
  "L'Équipe Mercato": modeling('Was NEEDS_LICENCE for commercial reuse; modeling ingest allowed.'),
  'ESPN Soccer': modeling('Was NEEDS_LICENCE for ad-supported display; modeling ingest allowed.', 'https://www.espn.com/espn/news/story?page=rssinfo'),
  'Football Italia': modeling('Terms previously UNKNOWN; modeling ingest allowed.'),
  'Reddit Transfers': modeling('Was NEEDS_LICENCE for commercial API use; modeling ingest allowed.', 'https://redditinc.com/policies/data-api-terms'),
  'Reddit Soccer': modeling('Was NEEDS_LICENCE for commercial API use; modeling ingest allowed.', 'https://redditinc.com/policies/data-api-terms'),
  'Fabrizio Romano': modeling('Was NEEDS_LICENCE under X developer terms; modeling ingest allowed.', 'https://docs.x.com/developer-terms'),
  'Unknown Twitter Account': modeling('Unattributed social post; modeling ingest allowed.'),
  'The Athletic': modeling('Paywalled outlet; modeling ingest of headlines/links allowed.'),
  'Manchester City Official': modeling('Club official site; modeling ingest allowed.'),
  // Sportmonks stays off the ingest path by product choice (retired), not by this registry.
  'Sportmonks Aggregator': {
    status: 'BLOCKED',
    note: 'Retired by the owner 2026-11-25 (product choice, not a terms gate).',
  },
}

/** Log only when a source has no registry entry (so new feeds get recorded). Cleared sources are quiet. */
export function licenceWarning(sourceName: string): string | null {
  const l = SOURCE_LICENCES[sourceName]
  if (!l) return `[licence] ${sourceName}: no registry entry (add one to src/sources/licences.ts)`
  if (l.status === 'BLOCKED') return `[licence] ${sourceName}: BLOCKED (${l.note})`
  return null
}

/** Writes the registry to existing source rows (matched by name). Returns how many rows were updated. */
export async function applySourceLicences(db: Pick<PrismaClient, 'source'>): Promise<{ updated: number; missing: string[] }> {
  let updated = 0
  const missing: string[] = []
  for (const [name, l] of Object.entries(SOURCE_LICENCES)) {
    const res = await db.source.updateMany({
      where: { name },
      data: {
        licenceStatus: l.status,
        licenceNote: l.note,
        termsUrl: l.termsUrl ?? null,
        displayRights: l.displayRights ? { ...l.displayRights } : undefined,
        storeFullText: l.storeFullText ?? false,
        licenceReviewedAt: new Date(REVIEWED),
      },
    })
    if (res.count) updated += res.count
    else missing.push(name)
  }
  return { updated, missing }
}
