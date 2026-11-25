# Data sources: cost and licensing

Checked 2026-11-25 from each provider's published terms (Perplexity research plus a
direct read of TheStatsAPI's terms). This is a reading of published terms, not legal
advice. Re-check before launch.

## Gallia today

| Source | Use | Cost | Public commercial display | Status |
|---|---|---|---|---|
| TheStatsAPI | Player current club (player-sync) | Free tier ~500 req/day; Starter $50/mo (120/min), Growth $129, Scale $379 | Terms allow display in your own sites and apps "subject to your active subscription"; FAQ says paid plans allow commercial use. No resale, no bulk republishing, cache only as needed. Data source not named. | Key is shared with Overround and limited to 12/min, which matches no paid plan: likely free tier. **Upgrade to a paid plan before launch** and confirm display terms in writing. |
| Google News RSS (4 feeds) | Article discovery | Free | Google News terms: personal, non-commercial use only; no robots copying content; no driving commercial traffic. | **Not licensed for a commercial site.** Needs a replacement before launch. |
| Publisher RSS (BBC, Guardian, Sky, ESPN, Marca, L'Équipe) | Article discovery | Free | Mostly personal-use only: BBC needs permission (possible fee) for business use; Guardian, L'Équipe, Sky, Marca restrict commercial reuse. ESPN allows unmodified display with credit and link. Evening Standard allows headline + URL + source name. | Gallia now shows only headline, source and link; no descriptions or article text. Commercial use still needs permission or a licensed news feed. |
| Wikidata | Player enrichment | Free | CC0. | Clean. |
| Sportmonks | (off since 2026-11-25) | €29–€249/mo | Monetised products allowed; display terms per plan, confirm in writing. | Retired by owner. |
| API-Football | (no key) | $0–$39/mo | Terms: "We do not provide a license for the use and publication of the data." | Avoid for public display. |

## Overround today

| Source | Cost | Terms | Status |
|---|---|---|---|
| TheStatsAPI | as above | Commercial use stated for paid plans only | Paid plan needed before commercial use. |
| Sportsgambler.com (scraped pipeline) | Free | Terms (30 Jan 2026) ban bots/scrapers without written permission; content personal, non-commercial; no AI/ML training use. | **In breach.** Ask contact@sportsgambler.com or switch off. |
| The Odds API | Free 500 credits/mo; $30–$249/mo | Display allowed, including commercially; no resale as a raw feed; no attribution needed. | Clean. |
| Betfair Exchange API | Delayed key free; live key £499 one-off | Personal use free; commercial use and publishing prices need a licence or affiliate deal. Australian residents use Betfair Australia's Automation Hub. | Personal trading only. |
| DataGolf | $30/mo or $270/yr | Personal, non-commercial; no redistribution. | Personal only. |

## Transfer-data APIs considered and rejected

| Provider | Cost | Source | Verdict |
|---|---|---|---|
| reefapi.com | ~$15/mo for 10k credits | Reads Transfermarkt "logged out" | Scraped Transfermarkt: avoid |
| api.sh Transfermarkt API | $50/mo for 50k | "Public Transfermarkt data as JSON" | Scraped Transfermarkt: avoid |
| transfermarkt-api.fly.dev | Free | Open-source wrapper of Transfermarkt's internal API; README: test use only, licence covers code not data | Avoid |
| zylalabs.com listings | ~$50–$100/mo | Marketplace; transfer/market-value listings look Transfermarkt-derived | Avoid |
| steadyapi.com | Free–$300/mo | Not stated; commercial use varies by plan | Ask for source and licence in writing |
| sportapidata.com | Quote only | Cites upstream licensing costs; delayed "editorial" tier | Candidate: request quote and written display terms |
| thesports.com | Quote only | Commercial feed provider; sources not stated | Candidate: request quote and written display terms |

Transfermarkt itself: terms §11.1 ban bots and scraping, it has reserved its text and data
mining opt-out (§44b UrhG), it has no official API or published licence, and republishing a
substantial part of its database risks the EU sui generis database right. Excluded.
