import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'express-async-errors'
import express from 'express'
import cookieParser from 'cookie-parser'
import type { Server } from 'http'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import adminRouter from './admin.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'
const prisma = new PrismaClient()
const RUN_ID = `ADM_LOC_${Date.now()}`

let server: Server
let baseUrl: string
let adminUserId: number
let nonAdminUserId: number

function cookieFor(userId: number): string {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' })
  return `token=${token}`
}

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { email: `${RUN_ID}-admin@test.com`, passwordHash: 'x', role: 'ADMIN' },
  })
  adminUserId = admin.id

  const nonAdmin = await prisma.user.create({
    data: { email: `${RUN_ID}-nonadmin@test.com`, passwordHash: 'x', role: 'USER' },
  })
  nonAdminUserId = nonAdmin.id

  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/admin', adminRouter)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'test-server error' })
  })

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, nonAdminUserId] } } })
  await prisma.$disconnect()
})

describe('Club Location Review API', () => {
  it('401s when unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/admin/club-locations/review`)
    expect(res.status).toBe(401)
  })

  it('403s when authenticated as non-admin', async () => {
    const res = await fetch(`${baseUrl}/admin/club-locations/review`, {
      headers: { Cookie: cookieFor(nonAdminUserId) },
    })
    expect(res.status).toBe(403)
  })

  it('returns candidate reviews and unplaced clubs for an admin', async () => {
    const res = await fetch(`${baseUrl}/admin/club-locations/review`, {
      headers: { Cookie: cookieFor(adminUserId) },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { candidates: unknown[]; unplaced: unknown[] }
    expect(Array.isArray(body.candidates)).toBe(true)
    expect(Array.isArray(body.unplaced)).toBe(true)
  })

  describe('accepting a candidate location', () => {
    it('sets columns and marks facts applied, and 409s on duplicate wikidataId', async () => {
      // Create two test clubs
      const club1 = await prisma.club.create({
        data: { name: `${RUN_ID}-Club1`, country: 'England', league: 'EPL' },
      })
      const club2 = await prisma.club.create({
        data: { name: `${RUN_ID}-Club2`, country: 'England', league: 'EPL', wikidataId: `Q_HELD_${RUN_ID}` },
      })

      // Add unapplied candidate facts for club1
      await prisma.sourcedFact.createMany({
        data: [
          {
            entityType: 'CLUB',
            entityId: club1.id,
            field: 'wikidataId',
            value: `Q_NEW_${RUN_ID}`,
            source: 'wikidata',
            sourceUrl: `https://www.wikidata.org/wiki/Q_NEW_${RUN_ID}`,
            licence: 'CC0',
            confidence: 0.65,
            applied: false,
          },
          {
            entityType: 'CLUB',
            entityId: club1.id,
            field: 'lat',
            value: '51.5007',
            source: 'wikidata',
            sourceUrl: `https://www.wikidata.org/wiki/Q_NEW_${RUN_ID}`,
            licence: 'CC0',
            confidence: 0.65,
            applied: false,
          },
          {
            entityType: 'CLUB',
            entityId: club1.id,
            field: 'lng',
            value: '-0.1246',
            source: 'wikidata',
            sourceUrl: `https://www.wikidata.org/wiki/Q_NEW_${RUN_ID}`,
            licence: 'CC0',
            confidence: 0.65,
            applied: false,
          },
          {
            entityType: 'CLUB',
            entityId: club1.id,
            field: 'stadium',
            value: 'Test Ground',
            source: 'wikidata',
            sourceUrl: `https://www.wikidata.org/wiki/Q_NEW_${RUN_ID}`,
            licence: 'CC0',
            confidence: 0.65,
            applied: false,
          },
        ],
      })

      try {
        // Attempting to accept a wikidataId already held by club2 should 409
        const conflictRes = await fetch(`${baseUrl}/admin/club-locations/${club1.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieFor(adminUserId) },
          body: JSON.stringify({ wikidataId: `Q_HELD_${RUN_ID}` }),
        })
        expect(conflictRes.status).toBe(409)
        const conflictBody = (await conflictRes.json()) as { heldBy: string }
        expect(conflictBody.heldBy).toBe(club2.name)

        // Accepting the candidate facts succeeds
        const acceptRes = await fetch(`${baseUrl}/admin/club-locations/${club1.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieFor(adminUserId) },
          body: JSON.stringify({ wikidataId: `Q_NEW_${RUN_ID}` }),
        })
        expect(acceptRes.status).toBe(200)

        // Verify Club columns
        const updatedClub = await prisma.club.findUnique({ where: { id: club1.id } })
        expect(updatedClub?.wikidataId).toBe(`Q_NEW_${RUN_ID}`)
        expect(updatedClub?.lat).toBeCloseTo(51.5007)
        expect(updatedClub?.lng).toBeCloseTo(-0.1246)
        expect(updatedClub?.stadium).toBe('Test Ground')

        // Verify SourcedFact applied=true
        const facts = await prisma.sourcedFact.findMany({ where: { entityType: 'CLUB', entityId: club1.id } })
        expect(facts.every((f) => f.applied)).toBe(true)
        expect(facts.every((f) => f.supersededAt === null)).toBe(true)
      } finally {
        await prisma.sourcedFact.deleteMany({ where: { entityType: 'CLUB', entityId: { in: [club1.id, club2.id] } } })
        await prisma.club.deleteMany({ where: { id: { in: [club1.id, club2.id] } } })
      }
    })
  })

  describe('rejecting a candidate location', () => {
    it('sets supersededAt on candidate facts without modifying club columns', async () => {
      const club = await prisma.club.create({
        data: { name: `${RUN_ID}-RejectClub`, country: 'France', league: 'Ligue 1', lat: null, lng: null },
      })

      await prisma.sourcedFact.create({
        data: {
          entityType: 'CLUB',
          entityId: club.id,
          field: 'lat',
          value: '48.8566',
          source: 'wikidata',
          sourceUrl: 'https://www.wikidata.org/wiki/QTest',
          licence: 'CC0',
          confidence: 0.5,
          applied: false,
        },
      })

      try {
        const rejectRes = await fetch(`${baseUrl}/admin/club-locations/${club.id}/reject`, {
          method: 'POST',
          headers: { Cookie: cookieFor(adminUserId) },
        })
        expect(rejectRes.status).toBe(200)

        const updatedClub = await prisma.club.findUnique({ where: { id: club.id } })
        expect(updatedClub?.lat).toBeNull()

        const fact = await prisma.sourcedFact.findFirst({ where: { entityType: 'CLUB', entityId: club.id } })
        expect(fact?.applied).toBe(false)
        expect(fact?.supersededAt).not.toBeNull()
      } finally {
        await prisma.sourcedFact.deleteMany({ where: { entityType: 'CLUB', entityId: club.id } })
        await prisma.club.deleteMany({ where: { id: club.id } })
      }
    })
  })

  describe('manual location entry', () => {
    it('validates ranges, writes Club columns, and adds manual SourcedFact rows', async () => {
      const club = await prisma.club.create({
        data: { name: `${RUN_ID}-ManualClub`, country: 'Spain', league: 'La Liga' },
      })

      try {
        // Validation error on invalid coordinates
        const badRes = await fetch(`${baseUrl}/admin/club-locations/${club.id}/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieFor(adminUserId) },
          body: JSON.stringify({ lat: 100, lng: 0 }), // lat > 90
        })
        expect(badRes.status).toBe(400)

        // Valid manual coordinates
        const goodRes = await fetch(`${baseUrl}/admin/club-locations/${club.id}/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieFor(adminUserId) },
          body: JSON.stringify({
            lat: 40.4168,
            lng: -3.7038,
            stadium: 'Estadio Manual',
            city: 'Madrid',
          }),
        })
        expect(goodRes.status).toBe(200)

        const updatedClub = await prisma.club.findUnique({ where: { id: club.id } })
        expect(updatedClub?.lat).toBeCloseTo(40.4168)
        expect(updatedClub?.lng).toBeCloseTo(-3.7038)
        expect(updatedClub?.stadium).toBe('Estadio Manual')
        expect(updatedClub?.city).toBe('Madrid')

        const facts = await prisma.sourcedFact.findMany({ where: { entityType: 'CLUB', entityId: club.id, source: 'manual' } })
        expect(facts.length).toBe(4)
        expect(facts.every((f) => f.licence === 'manual' && f.confidence === 1 && f.applied)).toBe(true)
      } finally {
        await prisma.sourcedFact.deleteMany({ where: { entityType: 'CLUB', entityId: club.id } })
        await prisma.club.deleteMany({ where: { id: club.id } })
      }
    })
  })
})
