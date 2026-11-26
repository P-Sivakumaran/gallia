import type { AdminAuditDb, AgentLinkAction, ClubLocationAction } from './db.js'
import type { EntitlementTier, EntitlementSource } from '../entitlements/flags.js'

export interface RecordEntitlementGrantInput {
  actingAdminUserId: number
  targetUserId: number
  previousTier: EntitlementTier
  newTier: EntitlementTier
  entitlementSource: EntitlementSource
  correlationId?: string | null
}

// Immutable audit trail — this file holds the only write paths to AdminAuditEvent
// anywhere in this codebase (no update/delete call exists). Called only on
// a successful grant, since previousTier/newTier only mean something for a
// completed change; failed attempts go through
// analytics/operationalEvents.ts's ADMIN_TIER_GRANT_FAILURE instead (a
// separate, non-audit channel — see docs/public-beta-readiness-audit.md).
export async function recordEntitlementGrant(db: AdminAuditDb, input: RecordEntitlementGrantInput): Promise<void> {
  await db.adminAuditEvent.create({
    data: {
      actingAdminUserId: input.actingAdminUserId,
      actionType: 'ENTITLEMENT_GRANT',
      targetUserId: input.targetUserId,
      previousTier: input.previousTier,
      newTier: input.newTier,
      entitlementSource: input.entitlementSource,
      correlationId: input.correlationId ?? null,
    },
  })
}

export interface RecordClubLocationActionInput {
  actingAdminUserId: number
  action: ClubLocationAction
  clubId: number
  /** What changed (QID, coordinates, counts). Plain values only, never secrets. */
  details: Record<string, string | number | null>
  correlationId?: string | null
}

// Same immutable trail as entitlement grants, for an admin's decision about a
// club's location (accepting or rejecting a Wikidata match, or placing it by hand).
export async function recordClubLocationAction(db: AdminAuditDb, input: RecordClubLocationActionInput): Promise<void> {
  await db.adminAuditEvent.create({
    data: {
      actingAdminUserId: input.actingAdminUserId,
      actionType: input.action,
      targetType: 'CLUB',
      targetId: input.clubId,
      details: input.details,
      correlationId: input.correlationId ?? null,
    },
  })
}

export interface RecordAgentLinkActionInput {
  actingAdminUserId: number
  action: AgentLinkAction
  /** PlayerAgent row id */
  linkId: number
  /** Player, agent and the citation URL. Plain values only, never secrets. */
  details: Record<string, string | number | null>
  correlationId?: string | null
}

// An admin adding or removing a cited player → agent link (cited news only, owner decision 2026-11-26).
export async function recordAgentLinkAction(db: AdminAuditDb, input: RecordAgentLinkActionInput): Promise<void> {
  await db.adminAuditEvent.create({
    data: {
      actingAdminUserId: input.actingAdminUserId,
      actionType: input.action,
      targetType: 'PLAYER_AGENT',
      targetId: input.linkId,
      details: input.details,
      correlationId: input.correlationId ?? null,
    },
  })
}
