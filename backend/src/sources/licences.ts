/**
 * Licence registry for Gallia's sources (docs/news-scanner-plan.md Phase A, docs/data-sources.md).
 *
 * Owner decision 2026-11-26: record now, enforce later. Collectors keep running and log any
 * source that isn't CLEARED; enforcement switches on once a licensed news feed replaces the
 * personal-use feeds. Every RSS feed must have an entry here (a unit test checks it), so a new
 * feed can't be added without someone reading its terms first.
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

const LINK_ONLY: DisplayRights = { headline: true, snippetChars: 0, link: true, embed: false }
const REVIEWED = '2026-11-26'

export const SOURCE_LICENCES: Record<string, SourceLicence> = {
  // Google News: personal, non-commercial use only.
  'Google News Transfers': { status: 'PERSONAL_ONLY', note: 'Google News terms: personal, non-commercial use only; links are news.google.com redirects.', termsUrl: 'https://policies.google.com/terms' },
  'Google News Here We Go': { status: 'PERSONAL_ONLY', note: 'Google News terms: personal, non-commercial use only.', termsUrl: 'https://policies.google.com/terms' },
  'Google News Confirmed': { status: 'PERSONAL_ONLY', note: 'Google News terms: personal, non-commercial use only.', termsUrl: 'https://policies.google.com/terms' },
  // Publisher RSS
  'BBC Sport': { status: 'NEEDS_LICENCE', note: 'BBC RSS: business use needs permission (possible fee).', termsUrl: 'https://www.bbc.co.uk/usingthebbc/terms', displayRights: LINK_ONLY },
  'The Guardian Football': { status: 'NEEDS_LICENCE', note: 'Commercial reuse restricted; Guardian Open Platform licence is the route.', termsUrl: 'https://www.theguardian.com/info/2019/dec/08/terms-of-service', displayRights: LINK_ONLY },
  'Sky Sports Transfers': { status: 'NEEDS_LICENCE', note: 'Sky restricts commercial reuse of its content.', displayRights: LINK_ONLY },
  'Sky Sports': { status: 'NEEDS_LICENCE', note: 'Sky restricts commercial reuse of its content.', displayRights: LINK_ONLY },
  'Marca Football': { status: 'NEEDS_LICENCE', note: 'Marca restricts commercial reuse.', displayRights: LINK_ONLY },
  Marca: { status: 'NEEDS_LICENCE', note: 'Marca restricts commercial reuse.', displayRights: LINK_ONLY },
  "L'Équipe Mercato": { status: 'NEEDS_LICENCE', note: "L'Équipe restricts commercial reuse.", displayRights: LINK_ONLY },
  // ESPN RSS terms: unmodified, credited, linked, and "You may not incorporate advertising into any ESPN RSS content."
  // Fine for an ad-free Gallia; an ad-supported one needs a licence. Disney's site terms are personal, non-commercial.
  'ESPN Soccer': { status: 'NEEDS_LICENCE', note: 'ESPN RSS terms forbid advertising on or around feed content; ad-free display only, unmodified, credited, linked.', termsUrl: 'https://www.espn.com/espn/news/story?page=rssinfo', displayRights: LINK_ONLY },
  'Football Italia': { status: 'UNKNOWN', note: 'Terms not reviewed yet.' },
  // Social and community
  'Reddit Transfers': { status: 'NEEDS_LICENCE', note: 'Reddit Data API: commercial use needs written approval; ads beside Reddit content may be banned.', termsUrl: 'https://redditinc.com/policies/data-api-terms' },
  'Reddit Soccer': { status: 'NEEDS_LICENCE', note: 'Reddit Data API: commercial use needs written approval; ads beside Reddit content may be banned.', termsUrl: 'https://redditinc.com/policies/data-api-terms' },
  'Fabrizio Romano': { status: 'NEEDS_LICENCE', note: 'Posts on X: X API pay-per-use; show as official embeds; check X developer terms.', termsUrl: 'https://docs.x.com/developer-terms' },
  'Unknown Twitter Account': { status: 'UNKNOWN', note: 'Unattributed social post.' },
  'The Athletic': { status: 'UNKNOWN', note: 'Paywalled outlet; terms not reviewed. Cite headline and link only.' },
  'Manchester City Official': { status: 'UNKNOWN', note: 'Club official site; terms not reviewed. Headline and link only.', displayRights: LINK_ONLY },
  // Data providers
  'Sportmonks Aggregator': { status: 'BLOCKED', note: 'Retired by the owner 2026-11-25.' },
}

/** One log line per ingest run for a source that isn't cleared (record now, enforce later). */
export function licenceWarning(sourceName: string): string | null {
  const l = SOURCE_LICENCES[sourceName]
  if (!l) return `[licence] ${sourceName}: no licence entry (add one to src/sources/licences.ts)`
  if (l.status === 'CLEARED') return null
  return `[licence] ${sourceName}: ${l.status} (${l.note})`
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
