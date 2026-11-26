import { describe, it, expect, vi } from 'vitest'
import { recordEntitlementGrant } from './auditService.js'
import type { AdminAuditDb } from './db.js'

describe('recordEntitlementGrant', () => {
  it('writes an audit event with the full before/after tier and no secret material', async () => {
    const create = vi.fn().mockResolvedValue({})
    const db: AdminAuditDb = { adminAuditEvent: { create } }

    await recordEntitlementGrant(db, {
      actingAdminUserId: 1,
      targetUserId: 2,
      previousTier: 'FREE',
      newTier: 'PRO',
      entitlementSource: 'MANUAL',
      correlationId: 'req-123',
    })

    expect(create).toHaveBeenCalledWith({
      data: {
        actingAdminUserId: 1,
        actionType: 'ENTITLEMENT_GRANT',
        targetUserId: 2,
        previousTier: 'FREE',
        newTier: 'PRO',
        entitlementSource: 'MANUAL',
        correlationId: 'req-123',
      },
    })
  })

  it('defaults correlationId to null when not supplied', async () => {
    const create = vi.fn().mockResolvedValue({})
    const db: AdminAuditDb = { adminAuditEvent: { create } }

    await recordEntitlementGrant(db, {
      actingAdminUserId: 1,
      targetUserId: 2,
      previousTier: 'FREE',
      newTier: 'RESEARCH',
      entitlementSource: 'MANUAL',
    })

    expect(create.mock.calls[0][0].data.correlationId).toBeNull()
  })
})

describe('recordClubLocationAction', () => {
  it('writes a CLUB-targeted audit row with no user target', async () => {
    const calls: unknown[] = []
    const db = { adminAuditEvent: { create: async (args: unknown) => { calls.push(args) } } }
    const { recordClubLocationAction } = await import('./auditService.js')
    await recordClubLocationAction(db, {
      actingAdminUserId: 3,
      action: 'CLUB_LOCATION_ACCEPT',
      clubId: 42,
      details: { wikidataId: 'Q19467', lat: 51.39, lng: -0.08 },
    })
    expect(calls).toEqual([{
      data: {
        actingAdminUserId: 3,
        actionType: 'CLUB_LOCATION_ACCEPT',
        targetType: 'CLUB',
        targetId: 42,
        details: { wikidataId: 'Q19467', lat: 51.39, lng: -0.08 },
        correlationId: null,
      },
    }])
  })
})
