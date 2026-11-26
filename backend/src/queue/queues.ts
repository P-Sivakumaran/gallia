import { Queue } from 'bullmq'
import { createRedisConnection } from './connection.js'

export type IngestJobData =
  | { source: 'sportmonks' }
  | { source: 'rss'; feedUrl: string; sourceName: string }
  | { source: 'apifootball' }
  | { source: 'crawl'; url: string; sourceName: string; defaultReliability?: number; cssSelector?: string }

export type CrawlJobData = {
  url: string
  sourceName: string
  rawSignalId?: number
  rumourId?: number
  defaultReliability?: number
  cssSelector?: string
}

export type ScoreJobData = { rumourId: number }

export type DedupeJobData = {
  playerId: number
  fromClubId: number
  toClubId: number
  newRumourId: number
}

export type EnrichJobData = {
  playerId: number
  playerName: string
}

export type PlayerSyncJobData = Record<string, never>

export type MaintenanceJobData =
  | { task: 'purge-product-events' }
  | { task: 'resolve-window-outcomes' }
  | { task: 'football-tick' }

const defaultOpts = { connection: createRedisConnection() }

export const ingestQueue = new Queue<IngestJobData>('ingest', {
  ...defaultOpts,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
})

export const scoreQueue = new Queue<ScoreJobData>('score', {
  ...defaultOpts,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2_000 },
    removeOnComplete: 100,
  },
})

export const dedupeQueue = new Queue<DedupeJobData>('dedupe', {
  ...defaultOpts,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 100,
  },
})

export const enrichQueue = new Queue<EnrichJobData>('enrich', {
  ...defaultOpts,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 }, // back off on rate-limit
    removeOnComplete: 200,
    removeOnFail: 100,
  },
})

// Deep web crawl queue (Crawl4AI) — throttled to prevent headless browser exhaustion
export const crawlQueue = new Queue<CrawlJobData>('crawl', {
  ...defaultOpts,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

// Separate from ingestQueue (concurrency 3) so two overlapping player-sync
// runs can never race on the adopt-by-name reconciliation step.
export const playerSyncQueue = new Queue<PlayerSyncJobData>('player-sync', {
  ...defaultOpts,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: 20,
    removeOnFail: 20,
  },
})

// Public-beta readiness (2026-08-14) — the ProductEvent retention purge.
// A separate queue rather than reusing an existing one: this is
// operational housekeeping, not domain ingestion work, and shouldn't
// compete for the same concurrency budget.
export const maintenanceQueue = new Queue<MaintenanceJobData>('maintenance', {
  ...defaultOpts,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 30,
    removeOnFail: 30,
  },
})
