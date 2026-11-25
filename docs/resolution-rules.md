# Resolution rules

How Gallia decides that a rumour came true, did not, or cannot be scored. The public
scorecard is only as honest as these rules, so they are fixed before outcomes are
collected and changed only in this file, with a dated note.

Adopted 2026-11-25 (Phase 1 of `docs/gallia-dev-plan.md`).

## What a rumour claims

A rumour claims that a named player will move from one club to another within a
named transfer window (SUMMER, WINTER) or as a free agent.

## Outcomes

| Outcome | Meaning | Evidence required |
|---|---|---|
| COMPLETED | The player officially joined the target club within the window. | The club sync shows the player at the target club, the Sportmonks completed-transfer feed lists the move, or an official club announcement. |
| FAILED | The window closed without the move. | Owner review: the player is confirmed at another club or stayed, checked against an official source. |
| DENIED | An official party (club or player) denied the move and it did not happen in the window. | Owner review with the denial's source. |
| Open (PENDING/HOT) | Not yet known. | Default. |

What does **not** count as completed:

- "Here we go", "deal agreed", "terms agreed", "medical booked" or "passed medical".
  These are reports, not completion. They put the rumour in the review queue.
- A move to a different club than the rumoured one. That rumour is FAILED; a separate
  rumour may cover the other club.

Loans, permanent moves and loans with an option or obligation to buy are different
claims. A rumoured permanent move that happens as a loan is FAILED for the permanent
claim. Until the claim type is stored per rumour, the owner records the type in the
review note.

## Who resolves

| Path | Can set | Notes |
|---|---|---|
| Window-close job (48h after the window cutoff) | COMPLETED only | Only when the synced player's club is the target club. A mismatch is not evidence, because the sync covers only the leagues on the Sportmonks plan. Mismatches go to review. |
| Sportmonks completed-transfer feed | COMPLETED | A primary structured source. |
| Article wording (`detectOutcome`) | Nothing | Shown as a lead in `GET /admin/rumours/awaiting-review`. |
| Owner (`PATCH /admin/rumours/:id/outcome`) | Any outcome | Must give `knownAt` when the outcome became public before today. |

## The deadline and `knownAt`

- The window cutoffs are 2 September (summer) and 2 February (winter), with a 48-hour
  grace period. These are approximations; see `docs/forecasting-methodology.md`.
- After the grace period, the rumour's estimate is frozen: the recompute job stops
  updating it.
- `knownAt` is when the outcome became public, for example the date of the club's
  announcement. The terminal history row is written at `knownAt`.
- The ledger scores the **last estimate recorded before both `knownAt` and the window
  deadline**. Nothing written after either one is scored.

## Void

A rumour is left unscored (open, excluded from the ledger) when:

- the player or either club was matched wrongly,
- the rumour duplicates another rumour about the same move,
- or the claim was never a forecast (for example, a report of a move already announced).

Until a VOID status exists, the owner leaves such rumours open and notes why.

## Corrections

- Corrections go through the same admin route with `force`. Source hit and miss counts
  are recounted from rumour statuses on every change, so a correction never leaves a
  stale miss behind.
- Bad rows are fixed in place. The database is never wiped and reseeded.
- Each source's reliability score blends a prior with its hit rate. The prior is not
  stored, so a recount estimates it; the result is an approximation.
