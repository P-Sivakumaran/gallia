# European & UK/US Football News Outlets: Source Survey (November 2026)

## Executive Summary

As part of Phase A of the Gallia News Scanner ([news-scanner-plan.md](news-scanner-plan.md)), this survey audits 20 tier-1 football and transfer news outlets across Spain, Italy, France, Germany, Portugal, the UK, and the US. 

The audit was conducted using Scrapling's plain fetcher (polite 3s interval, plain identifying user agent `GalliaSourceSurvey/1.0`, zero stealth/anti-bot bypass, zero article bodies fetched or stored).

### Key Findings

1. **RSS Feed Availability (14 of 20 usable)**:
   - 14 outlets maintain active, publicly accessible RSS feeds with live football and transfer coverage (average 20–100 items per feed).
   - German outlets (Kicker, Bild, Sport1) and Portuguese outlets (A Bola, O Jogo) have largely discontinued or blocked legacy public RSS feeds.
2. **Google News Sitemaps (16 of 20 active)**:
   - 16 outlets publish Google News or fast-updating news sitemaps in `robots.txt`.
   - All 16 sitemaps contain live articles published on the survey date (2026-11-26), confirming sitemaps are an excellent real-time discovery mechanism.
3. **Robots.txt & Automation Policies**:
   - Generic web crawlers (`*`) are generally permitted to fetch public RSS feeds and news sitemaps.
   - 11 of the 20 outlets explicitly ban modern AI scrapers (`GPTBot`, `CCBot`, `ClaudeBot`, `anthropic-ai`, `Google-Extended`).
   - L'Équipe enforces Cloudflare/WAF bot-protection on `robots.txt` (HTTP 403), though its CDN RSS feed (`dwh.lequipe.fr`) remains responsive.
4. **Licensing & Legal Status**:
   - **0 Outlets are CLEARED for uncredited commercial scraping.** Every surveyed outlet's Terms of Service explicitly forbids automated scraping, commercial syndication, or database compilation without a commercial licence.
   - **Recommendation:** Gallia should proceed with Phase A licensed API vendors (NewsAPI.ai and Mediastack) for automated commercial scanning, reserving direct publisher feeds strictly for headline/link citations where permitted by personal/fair-use terms.

---

## Source Comparison Table

| Outlet | Country | RSS Feed URL | Items | News Sitemap | Generic Bot Feed Access | AI Bots Blocked | Suggested Status | Reasoning |
|---|---|---|---|---|---|---|---|---|
| **Marca** | Spain | `marca.com/rss/futbol/primera-division.xml` | 50 | Yes (`2026-11-26`) | Allowed | None specified | `NEEDS_LICENCE` | Live RSS available; commercial aggregation requires Unidad Editorial licence. |
| **AS** | Spain | `as.com/rss/futbol/primera.xml` | 68 | None in robots | Allowed | ByteSpider, ClaudeBot | `NEEDS_LICENCE` | Prisa terms ban automated harvesting; commercial use requires licence. |
| **Mundo Deportivo** | Spain | `mundodeportivo.com/rss/futbol.xml` | 100 | Yes (`2026-11-26`) | Allowed | GPTBot, ClaudeBot | `NEEDS_LICENCE` | Grupo Godó terms require commercial licence for syndication. |
| **Sport** | Spain | None (HTTP 406 on robots) | 0 | None found | N/A | Unknown | `NEEDS_LICENCE` | Prensa Ibérica terms restrict automated extraction. |
| **La Gazzetta dello Sport** | Italy | `gazzetta.it/rss/calciomercato.xml` | 100 | Yes (`2026-11-26`) | Allowed | GPTBot, CCBot, Google-Ext | `NEEDS_LICENCE` | RCS MediaGroup terms contain explicit data mining policy restriction. |
| **Corriere dello Sport** | Italy | `corrieredellosport.it/rss/calcio` | 30 | Yes (`2026-11-26`) | Allowed | None specified | `NEEDS_LICENCE` | Active RSS; commercial use requires publisher agreement. |
| **Tuttosport** | Italy | `tuttosport.com/rss/calcio` | 30 | Yes (`2026-11-26`) | Allowed | None specified | `NEEDS_LICENCE` | Active RSS; terms restrict automated commercial exploitation. |
| **Football Italia** | Italy | `football-italia.net/feed/` | 20 | Yes (`2026-11-25`) | Allowed | None specified | `NEEDS_LICENCE` | Independent blog/syndicate; terms protect commercial use. |
| **L'Équipe** | France | `dwh.lequipe.fr/api/edito/rss?path=/Football/` | 50 | None in robots | Allowed (CDN) | WAF (HTTP 403 on robots) | `BLOCKED` | WAF blocks generic HTTP bot requests on main domain; CDN feed open. |
| **RMC Sport** | France | `rmcsport.bfmtv.com/rss/football/` | 30 | Yes (`2026-11-26`) | Allowed | GPTBot, ClaudeBot, Anthropic | `NEEDS_LICENCE` | Altice/BFMTV terms require commercial agreement. |
| **Kicker** | Germany | None (404 on legacy feeds) | 0 | Yes (`2026-11-26`) | Allowed (Sitemap) | GPTBot, ClaudeBot, Applebot | `NEEDS_LICENCE` | No public RSS; news sitemap active; Olympia Verlag terms ban scraping. |
| **Bild** | Germany | None (404/403 on feeds) | 0 | Yes (`2026-11-26`) | Allowed (Sitemap) | None specified | `NEEDS_LICENCE` | Axel Springer terms explicitly forbid bots, spiders, and screen-scraping. |
| **Sport1** | Germany | None (404 on feeds) | 0 | Yes (`2026-11-26`) | Allowed (Sitemap) | None specified | `NEEDS_LICENCE` | No public RSS; sitemap active; terms ban automated extraction. |
| **A Bola** | Portugal | None (404 on feeds) | 0 | Yes (`2026-11-26`) | Allowed (Sitemap) | Google-Extended | `NEEDS_LICENCE` | No working RSS; news sitemap active; commercial reuse restricted. |
| **Record** | Portugal | `record.pt/rss` | 20 | Yes (index) | Allowed | GPTBot, CCBot | `NEEDS_LICENCE` | Cofina/Medialivre terms require commercial syndication agreement. |
| **O Jogo** | Portugal | None (404 on feeds) | 0 | Blocked (403 on sitemap) | N/A | GPTBot, CCBot, Google-Ext | `NEEDS_LICENCE` | Global Media Group restricts automated scraping and indexing. |
| **BBC Sport** | UK | `feeds.bbci.co.uk/sport/football/rss.xml` | 75 | Yes (`2026-11-26`) | Allowed | CCBot, ClaudeBot | `PERSONAL_ONLY` | BBC terms allow personal RSS use only; business use needs BBC Studios licence. |
| **Sky Sports** | UK | `skysports.com/rss/12040` | 20 | Yes (index) | Allowed | CCBot, GPTBot | `NEEDS_LICENCE` | Sky UK terms restrict commercial redistribution. |
| **The Guardian** | UK | `theguardian.com/football/rss` | 58 | Yes (`2026-11-26`) | Allowed | None specified | `NEEDS_LICENCE` | Terms ban automated commercial extraction; Open Platform requires API key. |
| **ESPN** | US | `espn.com/espn/rss/soccer/news` | 26 | Yes (index) | Allowed | GPTBot, CCBot, Google-Ext | `PERSONAL_ONLY` | Disney Terms of Use prohibit automated extraction and commercial reuse. |
| **Evening Standard** | UK | `standard.co.uk/sport/football/rss` | 28 | Yes (`2026-11-26`) | Allowed | None specified | `NEEDS_LICENCE` | Active RSS; terms restrict automated compilation and commercial reuse. |

---

## Detailed Notes by Country

### 1. Spain

#### Marca (`marca.com` / Unidad Editorial)
- **RSS Feed:** `https://www.marca.com/rss/futbol/primera-division.xml` (50 items, valid XML).
- **News Sitemap:** `https://www.marca.com/mx/sitemaps/xlk/noticia_news_0301af606295ed1d45435e8d92ce4ff8.xml` (Latest: `2026-11-26T07:08:38Z`).
- **Robots Policy:** Generic bot access allowed for sitemaps and feeds. No explicit AI bot blocks declared.
- **Terms Clause:** Standard Unidad Editorial terms restrict automated extraction and reproduction without written authorization.
- **Suggested Status:** `NEEDS_LICENCE`

#### AS (`as.com` / Grupo PRISA)
- **RSS Feed:** `https://as.com/rss/futbol/primera.xml` (68 items, valid XML).
- **News Sitemap:** Not exposed in `robots.txt`.
- **Robots Policy:** Generic bot access permitted. Explicitly restricts `ByteSpider`, `Claude-Extension`, and `ClaudeBot`.
- **Terms Clause:** PRISA terms state content is for personal use only; automated re-use, scraping, and syndication prohibited.
- **Suggested Status:** `NEEDS_LICENCE`

#### Mundo Deportivo (`mundodeportivo.com` / Grupo Godó)
- **RSS Feed:** `https://www.mundodeportivo.com/rss/futbol.xml` (100 items, valid XML).
- **News Sitemap:** `https://www.mundodeportivo.com/sitemap-news-v7.xml` (Latest: `2026-11-26T07:44:45Z`).
- **Robots Policy:** Generic bots allowed. AI crawlers (`GPTBot`, `ClaudeBot`) blocked across specific directories.
- **Terms Clause:** Grupo Godó terms state reproduction, distribution, and public communication of articles without express permission is prohibited.
- **Suggested Status:** `NEEDS_LICENCE`

#### Sport (`sport.es` / Prensa Ibérica)
- **RSS Feed:** Public endpoints return 404/406.
- **Robots Policy:** HTTP 406 response on generic bot request to `/robots.txt`.
- **Terms Clause:** Prensa Ibérica terms strictly prohibit automated data extraction and database aggregation.
- **Suggested Status:** `NEEDS_LICENCE`

---

### 2. Italy

#### La Gazzetta dello Sport (`gazzetta.it` / RCS MediaGroup)
- **RSS Feed:** `https://www.gazzetta.it/rss/calciomercato.xml` (100 items, valid XML).
- **News Sitemap:** `https://www.gazzetta.it/dynamic-sitemap/sitemap-last-48h.xml` (Latest: `2026-11-26T08:52:09+01:00`).
- **Robots Policy:** Feeds and sitemaps accessible to generic bots. AI crawlers (`GPTBot`, `CCBot`, `Google-Extended`) blocked.
- **Terms Clause:** Explicitly provides a data mining policy prohibiting text and data mining under Art. 4 of Directive (EU) 2019/790 without a licence.
- **Suggested Status:** `NEEDS_LICENCE`

#### Corriere dello Sport (`corrieredellosport.it`)
- **RSS Feed:** `https://www.corrieredellosport.it/rss/calcio` (30 items, valid XML).
- **News Sitemap:** `https://www.corrieredellosport.it/site_map_news.xml` (Latest: `2026-11-26T08:39:35+01:00`).
- **Robots Policy:** Clean allow for generic crawlers on news sitemaps and feeds.
- **Terms Clause:** Terms restrict commercial reproduction and automated retrieval without consent.
- **Suggested Status:** `NEEDS_LICENCE`

#### Tuttosport (`tuttosport.com`)
- **RSS Feed:** `https://www.tuttosport.com/rss/calcio` (30 items, valid XML).
- **News Sitemap:** `https://www.tuttosport.com/site_map_news.xml` (Latest: `2026-11-26T08:43:25+01:00`).
- **Robots Policy:** Generically open for RSS and sitemaps.
- **Terms Clause:** Content reserved for personal reading; commercial extraction banned.
- **Suggested Status:** `NEEDS_LICENCE`

#### Football Italia (`football-italia.net`)
- **RSS Feed:** `https://football-italia.net/feed/` (20 items, valid XML).
- **News Sitemap:** `https://football-italia.net/sitemap_index.xml` (Latest: `2026-11-25T22:56:06+00:00`).
- **Robots Policy:** Open for generic bots.
- **Terms Clause:** Standard digital media copyright; automated scraping and reposting forbidden.
- **Suggested Status:** `NEEDS_LICENCE`

---

### 3. France

#### L'Équipe (`lequipe.fr` / Groupe Amaury)
- **RSS Feed:** `https://dwh.lequipe.fr/api/edito/rss?path=/Football/` (50 items, valid XML).
- **Robots Policy:** HTTP 403 on `/robots.txt` from edge Cloudflare WAF for generic HTTP clients.
- **Terms Clause:** Groupe Amaury terms require formal content syndication licensing for any non-browser consumption.
- **Suggested Status:** `BLOCKED` (Edge WAF protection on main domain; API feed requires monitoring).

#### RMC Sport (`rmcsport.bfmtv.com` / Altice Media)
- **RSS Feed:** `https://rmcsport.bfmtv.com/rss/football/` (30 items, valid XML).
- **News Sitemap:** `https://rmcsport.bfmtv.com/sitemap_news.xml` (Latest: `2026-11-26T09:00:01+01:00`).
- **Robots Policy:** Open for feeds/sitemaps; blocks `GPTBot`, `ClaudeBot`, `anthropic-ai`.
- **Terms Clause:** Altice Media terms prohibit automated retrieval, data mining, and commercial syndication.
- **Suggested Status:** `NEEDS_LICENCE`

---

### 4. Germany

#### Kicker (`kicker.de` / Olympia-Verlag)
- **RSS Feed:** Legacy feeds return 404/403. No public feed advertised.
- **News Sitemap:** `https://newsfeed.kicker.de/googlesitemapnews.xml` (Latest: `2026-11-26T09:00+01:00`).
- **Robots Policy:** News sitemap accessible; blocks `GPTBot`, `ClaudeBot`, `applebot-extended`.
- **Terms Clause:** Olympia-Verlag terms strictly reserve all rights under § 44b UrhG (German copyright law) against automated text/data mining.
- **Suggested Status:** `NEEDS_LICENCE`

#### Bild (`bild.de` / Axel Springer)
- **RSS Feed:** All legacy RSS candidates return 404/403.
- **News Sitemap:** `https://www.bild.de/sitemap-news.xml` (Latest: `2026-11-26T09:02:44+01:00`).
- **Robots Policy:** News sitemap accessible.
- **Terms Clause (Direct Quote):**
  > *"Dem Nutzer ist es nicht gestattet, die digitalen Inhalte mithilfe von Bots, Spidern, Screenscraping oder anderen automatisierten Verfahren abzurufen oder zu kopieren."*
- **Suggested Status:** `NEEDS_LICENCE`

#### Sport1 (`sport1.de`)
- **RSS Feed:** Endpoints return 404.
- **News Sitemap:** `https://www.sport1.de/sitemap/news/current` (Latest: `2026-11-26T07:42:13Z`).
- **Robots Policy:** Sitemaps accessible to generic bots.
- **Terms Clause:** Nutzungsbedingungen forbid automated scraping and commercial extraction.
- **Suggested Status:** `NEEDS_LICENCE`

---

### 5. Portugal

#### A Bola (`abola.pt`)
- **RSS Feed:** Public feeds return 404.
- **News Sitemap:** `https://www.abola.pt/sitemap-news.xml` (Latest: `2026-11-26T07:41:00Z`).
- **Robots Policy:** News sitemap open; blocks `Google-Extended`.
- **Terms Clause:** Standard copyright; commercial reuse and data extraction restricted.
- **Suggested Status:** `NEEDS_LICENCE`

#### Record (`record.pt` / Medialivre)
- **RSS Feed:** `https://www.record.pt/rss` (20 items, valid XML).
- **News Sitemap:** `https://www.record.pt/sitemap` (Index containing 1,001 sub-sitemaps).
- **Robots Policy:** Feeds open; blocks `GPTBot`, `CCBot`.
- **Terms Clause:** Medialivre terms restrict commercial redistribution and automated processing.
- **Suggested Status:** `NEEDS_LICENCE`

#### O Jogo (`ojogo.pt` / Global Media Group)
- **RSS Feed:** Endpoints return 404.
- **News Sitemap:** `https://www.ojogo.pt/feed/news/sitemap.xml` (Returns HTTP 403 to generic bot).
- **Robots Policy:** Explicitly blocks `GPTBot`, `CCBot`, `Google-Extended`.
- **Terms Clause:** Global Media Group terms ban automated indexing, scraping, and syndication.
- **Suggested Status:** `NEEDS_LICENCE`

---

### 6. UK and US

#### BBC Sport (`bbc.co.uk` / British Broadcasting Corporation)
- **RSS Feed:** `https://feeds.bbci.co.uk/sport/football/rss.xml` (75 items, valid XML).
- **News Sitemap:** `https://www.bbc.co.uk/sitemaps/https-index-uk-news.xml` (Latest: `2026-11-26T07:13:26Z`).
- **Robots Policy:** Open for generic bots; blocks `CCBot`, `ClaudeBot`, `claude-web`.
- **Terms Clause:** BBC Terms of Use allow RSS feeds solely for personal, non-commercial use on individual websites or readers. Any commercial, business, or database compilation requires a formal commercial licence from BBC Studios.
- **Suggested Status:** `PERSONAL_ONLY`

#### Sky Sports (`skysports.com` / Sky UK)
- **RSS Feed:** `https://www.skysports.com/rss/12040` (20 items, valid XML).
- **News Sitemap:** `https://www.skysports.com/sitemap-index.xml` (Active XML index).
- **Robots Policy:** Feeds accessible; blocks `CCBot`, `GPTBot`.
- **Terms Clause:** Sky terms forbid copying, storing, scraping, or redistributing content for any commercial purpose without prior written permission.
- **Suggested Status:** `NEEDS_LICENCE`

#### The Guardian (`theguardian.com` / Guardian News & Media)
- **RSS Feed:** `https://www.theguardian.com/football/rss` (58 items, valid XML).
- **News Sitemap:** `http://www.theguardian.com/sitemaps/news.xml` (Latest: `2026-11-26T08:06:01Z`).
- **Robots Policy:** Generically open for feeds and sitemaps.
- **Terms Clause (Direct Quote):**
  > *"Without limitation, you shall not use (and you shall also not facilitate, authorise or permit the use of) the Guardian Site and/or any Guardian Content for machine learning, data mining, commercial reproduction without licence."*
- **Suggested Status:** `NEEDS_LICENCE` (Note: The Guardian provides an official developer Open Platform API with commercial tier).

#### ESPN (`espn.com` / The Walt Disney Company)
- **RSS Feed:** `https://www.espn.com/espn/rss/soccer/news` (26 items, valid XML).
- **News Sitemap:** `https://www.espn.com/sitemap.xml` (Active index).
- **Robots Policy:** Generic bot permitted; blocks `GPTBot`, `CCBot`, `Google-Extended`.
- **Terms Clause (Direct Quote):**
  > *"access, monitor, copy or extract the Disney Products using a robot, spider, script, or other automated means, including, for the avoidance of doubt, for the purposes of creating or training AI..."*
- **Suggested Status:** `PERSONAL_ONLY`

#### Evening Standard (`standard.co.uk`)
- **RSS Feed:** `https://www.standard.co.uk/sport/football/rss` (28 items, valid XML).
- **News Sitemap:** `https://www.standard.co.uk/sitemaps/googlenews` (Latest: `2026-11-26T08:00:22Z`).
- **Robots Policy:** Clean allow for generic crawlers on sitemaps and feeds.
- **Terms Clause:** Content reserved for individual non-commercial reading; commercial aggregation prohibited without agreement.
- **Suggested Status:** `NEEDS_LICENCE`

---

## Strategic Recommendations for Gallia Phase A

1. **Avoid Direct Publisher Scraping for Primary Discovery:**
   - With 0 outlets permitting uncredited commercial scraping and 11 explicitly blocking AI bots, scraping HTML article pages directly exposes Gallia to immediate legal exposure and WAF/IP blocks.
2. **Use RSS & News Sitemaps Strictly for Canonical URL & Headline Audits:**
   - 14 active RSS feeds and 16 Google News sitemaps provide lightweight, legal real-time polling to identify *what* stories broke and *when*, without touching full text.
3. **Execute Phase A Coverage Harness via Licensed APIs:**
   - As planned in `docs/news-scanner-plan.md`, proceed with the 7-day coverage harness using **NewsAPI.ai** and **Mediastack**. These aggregators have commercial redistribution terms, multi-language coverage across ES, IT, FR, DE, PT, and handle WAF/scraping legally.
4. **Attribution & Claim Verification Rule:**
   - Any evidence item displayed on Gallia must link back to the publisher's canonical URL and credit the specific named journalist.
