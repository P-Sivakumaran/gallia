import { describe, it, expect, vi, beforeEach } from 'vitest'
import { crawlUrl } from './crawl4ai.js'

describe('crawl4ai source adapter', () => {
  it('handles invalid or non-existent URLs gracefully', async () => {
    const result = await crawlUrl('http://127.0.0.1:9999/not-found', { timeoutMs: 8000 })
    expect(result.success).toBe(false)
    expect(result.url).toBe('http://127.0.0.1:9999/not-found')
    expect(result.errorMessage).toBeDefined()
  }, 10_000)

  // Needs the Next.js dev server on :3000 and a local crawl4ai install.
  it.skipIf(!process.env.CRAWL4AI_LIVE_TEST)('scrapes localhost test server successfully into markdown', async () => {
    const result = await crawlUrl('http://localhost:3000', { wordCountThreshold: 5, timeoutMs: 10000 })
    expect(result.success).toBe(true)
    expect(result.url).toBe('http://localhost:3000')
    expect(result.title).toContain('Gallia')
    expect(result.markdown).toBeDefined()
    expect(result.markdown!.length).toBeGreaterThan(100)
    expect(result.durationMs).toBeGreaterThan(0)
  }, 12_000)
})
