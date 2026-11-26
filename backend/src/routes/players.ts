import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { handleGetPlayer, handleSearchPlayers } from '../controllers/playersController.js'
import { listPlayerAgents } from '../agents/agentLinks.js'

const router = Router()

router.get('/search', handleSearchPlayers)
router.get('/:id', handleGetPlayer)

const prisma = new PrismaClient()

// GET /players/:id/agents — cited agent links (admin-entered from news articles; every link shows its sources)
router.get('/:id/agents', async (req, res) => {
  const playerId = parseInt(req.params.id, 10)
  if (isNaN(playerId)) { res.status(400).json({ error: 'Invalid player id' }); return }
  res.json(await listPlayerAgents(prisma, playerId))
})

export default router
