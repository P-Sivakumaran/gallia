# Listed-club filing portals

Transfer fees, add-ons, sell-ons and contract ends from listed clubs' regulatory filings
(transfer ledger phase 2, `backend/src/transfers/filings/`).

## Rule

Gallia fetches a channel only when its **terms of use** allow automated access and reuse. A
permissive robots.txt is not enough. Club websites mostly ban bots or limit content to personal use,
so the route is each country's official storage of regulated information (OAM), where its terms
allow it.

`portals.ts` records every channel with its status and the exact wording that decided it. The
shared HTTP client (`http.ts`) refuses any channel that isn't `CLEARED`, and any host outside that
channel's list. It sends `Gallia transfer research (+https://github.com/P-Sivakumaran/gallia)` and
waits 2 s between requests to the same host.

Statuses:
- **CLEARED**: the terms or an open licence allow automated reuse of the facts.
- **BLOCKED**: the terms ban bots or scraping, or the site blocks automated clients.
- **NEEDS_PERMISSION**: no bot ban, but content is for personal use only or needs written consent.
- **UNKNOWN**: the terms couldn't be read (JavaScript-only pages, or a PDF not yet read).

## Clubs (reviewed 2026-11-28)

| Club | Channel | Status | Built |
|---|---|---|---|
| Olympique Lyonnais (Eagle Football Group) | info-financiere.gouv.fr (DILA) | **CLEARED**: "financial information is open for reuse" (Open Data page), Etalab 2.0, public API. Reusers must credit DILA and give the download URL, file name and date | Parser + fetcher. Each fact stores `details.attribution`; public pages showing these facts must show it |
| Manchester United | SEC EDGAR | **CLEARED**: Fair Access policy, 10 requests/s, declared User-Agent | Not yet. Needs the contact in the Keychain (`gallia-sec-contact`) and a check that its 6-K/20-F filings name individual transfers |
| Juventus | 1Info SDIR | UNKNOWN (JavaScript shell) | Text parser only, no fetcher |
| Lazio | 1Info SDIR | UNKNOWN | No |
| Benfica, FC Porto, Sporting CP | CMVM | UNKNOWN (pages empty without a browser) | No |
| Ajax | AFM | UNKNOWN (no AFM store of issuer releases found) | No |
| Borussia Dortmund | Unternehmensregister | UNKNOWN (terms PDF not read; some downloads need a security check) | No |
| FC Copenhagen (Parken) | Finanstilsynet OAM | UNKNOWN (renders empty) | No |
| Celtic | FCA National Storage Mechanism | **BLOCKED**: FCA legal terms 4.8(iii) ban scrapers, robots and data mining without written consent | No |
| Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor | KAP | **BLOCKED**: edge protection rejects automated requests | No. Needs the licensed MKK feed |

## Channels checked and rejected

| Channel | Status | Wording |
|---|---|---|
| juventus.com | BLOCKED | Condizioni d'Uso (iv) no "richieste automatizzate"; (v) no "robot, crawler e applicazioni simili per raccogliere e analizzare i Contenuti" |
| sslazio.it | BLOCKED | 4.1(x) no "robot", "scrape", "crawl"; 4.2 penalty up to €3,000 per violation |
| CONSOB | BLOCKED | Legal page sends automated clients to a bot challenge |
| London Stock Exchange RNS (LSEG) | BLOCKED | Section 10: no "bot, script, automation software, or other automated tool" |
| eMarket STORAGE (Teleborsa) | NEEDS_PERMISSION | Personal, non-commercial use only; reproduction needs Teleborsa's consent |
| slbenfica.pt | NEEDS_PERMISSION | 7.1: content "apenas autorizada para fins exclusivamente pessoais" |
| sporting.pt | NEEDS_PERMISSION | No transmitting, publishing or copying without written authorisation |
| ajax.nl | NEEDS_PERMISSION | "bedoeld voor persoonlijk en niet-commercieel gebruik"; copying needs written consent |
| aktie.bvb.de / bvb.de | NEEDS_PERMISSION | Inclusion in online services only with prior written consent |
| celticfc.com, fcporto.pt, parken.dk, Euronext company news | UNKNOWN | Terms not readable, or robots.txt disallows the announcement paths |

## Earlier dry run (PR #53)

PR #53's first version fetched 56 announcements from juventus.com. Its "allowed" verdict came from
robots.txt; the site's terms forbid automated requests and crawlers. That fetcher and its dry-run
script are removed. The Juventus text parser stays for when a cleared channel exists; its
loan/permanent classification hasn't been checked against real filings since.

## Next

1. **Manchester United**: store the SEC contact, then read a few 6-K exhibits to see whether
   transfers are named with fees before writing a parser.
2. **UNKNOWN channels**: read the terms in a browser (CMVM, 1Info, Unternehmensregister PDF,
   Finanstilsynet OAM). Clear each one or record why not.
3. **NEEDS_PERMISSION / BLOCKED**: ask for permission (clubs' IR teams, Teleborsa, FCA), or let an
   admin enter facts by hand from a filing they read.
4. **ESAP**: the EU's European Single Access Point will give one machine-readable route to all EU
   regulated filings once it is live.
