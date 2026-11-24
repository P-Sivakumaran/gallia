import { Router, type Request, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { rateLimitMiddleware } from '../lib/rateLimit.js'
import { loadGalliaWorkspace } from '../gallia/workspace.js'

// Public, read-only: the Gallia desk is a public website, so no auth or entitlement gate.
const router = Router()
const prisma = new PrismaClient()

const workspaceLimit = rateLimitMiddleware({
  keyFn: (req: { ip?: string }) => `gallia:workspace:${req.ip ?? 'unknown'}`,
  limit: 120,
  windowSeconds: 60,
  failureMode: 'OPEN',
})

router.get('/workspace', workspaceLimit, async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=15')
  res.json(await loadGalliaWorkspace(prisma))
})

export default router
