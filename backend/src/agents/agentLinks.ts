/**
 * Player → agent links, entered by an admin from a cited news article.
 *
 * Owner decision 2026-11-26: agent data comes only from news articles Gallia
 * cites. No bulk register is reusable (FIFA needs written consent, the FA's
 * PDFs carry no reuse licence), and the stored feeds name almost no agents,
 * so links are added by hand. Every link carries at least one citation, kept
 * as a SourcedFact (entityType PLAYER_AGENT, field 'agent', sourceUrl = the
 * article). A second article for the same link adds a citation instead of a
 * duplicate link. Removing a link supersedes its citations; nothing is deleted
 * from sourced_facts.
 */
import { Prisma, type PrismaClient, type AgentKind, type PlayerAgentRole } from '@prisma/client'

// Hosts that only redirect to the real article. A citation must name the publisher's page.
const REDIRECT_HOSTS = new Set([
  'news.google.com', 'google.com', 'www.google.com', 't.co', 'bit.ly', 'tinyurl.com', 'ow.ly', 'buff.ly',
  'l.facebook.com', 'lnkd.in', 'flip.it', 'msn.com', 'www.msn.com',
])

/** Why this URL can't be a citation, or null when it can. */
export function citationUrlProblem(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return 'not a URL'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'must be an http(s) link'
  if (REDIRECT_HOSTS.has(url.hostname)) return `${url.hostname} only redirects; cite the publisher's own article URL`
  if (url.username || url.password) return 'must not contain credentials'
  return null
}

/** "  jorge   Mendes " → "jorge Mendes": trims and collapses whitespace; case is kept as typed. */
export function normaliseAgentName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Tracking parameters dropped so the same article isn't cited twice under two URLs. */
export function canonicalCitationUrl(raw: string): string {
  const url = new URL(raw)
  for (const k of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$)/i.test(k)) url.searchParams.delete(k)
  }
  url.hash = ''
  return url.toString()
}

export interface AddAgentLinkInput {
  playerId: number
  agentName: string
  agentKind: AgentKind
  /** Optional agency the person works for (created as an AGENCY if new). */
  agencyName?: string | null
  role: PlayerAgentRole
  /** Set for NEGOTIATED_DEAL: the rumour the deal belongs to. */
  rumourId?: number | null
  sourceUrl: string
  /** Short quote from the article that names the agent (max 300 chars). */
  quote?: string | null
}

export type AddAgentLinkResult =
  | { kind: 'created' | 'cited'; linkId: number; agentId: number; citationUrl: string }
  | { kind: 'duplicate-citation'; linkId: number }
  | { kind: 'player-not-found' }
  | { kind: 'rumour-not-found' }

type Tx = Prisma.TransactionClient

async function findOrCreateAgent(tx: Tx, name: string, kind: AgentKind, agencyId: number | null): Promise<number> {
  const existing = await tx.agent.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, kind }, select: { id: true, agencyId: true } })
  if (existing) {
    if (agencyId && !existing.agencyId) await tx.agent.update({ where: { id: existing.id }, data: { agencyId } })
    return existing.id
  }
  return (await tx.agent.create({ data: { name, kind, agencyId }, select: { id: true } })).id
}

export async function addAgentLink(db: PrismaClient, input: AddAgentLinkInput): Promise<AddAgentLinkResult> {
  const name = normaliseAgentName(input.agentName)
  const citationUrl = canonicalCitationUrl(input.sourceUrl)
  return db.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: input.playerId }, select: { id: true } })
    if (!player) return { kind: 'player-not-found' } as const
    const rumourId = input.role === 'NEGOTIATED_DEAL' ? input.rumourId ?? null : null
    if (rumourId != null && !(await tx.rumour.findUnique({ where: { id: rumourId }, select: { id: true } }))) {
      return { kind: 'rumour-not-found' } as const
    }

    const agencyName = input.agentKind === 'PERSON' && input.agencyName ? normaliseAgentName(input.agencyName) : null
    const agencyId = agencyName ? await findOrCreateAgent(tx, agencyName, 'AGENCY', null) : null
    const agentId = await findOrCreateAgent(tx, name, input.agentKind, agencyId)

    // The unique index treats NULL rumourIds as distinct, so look the link up rather than relying on it.
    let link = await tx.playerAgent.findFirst({ where: { playerId: player.id, agentId, role: input.role, rumourId }, select: { id: true } })
    const created = !link
    if (!link) link = await tx.playerAgent.create({ data: { playerId: player.id, agentId, role: input.role, rumourId }, select: { id: true } })

    const live = { entityType: 'PLAYER_AGENT', entityId: link.id, supersededAt: null }
    if (!created && (await tx.sourcedFact.findFirst({ where: { ...live, field: 'agent', sourceUrl: citationUrl } }))) {
      return { kind: 'duplicate-citation', linkId: link.id } as const
    }
    const base = { entityType: 'PLAYER_AGENT', entityId: link.id, source: 'manual-citation', sourceUrl: citationUrl, licence: 'quote-only', confidence: 1, applied: true }
    await tx.sourcedFact.createMany({
      data: [
        { ...base, field: 'agent', value: name },
        ...(input.quote ? [{ ...base, field: 'quote', value: input.quote.trim() }] : []),
      ],
    })
    return { kind: created ? 'created' : 'cited', linkId: link.id, agentId, citationUrl } as const
  })
}

/** Removes a link and supersedes its citations. Returns the removed link, or null if it didn't exist. */
export async function removeAgentLink(db: PrismaClient, linkId: number): Promise<{ playerId: number; agentId: number } | null> {
  return db.$transaction(async (tx) => {
    const link = await tx.playerAgent.findUnique({ where: { id: linkId }, select: { playerId: true, agentId: true } })
    if (!link) return null
    await tx.sourcedFact.updateMany({
      where: { entityType: 'PLAYER_AGENT', entityId: linkId, supersededAt: null },
      data: { supersededAt: new Date() },
    })
    await tx.playerAgent.delete({ where: { id: linkId } })
    return link
  })
}

export interface PlayerAgentView {
  linkId: number
  role: PlayerAgentRole
  rumourId: number | null
  agent: { id: number; name: string; kind: AgentKind; agency: string | null }
  citations: { url: string; host: string; quote: string | null; addedAt: string }[]
}

/** A player's agent links with their live citations, newest citation first. Links with no live citation are left out. */
export async function listPlayerAgents(db: PrismaClient, playerId: number): Promise<PlayerAgentView[]> {
  const links = await db.playerAgent.findMany({
    where: { playerId },
    include: { agent: { select: { id: true, name: true, kind: true, agency: { select: { name: true } } } } },
    orderBy: { createdAt: 'asc' },
  })
  if (!links.length) return []
  const facts = await db.sourcedFact.findMany({
    where: { entityType: 'PLAYER_AGENT', entityId: { in: links.map((l) => l.id) }, supersededAt: null, field: { in: ['agent', 'quote'] } },
    orderBy: { retrievedAt: 'desc' },
  })
  return links.flatMap((l) => {
    const mine = facts.filter((f) => f.entityId === l.id)
    const citations = mine
      .filter((f) => f.field === 'agent' && f.sourceUrl)
      .map((f) => ({
        url: f.sourceUrl!,
        host: new URL(f.sourceUrl!).hostname.replace(/^www\./, ''),
        quote: mine.find((q) => q.field === 'quote' && q.sourceUrl === f.sourceUrl)?.value ?? null,
        addedAt: f.retrievedAt.toISOString(),
      }))
    if (!citations.length) return []
    return [{
      linkId: l.id,
      role: l.role,
      rumourId: l.rumourId,
      agent: { id: l.agent.id, name: l.agent.name, kind: l.agent.kind, agency: l.agent.agency?.name ?? null },
      citations,
    }]
  })
}
