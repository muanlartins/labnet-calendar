# extraction-rules

Practical rules for turning a conference's CFP page into clean YAML.

## Finding the CFP page

1. Start at the event's homepage (`<series>.<domain>/<year>/` or whatever the series uses).
2. Look for navigation items named `Call for Papers`, `CFP`, `Submissions`, `Call`, `Authors`, `Important Dates`.
3. Some sites use a single "Important Dates" section on the homepage instead of a dedicated CFP page — that's fine, use it.
4. If the page lists multiple tracks (research, industry, posters, workshops), prefer the **main research track** unless the YAML's `type` says otherwise.

## Date kinds — disambiguation

| What the page says | YAML `kind` |
|---|---|
| "Abstract registration", "Title and abstract due", "Pre-registration of papers" | `abstract` |
| "Paper submission", "Full paper deadline", "Submission deadline" (with no abstract step) | `paper` |
| "Author response", "Rebuttal period" | `rebuttal` |
| "Author notification", "Acceptance notification", "Decisions sent" | `notification` |
| "Camera-ready", "Final version", "Final paper due" | `camera_ready` |
| "Early-bird registration" | `early_registration` |
| "Late registration", "Registration closes" | `registration` |
| "Workshop proposal" | `workshop_proposal` |
| "Poster submission", "Poster deadline" | `poster` |
| "Tutorial proposal" | `tutorial_proposal` |

If the page only gives one date and calls it "Submission deadline", treat it as `paper`. Add an `abstract` only when the page explicitly distinguishes them.

## Timezones

Conference deadlines almost always specify a timezone — not capturing it is a real bug because authors miss deadlines because of it.

| Page text | YAML `timezone` |
|---|---|
| "AoE" or "Anywhere on Earth" | `AoE` |
| "UTC", "GMT" | `UTC` |
| "PST", "PDT", "Pacific" | `America/Los_Angeles` |
| "EST", "EDT", "Eastern" | `America/New_York` |
| "CET", "CEST", "Central European" | `Europe/Berlin` (or country-specific if obvious) |
| "BRT", "Brasília" | `America/Sao_Paulo` |
| "JST" | `Asia/Tokyo` |
| Time given without TZ for a Brazilian event | Default to `America/Sao_Paulo` and add a `note: "timezone inferred"` |

When the page gives a date without any time at all, store the date as `YYYY-MM-DD` (no time component) — the build script treats those as end-of-day in the consumer's local time.

## Date formats

ISO 8601 dates (`YYYY-MM-DD`) are the canonical form in YAML. Convert other formats:

- `January 28, 2026` → `2026-01-28`
- `28 Jan 2026` → `2026-01-28`
- `28/01/2026` → `2026-01-28` (note: many Brazilian sites use DD/MM, US sites use MM/DD; use context)
- `28.01.26` → `2026-01-28`

Times: append as `THH:MM:SS` to the date if a time is given, e.g. `2026-01-28T23:59:00`. The `timezone` field disambiguates.

## "TBA" and absent data

- If the page says "TBA" / "TBD" / "to be announced", **do not** invent a date. Either omit the deadline entirely or, if a deadline existed in the prior YAML, leave it and note `"TBA on official site as of YYYY-MM-DD"` in `notes`.
- Some pages publish a date without specifying year (e.g. "May 25"). Cross-reference with the conference's announced year and add the year explicitly.
- "Around" / "approximately" / "early Feb" — do not store. Wait for a hard date.

## Multi-cycle reviewing (USENIX Security, NDSS, IEEE S&P, etc.)

Some venues review papers in multiple deadlines per year:

- USENIX Security: Cycle 1 (~September) and Cycle 2 (~February or June, varies)
- NDSS: Summer / Fall cycles
- IEEE S&P: 4 deadlines per year

For these, store the **next upcoming** cycle's deadline as the primary `paper` deadline. Add `note: "Cycle N — series uses N annual review cycles"`. Each cycle does not deserve its own event YAML; they all feed into the same edition (e.g., `usenix-security-2026` regardless of which cycle a paper hits).

## Workshops co-located with a main conference

When a conference (like SIGCOMM, BRACIS, NeurIPS) has many co-located workshops:

1. The main conference is one event YAML, type `conference`.
2. Each workshop is its own event YAML, type `workshop`, with `parent_id` set to the main conference's `id`.
3. The workshop's `event_dates` are usually a single day during the main conference's range.
4. Workshops typically have their own (later) submission deadlines.

Do not enumerate every workshop on the first refresh — only add workshops the user explicitly cares about, or the most prominent ones (cap at ~5 per major conference). The UI groups them under the parent.

## Location

- `city` — city name as it appears on the page (English form preferred, e.g. "São Paulo", "Tokyo", "Vienna").
- `country` — full country name in English ("Brazil", "USA", "United Kingdom", "Germany"). Not country codes.
- `venue` — only if specifically named on the page (hotel, convention center, university campus). If not given, omit.
- `mode` — `in-person` is the default if the page doesn't say. Set `virtual` only if the page explicitly says fully online; `hybrid` if it says hybrid.

## Things to never do

- Never extract dates from a third-party aggregator (WikiCFP, conference-listing sites). Always go to the official site.
- Never use a search engine snippet as the source — fetch the page and read it.
- Never set `verified_by: claude` on a file you didn't actually verify.
- Never bump `last_verified` without actually re-reading the source.
