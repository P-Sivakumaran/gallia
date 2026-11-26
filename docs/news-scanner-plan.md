# News and data scanner: plan (draft, 2026-11-26)

## Goal

One scanner that finds every credible transfer report and confirmation Gallia may legally use. It attributes each claim to the journalist who first reported it, and keeps a citation for every fact. It replaces today's mix of Google News RSS, publisher RSS and Reddit.

Licensing limits the scanner more than technology does. Gallia's biggest discovery source today, Google News RSS, is licensed for personal, non-commercial use only (see [data-sources.md](data-sources.md)). Every source therefore needs a licence entry before anything is collected from it.

## Research summary (2026-11-26)

The sources are Perplexity Pro research with links and a live API test by Claude Code. Some prices and terms come from third-party summaries. Confirm each in writing with the vendor before paying.

### Sources by legal status

| Status | Source | Cost | Notes |
|---|---|---|---|
| Usable | Wikidata | Free, CC0 | Already used for clubs. Confirmations lag the news. |
| Usable | Wikipedia transfer-window pages | Free, CC BY-SA 4.0 | Credit with a link and name the licence. Pages are volunteer-edited and cite journalists, so they are not proof of a transfer. |
| Usable | Mediastack | Standard plan $24.99/mo, 10k calls | Paid plans list commercial use. The terms let end users view results but not store or redistribute them. 13 languages; check coverage of es/it/fr/de/pt sports press. |
| Usable, confirm terms | NewsAPI.ai (Event Registry) | $40/mo (2K plan), $90/mo (5K plan); 2,000 free tokens | Multilingual, full text. Commercial display terms not yet confirmed; the free tier is non-commercial. |
| Usable | NewsCatcher | Free 10k credits per 30 days; pay-as-you-go from $25 | The paid tier lists commercial data rights. Redistribution is Enterprise only. |
| Usable | YouTube Data API | Free quota (10k units/day) | `playlistItems.list` (1 unit) lists a channel's uploads. Link to videos or embed them. |
| Possible | X API | Pay-per-use, $0.005 per post read | Following about 50 transfer journalists costs about $150/mo. Show posts as official embeds. Check the developer terms for embeds and storage before launch. |
| Possible | Bluesky Jetstream | Free, no key | Live public feed. Commercial reuse terms are unclear: link out, don't republish. |
| Possible | Mastodon | Free | Rules are per instance. |
| Not a source | GDELT DOC 2.0 | Free; commercial use allowed with credit | Clean terms, but in a live test on 2026-11-26 it returned 0 articles from marca.com or gazzetta.it in 24 h. A multilingual transfer query returned 3 unrelated articles. Limit: 1 request per 5 s. |
| Avoid | Google News RSS (**used today**) | Free | Personal, non-commercial use only. |
| Avoid | Transfermarkt and API resellers | — | Scraped data, not licensed. |
| Avoid | Premier League website | — | Terms ban building databases from its content. |
| Avoid | Reddit | Commercial use needs written approval | Ads next to Reddit content may be banned. Costs are reported at about $12k/mo minimum (unconfirmed). |
| Avoid | Telegram channels in bulk | — | Its terms ban scraping public channels into datasets and AI training. |
| Gone | Bing News Search; Aylien/Quantexa | — | Bing Search APIs retired 2025-08-11. Aylien's API no longer resolves. |

### Confirmations

No official, reusable feed confirms transfers:
- FIFA's transfer system (TMS) publishes aggregate reports only.
- Leagues don't license their transfer lists.

So "confirmed" comes from two places, in this order:
1. the club's own announcement, stored as headline and link only;
2. Wikidata, later.

## Design

```
 sources registry ──> collectors ──> normalise ──> match entities ──> extract claims ──> attribute ──> score
 (licence first)      (1 per source)  (URL, lang,   (players, clubs,    (LLM, quote must   (original     (outcome
                                       dedupe,       agents)             appear in text)    reporter)     scorecard)
                                       cluster)
```

1. **Source registry.** Every source has a row before anything is collected from it:
   - licence and terms URL;
   - what may be shown: headline, snippet length, link, embed;
   - request budget, and whether full text may be stored or only processed.
   Extend the existing `Source` model rather than adding a table. Collectors refuse sources that have no registry entry.
2. **Collectors.** One adapter per source with budget accounting, like the TheStatsAPI budget in ADR 0008. Scrapling or API Anything may be used only where the source's terms allow automated access, never to get around a ban or a login.
3. **Normalise:**
   - resolve redirects to the publisher's URL (Google News links are `news.google.com` redirects today);
   - detect the language;
   - remove duplicates by canonical URL and by a near-duplicate hash of title and lead;
   - group articles about the same move into one story.
4. **Match entities.** Players and clubs go through `entityMatcher` and the Wikidata aliases from #33. Agents come only from admin-entered cited links (Phase 3 of the mapping plan).
5. **Extract claims.** A small LLM returns structured output:
   - player, from-club, to-club;
   - stage: interest → talks → bid → agreed → medical → official;
   - fee, and who reported it.

   The quoted span must appear verbatim in the article, or the claim is dropped. Each claim becomes evidence with a citation. It is never stored as bare fact.
6. **Attribute.** Most outlets repeat a few journalists ("per Fabrizio Romano"). Link each item to the earliest original report using the existing `parentEvidenceItemId` and `provenanceRootId`, so credit and scoring go to the original reporter, not the copies.
7. **Score and confirm.** Source reliability comes from the outcome scorecard Gallia already keeps (`hitCount`/`missCount`, tiers). A club announcement, and later Wikidata, moves a story to official.

## Phases

**A. Licensed discovery (now).**
1. Source registry fields on `Source` (licence, terms URL, display rights, budget). This is a migration, so Siva merges it.
2. A coverage harness. For one week of real transfer news, compare what today's feeds find with what the NewsAPI.ai free tokens and Mediastack's free tier return. Report results by language and by outlet: Marca, AS, Gazzetta, Corriere dello Sport, L'Équipe, Kicker, Bild, A Bola, Record, BBC, Sky, Guardian.
3. Decide on a vendor from the numbers. Then switch off Google News RSS and the personal-use publisher feeds for anything public.

Owner first: create free accounts at NewsAPI.ai and Mediastack and store the keys in the Keychain. Keys are never kept in files.
- Service names: `gallia-newsapi-ai` and `gallia-mediastack`.
- Command: `security add-generic-password -a "$USER" -s <service> -w`.

**B. Claims and stories.** Claim extraction with quote verification, story grouping and attribution to the original reporter.

**C. Journalists and video.** X journalists on pay-per-use with embeds, Bluesky Jetstream (link-out) and YouTube channel uploads.

**D. Confirmations.** A watcher for clubs' official news pages (headline and link only, where the terms allow), with Wikidata as the slow backstop.

## Decisions for Siva

- Monthly data budget. A licensed news API costs about $25–$90; X for journalists adds about $150.
- Ad-supported or not. Ads affect what X embeds and Reddit allow.
- Vendor choice after the Phase A coverage numbers.
