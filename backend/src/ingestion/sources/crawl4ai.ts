/**
 * Crawl4AI Ingestion Client & Adapter
 *
 * Connects to the local Crawl4AI Python environment to perform deep page crawls,
 * anti-bot bypass, and LLM-ready markdown extraction for transfer rumour articles.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'

export interface CrawlResult {
  success: boolean
  url: string
  title?: string
  markdown?: string
  cleanedHtml?: string
  errorMessage?: string
  durationMs?: number
}

export interface CrawlOptions {
  cssSelector?: string
  wordCountThreshold?: number
  bypassCache?: boolean
  timeoutMs?: number
}

const DEFAULT_PYTHON_PATH =
  process.env.CRAWL4AI_PYTHON_PATH ?? '/Users/user/.local/share/crawl4ai-mcp/.venv/bin/python'

/**
 * Execute Crawl4AI on a single target URL using the local Python runtime.
 */
export async function crawlUrl(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const startTime = Date.now()
  const timeoutMs = options.timeoutMs ?? 30_000

  const script = `
import asyncio
import json
import os
import sys
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

os.environ["CRAWL4AI_NO_CLOUD_NOTICE"] = "1"

async def run():
    url = sys.argv[1]
    css_selector = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "None" else None
    word_count_threshold = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    bypass_cache = sys.argv[4].lower() == "true" if len(sys.argv) > 4 else True

    browser_cfg = BrowserConfig(headless=True, verbose=False)
    run_cfg = CrawlerRunConfig(
        css_selector=css_selector,
        word_count_threshold=word_count_threshold,
        cache_mode=CacheMode.BYPASS if bypass_cache else CacheMode.ENABLED
    )

    try:
        async with AsyncWebCrawler(config=browser_cfg) as crawler:
            res = await crawler.arun(url=url, config=run_cfg)
            output = {
                "success": bool(res.success),
                "url": url,
                "title": (res.metadata or {}).get("title"),
                "markdown": res.markdown or "",
                "errorMessage": res.error_message if not res.success else None
            }
            print("___CRAWL4AI_JSON_START___")
            print(json.dumps(output))
            print("___CRAWL4AI_JSON_END___")
    except Exception as e:
        output = {
            "success": False,
            "url": url,
            "errorMessage": str(e)
        }
        print("___CRAWL4AI_JSON_START___")
        print(json.dumps(output))
        print("___CRAWL4AI_JSON_END___")

if __name__ == "__main__":
    asyncio.run(run())
`

  return new Promise<CrawlResult>((resolve) => {
    let stdoutData = ''
    let stderrData = ''
    let isSettled = false

    const proc = spawn(
      DEFAULT_PYTHON_PATH,
      [
        '-c',
        script,
        url,
        options.cssSelector ?? 'None',
        String(options.wordCountThreshold ?? 10),
        String(options.bypassCache ?? true),
      ],
      {
        env: {
          ...process.env,
          CRAWL4AI_NO_CLOUD_NOTICE: '1',
        },
      },
    )

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true
        proc.kill('SIGKILL')
        resolve({
          success: false,
          url,
          errorMessage: `Crawl4AI process timed out after ${timeoutMs}ms`,
          durationMs: Date.now() - startTime,
        })
      }
    }, timeoutMs)

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString()
    })

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString()
    })

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (isSettled) return
      isSettled = true

      try {
        const startMarker = '___CRAWL4AI_JSON_START___'
        const endMarker = '___CRAWL4AI_JSON_END___'
        const startIdx = stdoutData.indexOf(startMarker)
        const endIdx = stdoutData.indexOf(endMarker)

        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = stdoutData.slice(startIdx + startMarker.length, endIdx).trim()
          const parsed = JSON.parse(jsonStr) as CrawlResult
          parsed.durationMs = Date.now() - startTime
          return resolve(parsed)
        }

        resolve({
          success: false,
          url,
          errorMessage: stderrData || `Crawl4AI exited with code ${code}`,
          durationMs: Date.now() - startTime,
        })
      } catch (err) {
        resolve({
          success: false,
          url,
          errorMessage: `Failed to parse Crawl4AI output: ${(err as Error).message}`,
          durationMs: Date.now() - startTime,
        })
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      if (isSettled) return
      isSettled = true
      resolve({
        success: false,
        url,
        errorMessage: err.message,
        durationMs: Date.now() - startTime,
      })
    })
  })
}
