import { Worker } from 'bullmq'
import { PrismaClient, RumourStatus, SourceType } from '@prisma/client'
import { createRedisConnection } from './connection.js'
import {
  scoreQueue, dedupeQueue, enrichQueue, crawlQueue,
  type IngestJobData, type ScoreJobData, type DedupeJobData, type EnrichJobData, type PlayerSyncJobData,
  type MaintenanceJobData, type CrawlJobData,
} from './queues.js'
import { fetchLatestRumours } from '../ingestion/sportmonks.js'
import { fetchRSSSignals, RSS_FEEDS } from '../ingestion/sources/rss.js'
import { fetchApiFootballTransfers } from '../ingestion/sources/apifootball.js'
import { extractRumoursFromText } from '../ingestion/entityMatcher.js'
import { computeScore } from '../scoring/likelihoodEngine.js'
import { broadcast } from '../sse/broadcaster.js'
import { applyOutcome, resolveWindowOutcomes } from '../ingestion/outcomeDetector.js'
import { crawlUrl } from '../ingestion/sources/crawl4ai.js'
import { runPlayerEnrichment } from '../ingestion/enrichment.js'
import { runPlayerClubSyncWithPrisma } from '../ingestion/playerClubSync.js'
import { runStatsApiClubSyncWithPrisma } from '../ingestion/statsApiClubSync.js'
import { runRetentionPurge, type RetentionDb, type PurgeHealthDb } from '../analytics/retention.js'
import { logOperationalEvent, type OperationalEventDb } from '../analytics/operationalEvents.js'
import { licenceWarning } from '../sources/licences.js'
import { pacedClient } from '../footballData/factory.js'
import { runFootballTick } from '../footballData/tick.js'

const prisma = new PrismaClient()

async function ensureSource(name: string, reliability: number): Promise<number> {
  const existing = await prisma.source.findFirst({ where: { name } })
  if (existing) return existing.id
  const created = await prisma.source.create({
    data: { name, type: SourceType.AGGREGATOR, reliabilityScore: reliability },
  })
  return created.id
}

// ─── Contradiction check ─────────────────────────────────────────────────────

async function linkContradiction(newRumourId: number, playerId: number, toClubId: number): Promise<number | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const conflicting = await prisma.rumour.findFirst({
    where: {
      playerId,
      toClubId: { not: toClubId },
      status: { in: [RumourStatus.PENDING, RumourStatus.HOT] },
      rumourDate: { gte: thirtyDaysAgo },
      id: { not: newRumourId },
    },
    orderBy: { computedLikelihood: 'desc' },
  })
  if (!conflicting) return null

  await prisma.rumour.update({
    where: { id: newRumourId },
    data: { contradicts: conflicting.id },
  })
  console.log(`[workers] Contradiction: rumour ${newRumourId} contradicts ${conflicting.id} (same player, different destination)`)
  return conflicting.id
}

// ─── Ingest worker ─────────────────────────────────────────────────────────

async function processIngest(job: { data: IngestJobData }) {
  const { source } = job.data
  console.log(`[worker:ingest] source=${source}`)

  if (source === 'sportmonks') {
    const rumours = await fetchLatestRumours()
    for (const r of rumours) await upsertNormalizedRumour(r)
    return { processed: rumours.length }
  }

  if (source === 'apifootball') {
    const rumours = await fetchApiFootballTransfers()
    for (const r of rumours) await upsertNormalizedRumour(r)
    return { processed: rumours.length }
  }

  if (source === 'rss') {
    const { feedUrl, sourceName } = job.data as Extract<IngestJobData, { source: 'rss' }>
    const feedMeta = RSS_FEEDS.find((f) => f.name === sourceName)
    const defaultReliability = feedMeta?.defaultReliability ?? 0.50

    const signals = await fetchRSSSignals(feedUrl, sourceName)
    // Licence registry: record now, enforce later (docs/news-scanner-plan.md Phase A).
    const licenceNote = licenceWarning(sourceName)
    if (licenceNote) console.warn(licenceNote)
    let matched = 0
    const enrichedPlayers = new Set<number>() // avoid duplicate enrich jobs per batch

    for (const signal of signals) {
      // 0. Skip feed items we've already ingested — RSS feeds re-serve the same
      // ~20-50 items on every poll, and without this check every cron tick
      // re-runs entity extraction on identical text, flooding rumours with dupes.
      if (signal.link) {
        const alreadySeen = await prisma.rawSignal.findFirst({ where: { link: signal.link } })
        if (alreadySeen) continue
      }

      // 1. Persist raw signal
      const raw = await prisma.rawSignal.create({
        data: {
          sourceName: signal.sourceName,
          feedUrl: signal.feedUrl,
          headline: signal.headline,
          summary: signal.summary,
          link: signal.link,
          publishedAt: signal.publishedAt,
          rawText: signal.rawText,
          impliedReliability: signal.impliedReliability,
          matched: false,
        },
      })


      // 3. Extract entities and match/create rumours
      const candidates = await extractRumoursFromText(signal.headline, signal.summary)

      const reliability = signal.impliedReliability ?? defaultReliability
      const sourceId = await ensureSource(sourceName, reliability)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      let matchedRumourId: number | null = null

      for (const candidate of candidates) {
        const existing = await prisma.rumour.findFirst({
          where: {
            playerId: candidate.playerId,
            fromClubId: candidate.fromClubId,
            toClubId: candidate.toClubId,
            rumourDate: { gte: sevenDaysAgo },
          },
        })

        if (existing) {
          matchedRumourId = existing.id
          await prisma.rumour.update({
            where: { id: existing.id },
            data: { distinctSourceCount: { increment: 1 } },
          })
          await scoreQueue.add('score', { rumourId: existing.id })

          // Apply outcome to existing rumour if detected
        } else {
          const rumour = await prisma.rumour.create({
            data: {
              playerId: candidate.playerId,
              fromClubId: candidate.fromClubId,
              fromClubInferred: candidate.fromClubInferred,
              toClubId: candidate.toClubId,
              sourceId,
              baseProbability: candidate.confidence,
              window: signal.window,
              rumourDate: signal.publishedAt,
              computedLikelihood: 0,
              notes: signal.headline,
              // Always start PENDING. Outcome wording in the text is a review signal
              // (GET /admin/rumours/awaiting-review), never a resolution.
              status: RumourStatus.PENDING,
            },
          })
          matchedRumourId = rumour.id
          await scoreQueue.add('score', { rumourId: rumour.id })

          // Apply outcome explicitly so hitCount/reliability are credited

          // Check for contradictions with other rumours for the same player
          const contradictsId = await linkContradiction(rumour.id, candidate.playerId, candidate.toClubId)

          broadcast('rumour:new', {
            id: rumour.id,
            player: candidate.playerName,
            from: candidate.fromClubName,
            to: candidate.toClubName,
            source: sourceName,
            contradicted: contradictsId !== null,
          })
        }

        // Queue enrichment for auto-created players (once per player per ingest batch)
        if (candidate.autoCreated && !enrichedPlayers.has(candidate.playerId)) {
          enrichedPlayers.add(candidate.playerId)
          await enrichQueue.add('enrich', {
            playerId: candidate.playerId,
            playerName: candidate.playerName,
          }, {
            // Deduplicate by player id — don't enrich the same player twice in parallel
            jobId: `enrich-player-${candidate.playerId}`,
          })
        }

        matched++
      }

      // Outcome fallback: confirmation headlines that only name destination club
      // produce 0 candidates (need 2 clubs for tuple extraction) — look up by mention

      if (candidates.length > 0) {
        await prisma.rawSignal.update({
          where: { id: raw.id },
          data: { matched: true, rumourId: matchedRumourId },
        })
      } else if (signal.link && signal.link.startsWith('http')) {
        // High-value signal had 0 candidate matches from brief RSS summary/headline alone:
        // Dispatch to Crawl4AI to fetch the full article body and re-extract entities.
        await crawlQueue.add('deep-crawl', {
          url: signal.link,
          sourceName,
          rawSignalId: raw.id,
          defaultReliability: reliability,
        }, {
          jobId: `crawl-raw-${raw.id}`,
        })
      }
    }

    console.log(`[worker:ingest] ${sourceName}: ${signals.length} signals, ${matched} matched`)
    broadcast('rss:signals', { source: sourceName, total: signals.length, matched })
    return { signals: signals.length, matched }
  }
}

async function upsertNormalizedRumour(r: Awaited<ReturnType<typeof fetchLatestRumours>>[0]) {
  const player = await prisma.player.findFirst({ where: { externalId: r.playerExternalId } })
  const fromClub = await prisma.club.findFirst({ where: { externalId: r.fromClubExternalId } })
  const toClub = await prisma.club.findFirst({ where: { externalId: r.toClubExternalId } })

  if (!player || !fromClub || !toClub) return

  const sourceId = await ensureSource('Sportmonks Aggregator', 0.70)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const existing = await prisma.rumour.findFirst({
    where: {
      playerId: player.id,
      fromClubId: fromClub.id,
      toClubId: toClub.id,
      rumourDate: { gte: sevenDaysAgo },
    },
  })

  if (existing) {
    if (r.baseProbability === 1.0) {
      await applyOutcome(existing.id, 'COMPLETED', prisma)
      broadcast('rumour:updated', { id: existing.id, status: 'COMPLETED' })
      return
    }
    await prisma.rumour.update({
      where: { id: existing.id },
      data: { distinctSourceCount: { increment: 1 } },
    })
    await dedupeQueue.add('merge', {
      playerId: player.id,
      fromClubId: fromClub.id,
      toClubId: toClub.id,
      newRumourId: existing.id,
    })
    await scoreQueue.add('score', { rumourId: existing.id })
    return
  }

  const rumour = await prisma.rumour.upsert({
    where: { externalId: r.externalId },
    update: {},
    create: {
      externalId: r.externalId,
      playerId: player.id,
      fromClubId: fromClub.id,
      toClubId: toClub.id,
      sourceId,
      reportedFeeMin: r.reportedFeeMin,
      reportedFeeMax: r.reportedFeeMax,
      currency: r.currency,
      baseProbability: r.baseProbability,
      window: r.window,
      rumourDate: r.rumourDate,
      computedLikelihood: r.baseProbability === 1.0 ? 100 : 0,
      status: r.baseProbability === 1.0 ? RumourStatus.COMPLETED : RumourStatus.PENDING,
    },
  })

  if (r.baseProbability === 1.0) {
    await applyOutcome(rumour.id, 'COMPLETED', prisma)
    broadcast('rumour:new', { id: rumour.id })
    broadcast('rumour:updated', { id: rumour.id, status: 'COMPLETED' })
  } else {
    await scoreQueue.add('score', { rumourId: rumour.id })
    broadcast('rumour:new', { id: rumour.id })
  }
}

// ─── Score worker ───────────────────────────────────────────────────────────

async function processScore(job: { data: ScoreJobData }) {
  const rumour = await prisma.rumour.findUnique({
    where: { id: job.data.rumourId },
    include: { player: true, source: true },
  })
  if (!rumour) return

  // Don't overwrite a terminal outcome with a score recalculation
  if (
    rumour.status === RumourStatus.COMPLETED ||
    rumour.status === RumourStatus.FAILED ||
    rumour.status === RumourStatus.DENIED
  ) return

  const now = new Date()
  const contractEnd = rumour.player.contractEnd
  const monthsToExpiry = contractEnd
    ? (contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    : null

  const scoringInputs = {
    sourceReliability: rumour.source?.reliabilityScore ?? 0.5,
    monthsToContractExpiry: monthsToExpiry,
    reportedFeeMin: rumour.reportedFeeMin,
    reportedFeeMax: rumour.reportedFeeMax,
    marketValue: rumour.player.marketValue,
    clubNeedScore: 0.6,
    distinctSourceCount: rumour.distinctSourceCount,
    baseProbability: rumour.baseProbability,
  }

  const { score, source: scoreSource } = await computeScore(scoringInputs)

  const newStatus: RumourStatus = score >= 70 ? RumourStatus.HOT : RumourStatus.PENDING

  await prisma.rumour.update({
    where: { id: rumour.id },
    data: { computedLikelihood: score, status: newStatus },
  })
  await prisma.rumourHistory.create({
    data: { rumourId: rumour.id, computedLikelihood: score, status: newStatus },
  })
  await prisma.scoringSnapshot.create({
    data: { rumourId: rumour.id, ...scoringInputs, score, scoreSource },
  })

  broadcast('rumour:updated', { id: rumour.id, computedLikelihood: score, status: newStatus })
  return { rumourId: rumour.id, score }
}

// ─── Dedupe worker ──────────────────────────────────────────────────────────

async function processDedupe(job: { data: DedupeJobData }) {
  console.log(`[worker:dedupe] Merged sources for rumour ${job.data.newRumourId}`)
}

// ─── Enrich worker ──────────────────────────────────────────────────────────

async function processEnrich(job: { data: EnrichJobData }) {
  const { playerId, playerName } = job.data

  // Skip if already enriched recently (within 7 days)
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { enrichedAt: true } })
  if (player?.enrichedAt) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (player.enrichedAt > sevenDaysAgo) {
      console.log(`[worker:enrich] Skipping "${playerName}" — enriched ${player.enrichedAt.toISOString()}`)
      return
    }
  }

  await runPlayerEnrichment(playerId, playerName, prisma)
}

async function processPlayerSync(_job: { data: PlayerSyncJobData }) {
  // TheStatsAPI is the current-club source when its key is set; the
  // Sportmonks catalog (UEFA competitions only) is the fallback.
  const statsKey = process.env.STATS_API_KEY
  if (statsKey) {
    console.log('[worker:player-sync] starting (TheStatsAPI, open-rumour players)')
    const summary = await runStatsApiClubSyncWithPrisma(prisma, statsKey)
    console.log(
      `[worker:player-sync] done — checked=${summary.checked} updated=${summary.updated} unchanged=${summary.unchanged} unmatched=${summary.unmatched} ambiguous=${summary.ambiguous} noTeam=${summary.noTeam} errors=${summary.errors}${summary.rateLimited ? ' (stopped: rate limited)' : ''}`,
    )
    return summary
  }
  console.log('[worker:player-sync] starting (Sportmonks catalog)')
  const result = await runPlayerClubSyncWithPrisma(prisma)
  console.log(`[worker:player-sync] done — clubs=${result.clubs} players=${result.players}`)
  return result
}

// ─── Maintenance worker (public-beta readiness, 2026-08-14) ────────────────

async function processMaintenance(job: { data: MaintenanceJobData }) {
  if (job.data.task === 'football-tick') {
    const api = await pacedClient(prisma)
    const summary = await runFootballTick(prisma, api, Date.now(), (m) => console.log(`[worker:football] ${m}`))
    console.log(`[worker:football] tick ${JSON.stringify(summary)}`)
    return summary
  }

  if (job.data.task === 'resolve-window-outcomes') {
    const summary = await resolveWindowOutcomes(prisma)
    console.log(
      `[worker:maintenance] Window outcome resolution: checked=${summary.checked}, resolved=${summary.resolved} (${summary.completed} completed, ${summary.awaitingReview} awaiting owner review)`,
    )
    return summary
  }

  if (job.data.task !== 'purge-product-events') return

  const result = await runRetentionPurge(prisma as unknown as RetentionDb & PurgeHealthDb)
  const opDb = prisma as unknown as OperationalEventDb

  if (result.succeeded) {
    console.log(`[worker:maintenance] Purged ${result.deletedCount} ProductEvent rows older than ${result.cutoff.toISOString()}.`)
    await logOperationalEvent(opDb, { eventType: 'RETENTION_PURGE_SUCCESS', deletedCount: result.deletedCount })
  } else {
    console.error(`[worker:maintenance] Retention purge failed: ${result.error}`)
    await logOperationalEvent(opDb, { eventType: 'RETENTION_PURGE_FAILURE', reason: result.error ?? 'unknown' })
    // Surface the failure to BullMQ too (retried per the queue's own
    // attempts/backoff config) — visible through the queue's own
    // failed-job listing, on top of PurgeHealth and OperationalEvent.
    throw new Error(result.error ?? 'Retention purge failed')
  }
}

// ─── Process Crawl (Crawl4AI) ────────────────────────────────────────────────

export async function processCrawl(job: { data: CrawlJobData }): Promise<{ matched: number }> {
  const { url, sourceName, rawSignalId, defaultReliability, cssSelector } = job.data
  console.log(`[worker:crawl] Deep crawling "${url}" from ${sourceName}...`)

  const crawlResult = await crawlUrl(url, {
    cssSelector,
    wordCountThreshold: 10,
    timeoutMs: 30_000,
  })

  if (!crawlResult.success || !crawlResult.markdown) {
    console.warn(`[worker:crawl] Failed to crawl "${url}": ${crawlResult.errorMessage}`)
    return { matched: 0 }
  }

  const articleMarkdown = crawlResult.markdown
  const articleTitle = crawlResult.title ?? sourceName

  // Update raw signal if one was passed
  if (rawSignalId) {
    await prisma.rawSignal.update({
      where: { id: rawSignalId },
      data: {
        rawText: `${articleTitle}\n\n${articleMarkdown}`.slice(0, 10000),
      },
    })
  }


  // Extract entities from the deeper markdown text
  const candidates = await extractRumoursFromText(articleTitle, articleMarkdown.slice(0, 4000))
  if (candidates.length === 0) {
    console.log(`[worker:crawl] No rumour candidates found in full article (${url}).`)
    return { matched: 0 }
  }

  const reliability = defaultReliability ?? 0.70
  const sourceId = await ensureSource(sourceName, reliability)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  let matched = 0

  for (const candidate of candidates) {
    const existing = await prisma.rumour.findFirst({
      where: {
        playerId: candidate.playerId,
        fromClubId: candidate.fromClubId,
        toClubId: candidate.toClubId,
        rumourDate: { gte: sevenDaysAgo },
      },
    })

    if (existing) {
      await prisma.rumour.update({
        where: { id: existing.id },
        data: { distinctSourceCount: { increment: 1 } },
      })
      await scoreQueue.add('score', { rumourId: existing.id })
    } else {
      const rumour = await prisma.rumour.create({
        data: {
          playerId: candidate.playerId,
          fromClubId: candidate.fromClubId,
          fromClubInferred: candidate.fromClubInferred,
          toClubId: candidate.toClubId,
          sourceId,
          baseProbability: candidate.confidence,
          window: 'SUMMER',
          rumourDate: new Date(),
          computedLikelihood: 0,
          notes: articleTitle.slice(0, 255),
          status: RumourStatus.PENDING,
        },
      })
      await scoreQueue.add('score', { rumourId: rumour.id })

      await linkContradiction(rumour.id, candidate.playerId, candidate.toClubId)
      broadcast('rumour:new', {
        id: rumour.id,
        player: candidate.playerName,
        from: candidate.fromClubName,
        to: candidate.toClubName,
        source: `${sourceName} (Crawl4AI)`,
      })
    }

    if (candidate.autoCreated) {
      await enrichQueue.add('enrich', {
        playerId: candidate.playerId,
        playerName: candidate.playerName,
      }, {
        jobId: `enrich-player-${candidate.playerId}`,
      })
    }

    matched++
  }

  if (rawSignalId && matched > 0) {
    await prisma.rawSignal.update({
      where: { id: rawSignalId },
      data: { matched: true },
    })
  }

  console.log(`[worker:crawl] Finished "${url}": extracted ${matched} rumour candidates.`)
  return { matched }
}

// ─── Start all workers ──────────────────────────────────────────────────────

export function startWorkers(): void {
  const conn = createRedisConnection()
  new Worker<IngestJobData>('ingest', processIngest as any, { connection: conn, concurrency: 3 })
  new Worker<ScoreJobData>('score', processScore as any, { connection: conn, concurrency: 10 })
  new Worker<DedupeJobData>('dedupe', processDedupe as any, { connection: conn, concurrency: 2 })
  new Worker<EnrichJobData>('enrich', processEnrich as any, { connection: conn, concurrency: 1 }) // 1 at a time to be polite to Wikidata
  // concurrency 1 — a second overlapping run could race on the adopt-by-name reconciliation step
  new Worker<PlayerSyncJobData>('player-sync', processPlayerSync as any, { connection: conn, concurrency: 1 })
  new Worker<MaintenanceJobData>('maintenance', processMaintenance as any, { connection: conn, concurrency: 1 })
  // Crawl4AI worker: concurrency 2 to bound headless Chromium memory usage
  new Worker<CrawlJobData>('crawl', processCrawl as any, { connection: conn, concurrency: 2 })
  console.log('[workers] Ingest, score, dedupe, enrich, player-sync, maintenance, crawl workers started.')
}
