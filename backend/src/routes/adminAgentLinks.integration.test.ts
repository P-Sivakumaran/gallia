import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import 'express-async-errors'
import express from 'express'
import cookieParser from 'cookie-parser'
import type { Server } from 'http'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import adminRouter from './admin.js'
import playersRouter from './players.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'
const prisma = new PrismaClient()
const RUN_ID = `ADM_AGT_${Date.now()}`
const ARTICLE = 'https://football-italia.net/report-leao-offered-to-roma/'

let server: Server
let baseUrl: string
let adminUserId: number
let nonAdminUserId: number
let playerId: number

const cookieFor = (userId: number) => `token=${jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' })}`

type LinkJson = { error?: string; linkId: number }
type PublicLink = { agent: { name: string; kind: string; agency: string | null }; citations: { host: string; quote: string | null }[] }

async function post(path: string, body: unknown, userId = adminUserId) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieFor(userId) },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  adminUserId = (await prisma.user.create({ data: { email: `${RUN_ID}-admin@test.com`, passwordHash: 'x', role: 'ADMIN' } })).id
  nonAdminUserId = (await prisma.user.create({ data: { email: `${RUN_ID}-user@test.com`, passwordHash: 'x', role: 'USER' } })).id
  playerId = (await prisma.player.create({ data: { name: `${RUN_ID} Rafael Leao` } })).id

  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/admin', adminRouter)
  app.use('/players', playersRouter)
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()) })
  const address = server.address()
  baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  const links = await prisma.playerAgent.findMany({ where: { playerId }, select: { id: true } })
  await prisma.sourcedFact.deleteMany({ where: { entityType: 'PLAYER_AGENT', entityId: { in: links.map((l) => l.id) } } })
  await prisma.adminAuditEvent.deleteMany({ where: { actingAdminUserId: { in: [adminUserId, nonAdminUserId] } } })
  await prisma.playerAgent.deleteMany({ where: { playerId } })
  await prisma.agent.deleteMany({ where: { name: { startsWith: RUN_ID } } })
  await prisma.player.delete({ where: { id: playerId } })
  await prisma.user.deleteMany({ where: { email: { startsWith: RUN_ID } } })
  await prisma.$disconnect()
})

describe('admin agent links', () => {
  const agentName = () => `${RUN_ID} Jorge Mendes`

  it('403s for a non-admin', async () => {
    const res = await post('/admin/agent-links', {}, nonAdminUserId)
    expect(res.status).toBe(403)
  })

  it('rejects a Google News redirect as a citation', async () => {
    const res = await post('/admin/agent-links', {
      playerId, agentName: agentName(), agentKind: 'PERSON', role: 'REPRESENTS', sourceUrl: 'https://news.google.com/rss/articles/CBMi',
    })
    expect(res.status).toBe(400)
    expect(((await res.json()) as LinkJson).error).toMatch(/publisher/)
  })

  it('creates a link with its citation, then adds a second citation instead of a duplicate link', async () => {
    const first = await post('/admin/agent-links', {
      playerId, agentName: agentName(), agentKind: 'PERSON', agencyName: `${RUN_ID} Gestifute`, role: 'REPRESENTS',
      sourceUrl: `${ARTICLE}?utm_source=x`, quote: 'agent Jorge Mendes proposed Leao',
    })
    expect(first.status).toBe(201)
    const a = (await first.json()) as LinkJson

    const again = await post('/admin/agent-links', { playerId, agentName: agentName().toUpperCase(), agentKind: 'PERSON', role: 'REPRESENTS', sourceUrl: ARTICLE })
    expect(again.status).toBe(409) // same article (tracking params dropped), same link

    const second = await post('/admin/agent-links', {
      playerId, agentName: agentName(), agentKind: 'PERSON', role: 'REPRESENTS', sourceUrl: 'https://www.marca.com/futbol/leao.html',
    })
    expect(second.status).toBe(200)
    expect(((await second.json()) as LinkJson).linkId).toBe(a.linkId)

    const pub = (await (await fetch(`${baseUrl}/players/${playerId}/agents`)).json()) as PublicLink[]
    expect(pub).toHaveLength(1)
    expect(pub[0].agent).toMatchObject({ name: agentName(), kind: 'PERSON', agency: `${RUN_ID} Gestifute` })
    expect(pub[0].citations.map((c) => c.host).sort()).toEqual(['football-italia.net', 'marca.com'])
    expect(pub[0].citations.find((c) => c.host === 'football-italia.net')?.quote).toMatch(/Mendes/)

    const audit = await prisma.adminAuditEvent.findMany({ where: { actingAdminUserId: adminUserId, targetType: 'PLAYER_AGENT' } })
    expect(audit.map((e) => e.actionType)).toEqual(['AGENT_LINK_ADD', 'AGENT_LINK_ADD'])
  })

  it('removes a link: citations superseded, not deleted, and the public list is empty', async () => {
    const [link] = await prisma.playerAgent.findMany({ where: { playerId } })
    const res = await fetch(`${baseUrl}/admin/agent-links/${link.id}`, { method: 'DELETE', headers: { Cookie: cookieFor(adminUserId) } })
    expect(res.status).toBe(200)
    const facts = await prisma.sourcedFact.findMany({ where: { entityType: 'PLAYER_AGENT', entityId: link.id } })
    expect(facts.length).toBeGreaterThan(0)
    expect(facts.every((f) => f.supersededAt)).toBe(true)
    expect(await (await fetch(`${baseUrl}/players/${playerId}/agents`)).json()).toEqual([])
  })
})
