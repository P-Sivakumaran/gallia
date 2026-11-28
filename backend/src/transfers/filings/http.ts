import { FILING_CHANNELS } from './portals.js'

/**
 * HTTP for filing channels (model-first ingest, owner 2026-11-28).
 *
 * Every request names its channel and must hit a host listed for that channel.
 * Terms `access` statuses stay on the channel as a factual record, but they no
 * longer block fetches: Gallia is private modeling for now and needs volume.
 * Public-facing licence gates can return later.
 *
 * Requests to one host are spaced at least `minGapMs` apart (2 s default).
 */
export const FILINGS_USER_AGENT = 'Gallia transfer research (+https://github.com/P-Sivakumaran/gallia)'
const DEFAULT_GAP_MS = 2000
const lastRequestAt = new Map<string, number>()

export class FetchNotAllowedError extends Error {}

export function assertFetchAllowed(channelId: string, url: string): void {
  const channel = FILING_CHANNELS[channelId]
  if (!channel) throw new FetchNotAllowedError(`Unknown filing channel "${channelId}"`)
  const host = new URL(url).host
  if (!channel.hosts.includes(host)) {
    throw new FetchNotAllowedError(`Host ${host} is not part of channel "${channelId}" (${channel.hosts.join(', ')})`)
  }
  if (channel.access !== 'CLEARED') {
    console.warn(
      `[filings] fetching ${channelId} (${channel.access}) for modeling; terms note: ${channel.termsUrl ?? 'unread'}`,
    )
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function waitTurn(host: string, minGapMs: number): Promise<void> {
  const last = lastRequestAt.get(host) ?? 0
  const wait = last + minGapMs - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt.set(host, Date.now())
}

export interface FilingFetchOptions {
  userAgent?: string
  minGapMs?: number
  accept?: string
}

export async function fetchFiling(channelId: string, url: string, opts: FilingFetchOptions = {}): Promise<Response> {
  assertFetchAllowed(channelId, url)
  await waitTurn(new URL(url).host, opts.minGapMs ?? DEFAULT_GAP_MS)
  const res = await fetch(url, {
    headers: { 'User-Agent': opts.userAgent ?? FILINGS_USER_AGENT, ...(opts.accept ? { Accept: opts.accept } : {}) },
    redirect: 'manual',
  })
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (!location) throw new Error(`Redirect without location from ${url}`)
    // Follow only within the same channel's host list.
    return fetchFiling(channelId, new URL(location, url).toString(), opts)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res
}

export async function fetchFilingJson<T>(channelId: string, url: string, opts: FilingFetchOptions = {}): Promise<T> {
  const res = await fetchFiling(channelId, url, { ...opts, accept: 'application/json' })
  return (await res.json()) as T
}

export async function fetchFilingBuffer(channelId: string, url: string, opts: FilingFetchOptions = {}): Promise<Buffer> {
  const res = await fetchFiling(channelId, url, opts)
  return Buffer.from(await res.arrayBuffer())
}
