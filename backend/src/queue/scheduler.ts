/**
 * BullMQ v5 job scheduler — uses upsertJobScheduler (replaces deprecated repeat API).
 */
import { ingestQueue, playerSyncQueue, maintenanceQueue } from './queues.js'
import { RSS_FEEDS } from '../ingestion/sources/rss.js'

const _parsedMinutes = parseInt(process.env.RUMOUR_INGEST_INTERVAL_MINUTES ?? '30', 10)
const INTERVAL_MS =
  Number.isNaN(_parsedMinutes) || _parsedMinutes <= 0 ? 30 * 60 * 1000 : _parsedMinutes * 60 * 1000

const _parsedHours = parseInt(process.env.PLAYER_SYNC_INTERVAL_HOURS ?? '24', 10)
const PLAYER_SYNC_INTERVAL_MS =
  Number.isNaN(_parsedHours) || _parsedHours <= 0 ? 24 * 60 * 60 * 1000 : _parsedHours * 60 * 60 * 1000

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000 // daily, per task spec — not env-configurable (retention *days* is; the run *cadence* isn't)

const BOOT_SYNC_SKIP_MS = 20 * 60 * 60 * 1000

export function isRecentRun(finishedOn: number | undefined, now = Date.now(), skipMs = BOOT_SYNC_SKIP_MS): boolean {
  return finishedOn !== undefined && now - finishedOn < skipMs
}

async function shouldRunBootPlayerSync(): Promise<boolean> {
  // Newest completed job first (asc = false).
  const [last] = await playerSyncQueue.getJobs(['completed'], 0, 0, false)
  return !isRecentRun(last?.finishedOn)
}

export async function scheduleRecurringJobs(): Promise<void> {
  // upsertJobScheduler is idempotent — safe to call on every startup
  // Sportmonks is no longer used (owner, 2026-11-25): its plan only covered
  // UEFA club competitions. Current clubs come from TheStatsAPI (player-sync).
  // Remove the scheduler left in Redis from earlier boots; upsert never does.
  await ingestQueue.removeJobScheduler('sportmonks-recurring')

  await ingestQueue.upsertJobScheduler(
    'apifootball-recurring',
    { every: INTERVAL_MS },
    { name: 'apifootball', data: { source: 'apifootball' } },
  )

  for (const feed of RSS_FEEDS) {
    await ingestQueue.upsertJobScheduler(
      `rss-${feed.name}-recurring`,
      { every: INTERVAL_MS },
      { name: `rss-${feed.name}`, data: { source: 'rss', feedUrl: feed.url, sourceName: feed.name } },
    )
  }

  await playerSyncQueue.upsertJobScheduler(
    'player-sync-recurring',
    { every: PLAYER_SYNC_INTERVAL_MS },
    { name: 'player-sync', data: {} },
  )

  // Public-beta readiness (2026-08-14) — ProductEvent retention purge.
  // See analytics/retention.ts / docs/data-retention.md.
  await maintenanceQueue.upsertJobScheduler(
    'purge-product-events-recurring',
    { every: PURGE_INTERVAL_MS },
    { name: 'purge-product-events', data: { task: 'purge-product-events' } },
  )

  // Real outcomes resolution (Milestone 2) — automatically resolves pending
  // rumours once their transfer window closing deadline has elapsed.
  await maintenanceQueue.upsertJobScheduler(
    'resolve-window-outcomes-recurring',
    { every: PURGE_INTERVAL_MS },
    { name: 'resolve-window-outcomes', data: { task: 'resolve-window-outcomes' } },
  )

  // Football data (docs/football-data-plan.md): an hourly tick that decides what is worth a
  // TheStatsAPI request (fixtures, settled matches, gameweek snapshots, weekly squads). Opt-in so
  // environments without the key never spend quota; the tick paces itself within the shared quota.
  if (process.env.FOOTBALL_SYNC_ENABLED === '1') {
    await maintenanceQueue.upsertJobScheduler(
      'football-tick-recurring',
      { every: 60 * 60 * 1000 },
      { name: 'football-tick', data: { task: 'football-tick' } },
    )
  } else {
    await maintenanceQueue.removeJobScheduler('football-tick-recurring')
  }

  // upsertJobScheduler only ever adds/updates — it never removes a scheduler
  // for a feed that's since been renamed or deleted from RSS_FEEDS. Found
  // live (2026-08-13): "Goal.com" and "Football365" kept firing every
  // interval and 404ing forever, long after they'd been removed from the
  // source array, because their `rss-<name>-recurring` schedulers were still
  // sitting in Redis from whenever they were first registered. Sweep those
  // orphans out on every boot instead of leaving them to run forever.
  const currentRssSchedulerIds = new Set(RSS_FEEDS.map((f) => `rss-${f.name}-recurring`))
  const existingSchedulers = await ingestQueue.getJobSchedulers()
  for (const s of existingSchedulers) {
    if (s.key.startsWith('rss-') && s.key.endsWith('-recurring') && !currentRssSchedulerIds.has(s.key)) {
      await ingestQueue.removeJobScheduler(s.key)
      console.log(`[scheduler] Removed orphaned RSS job scheduler: ${s.key}`)
    }
  }

  // Fire all sources immediately on startup
  // The player sync spends requests from TheStatsAPI key Overround also
  // uses (12/min shared). `tsx watch` restarts the backend on every file
  // change, and each restart used to fire a full sync (5 runs, ~150
  // requests, on 2026-11-25). Only sync on boot when the last completed
  // run is older than the skip window.
  if (await shouldRunBootPlayerSync()) {
    await playerSyncQueue.add('player-sync-boot', {})
  } else {
    console.log('[scheduler] Skipping boot player-sync: last run is recent')
  }
  await ingestQueue.add('apifootball-boot', { source: 'apifootball' })
  // Purge is idempotent (runRetentionPurge only ever deletes rows already
  // past the cutoff) — safe to also fire once on boot rather than waiting
  // up to 24h for the first scheduled run.
  await maintenanceQueue.add('purge-product-events-boot', { task: 'purge-product-events' })
  await maintenanceQueue.add('resolve-window-outcomes-boot', { task: 'resolve-window-outcomes' })
  for (const feed of RSS_FEEDS) {
    await ingestQueue.add(`rss-${feed.name}-boot`, {
      source: 'rss',
      feedUrl: feed.url,
      sourceName: feed.name,
    })
  }

  console.log(
    `[scheduler] Job schedulers registered — ingest interval: ${INTERVAL_MS / 60000}m, player-sync interval: ${PLAYER_SYNC_INTERVAL_MS / 3600000}h`,
  )
}
