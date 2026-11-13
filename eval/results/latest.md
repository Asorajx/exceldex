# Search evaluation

_Generated 2026-11-13._

103 queries: 67 used for tuning ("dev") and 36 held out. Top-1 is how often a correct answer came first, top-3 how often one was in the first three, and MRR (mean reciprocal rank) how high the right answer sits on average, where 1.00 is always first. "Nothing-to-find handled" counts queries that have no right answer, where the correct response is to return nothing.

**A caution about easy queries.** 17 of the 103 queries are word-for-word copies of a keyword or task phrase in the content, so finding them is close to a lookup. The tables below show every query, and then the same totals without those copies, which is the fairer measure.

## Dev queries (used for tuning)

| Version | Top-1 | Top-3 | MRR | Nothing-to-find handled |
| --- | --- | --- | --- | --- |
| Stage A | 73% | 81% | 0.77 | 3/4 |
| Before | 94% | 98% | 0.96 | 3/4 |
| After | 98% | 100% | 0.99 | 3/4 |

### Dev, without the word-for-word copies (58 queries)

| Version | Top-1 | Top-3 | MRR | Nothing-to-find handled |
| --- | --- | --- | --- | --- |
| Stage A | 69% | 78% | 0.73 | 3/4 |
| Before | 93% | 98% | 0.95 | 3/4 |
| After | 98% | 100% | 0.99 | 3/4 |

### By category

| Category | Queries | Stage A (top-1 / top-3) | Before (top-1 / top-3) | After (top-1 / top-3) |
| --- | --- | --- | --- | --- |
| exact | 7 | 100% / 100% | 100% / 100% | 100% / 100% |
| partial | 6 | 100% / 100% | 100% / 100% | 100% / 100% |
| task | 16 | 88% / 100% | 94% / 100% | 100% / 100% |
| synonym | 6 | 83% / 100% | 67% / 83% | 100% / 100% |
| typo | 6 | 0% / 0% | 100% / 100% | 100% / 100% |
| word-form | 4 | 25% / 50% | 100% / 100% | 100% / 100% |
| body-text | 5 | 0% / 20% | 80% / 100% | 80% / 100% |
| tip | 9 | 100% / 100% | 100% / 100% | 100% / 100% |
| ambiguous | 4 | 100% / 100% | 100% / 100% | 100% / 100% |
| no-result | 4 | 75% empty | 75% empty | 75% empty |

## Held-out queries (never used for tuning)

These were written before any results were seen. Only the totals are shown here, so improvements cannot be tuned to them.

| Version | Top-1 | Top-3 | MRR | Nothing-to-find handled |
| --- | --- | --- | --- | --- |
| Stage A | 71% | 79% | 0.75 | 1/2 |
| Before | 85% | 94% | 0.90 | 1/2 |
| After | 85% | 94% | 0.90 | 1/2 |

### Held-out, without the word-for-word copies (28 queries)

| Version | Top-1 | Top-3 | MRR | Nothing-to-find handled |
| --- | --- | --- | --- | --- |
| Stage A | 62% | 73% | 0.67 | 1/2 |
| Before | 81% | 92% | 0.88 | 1/2 |
| After | 81% | 92% | 0.87 | 1/2 |

### By category

| Category | Queries | Stage A (top-1 / top-3) | Before (top-1 / top-3) | After (top-1 / top-3) |
| --- | --- | --- | --- | --- |
| exact | 3 | 100% / 100% | 100% / 100% | 100% / 100% |
| partial | 3 | 100% / 100% | 100% / 100% | 100% / 100% |
| task | 8 | 88% / 100% | 88% / 100% | 100% / 100% |
| synonym | 4 | 25% / 50% | 25% / 50% | 25% / 50% |
| typo | 3 | 0% / 0% | 100% / 100% | 100% / 100% |
| word-form | 3 | 33% / 67% | 100% / 100% | 67% / 100% |
| body-text | 2 | 50% / 50% | 50% / 100% | 50% / 100% |
| tip | 6 | 100% / 100% | 100% / 100% | 100% / 100% |
| ambiguous | 2 | 100% / 100% | 100% / 100% | 100% / 100% |
| no-result | 2 | 50% empty | 50% empty | 50% empty |

## Failure log

A miss is a query where no correct answer appeared in the top three, or where a no-result query still returned something.

| Query | Category | Wanted | Returned (top 3) | Result | vs Stage A |
| --- | --- | --- | --- | --- | --- |
| pivot table | no-result | nothing | create-table, toggle-filter, vlookup (+5 more) | returned 8 result(s) | Stage A missed too |

## Right answer, wrong place

The correct entry was in the top three but not first. These are ranking problems.

| Query | Category | Wanted | Returned (top 3) | Result |
| --- | --- | --- | --- | --- |
| arrows | body-text | trace-references | jump-to-edge, data-form, trace-references | position 3 |

## Changes since the saved "before" snapshot

**Improved (3)**

| Query | Category | Before | Now |
| --- | --- | --- | --- |
| list each department only once | task | #2 | #1 |
| cheapest item | synonym | #2 | #1 |
| most expensive item | synonym | missed | #1 |

**Got worse (0)**

_None._
