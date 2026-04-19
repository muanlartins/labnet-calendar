---
name: refresh-events
description: Refresh labnet-calendar's event data by visiting each tracked series' official site, extracting deadlines and dates, updating the per-event YAML files, and opening a single PR. Triggers when the user runs /refresh-events, asks to "refresh the calendar", or when the in-page banner says a refresh is overdue.
---

# refresh-events

This skill is the operational heart of `labnet-calendar`. It runs on a ~15-day cadence (configured in `data/meta.yaml`) and is the only mechanism by which event data changes between human contributions.

## Inputs (read first)

| File | Purpose |
|---|---|
| `data/meta.yaml` | `last_refresh`, `cadence_days`, `schema_version` |
| `data/series.yaml` | Watch list — every series the calendar tracks |
| `data/tags.yaml` | Canonical vocabulary; refuse to introduce values that aren't in here |
| `data/events/*.yaml` | One file per event-edition; the data you may modify |
| `schema/event.schema.json` | The contract — `npm run validate` enforces this |

Companion docs in this directory:
- `series-watchlist.md` — schema and conventions for `series.yaml`
- `extraction-rules.md` — how to find CFP pages and parse dates correctly

## Protocol

### 1. Read state and triage (no network)

For every event YAML, decide whether it needs verification this run:

| Status | Action |
|---|---|
| `event_dates.end` < today (event already happened) | **Freeze.** Do not touch. |
| Has open deadlines ≤ 7 days away | **Always re-verify.** Last chance to catch extensions. |
| Has open deadlines 8–30 days away | **Always re-verify.** |
| Has open deadlines 31–180 days away | Verify if `last_verified` ≥ 15 days ago |
| Deadlines > 180 days away | Verify if `last_verified` ≥ 30 days ago |
| No deadlines, only future event date | Verify if `last_verified` ≥ 30 days ago |

If the user passed series IDs as arguments, only consider events matching those `series_id` values.

Keep a list `to_verify[]` and a list `series_needing_next_edition[]`. The latter is every series in `series.yaml` whose latest known edition has an `event_dates.end` in the past — that series' next edition needs to be discovered and added.

### 2. Verify each event

For every event in `to_verify[]`:

1. WebSearch `<series_name> <year> call for papers` (or use the `cfp_url` directly if it's in the YAML).
2. WebFetch the CFP page. If the official site has moved, search for the new URL — series websites change every edition.
3. Apply `extraction-rules.md` to extract: abstract/paper deadlines (with timezone), notification, camera-ready, event start/end, location, mode.
4. Compare against the current YAML:
   - **No changes** → just bump `last_verified` and `sources[].fetched_at`.
   - **Date changed** → update the deadline, append a note in `notes` with the previous date and the change, bump `last_verified`.
   - **CFP not yet published** → leave existing data, add `notes: "CFP not yet published as of YYYY-MM-DD"`, bump `last_verified`.
   - **Cannot find the official site** → leave the event untouched, log it for the PR description's "needs human attention" section. Do NOT delete events.
5. Write the YAML back. One file per event keeps diffs reviewable.

### 3. Discover next editions

For every series in `series_needing_next_edition[]`:

1. Resolve the URL using `series.url_pattern` if present (e.g. `conferences.sigcomm.org/sigcomm/{year}/`), otherwise WebSearch `<series_name> <next_year>`.
2. WebFetch. If the next edition isn't announced yet, **skip**; do not fabricate dates. Log it for the PR description.
3. If found, create a new YAML at `data/events/<series_id>-<year>.yaml` populated from the page. Carry over `series_id`, `areas`, `subareas`, `tier`, `society` from the most recent edition of the same series — they rarely change.

### 4. Discover new series (only if requested)

By default, do NOT add new series in a refresh run. Adding a series is a deliberate human decision that goes through `series.yaml`. The exception: if the user explicitly asked you to "find new conferences in area X", search and propose additions, but write them to `series.yaml` rather than guessing event YAMLs.

### 5. Validate, build, generate iCal

```bash
npm run validate
npm run build
npm run ical
```

If validation fails, fix the offending YAML. Common causes: typo in an `area`/`subarea` (must come from `tags.yaml`), missing `last_verified`, malformed date.

### 6. Update meta and commit

- Set `data/meta.yaml`'s `last_refresh` to today (UTC date, ISO 8601).
- Stage everything: `data/events/*.yaml`, `data/meta.yaml`, `web/data/*` if those are committed.
- Branch name: `refresh/YYYY-MM-DD`.
- Commit message: `refresh: YYYY-MM-DD`.

### 7. Open PR

Use `gh pr create` with this body template:

```markdown
## Refresh — YYYY-MM-DD

### Updated (N)
- `<id>` — <one-line summary of what changed, e.g. "paper deadline 2026-02-01 → 2026-02-08">

### Added (N)
- `<id>` — newly discovered edition

### Frozen (N)
- `<id>` — event has passed (event_dates.end < today)

### Needs human attention (N)
- `<id>` — couldn't find the official site / CFP not yet published / ambiguous data
```

Keep each section short. The PR is reviewed by a human; show your work but don't bury it.

## Behavioral rules

- **Never fabricate dates.** If a date isn't on the official site, leave it as-is or remove it (and explain in `notes`). Stale-but-real beats invented.
- **Always set `verified_by: claude`** on any event you touch.
- **Cite sources.** Every event you modify should have at least one entry in `sources[]` with the URL you fetched and today's date in `fetched_at`.
- **Respect the controlled vocabulary.** New `area` or `region` values require an edit to `data/tags.yaml`, which means a deliberate human-reviewable change in the same PR.
- **One PR per refresh run.** Do not split into many PRs unless the user asks.
- **Don't push to `main` directly.** Always work on a `refresh/YYYY-MM-DD` branch.
- **Don't skip validation** to "make it work" — fix the underlying data.

## Failure modes

| Symptom | Likely cause | Action |
|---|---|---|
| Site returns 404 | Series moved domains | WebSearch for the current site, update `series.url_pattern` |
| Extracted date is wildly wrong | Got abstract instead of paper, or vice versa | Re-read the page carefully; cross-reference with the prior year's edition |
| Page is JS-rendered and WebFetch returns nothing useful | Common for Wix/Squarespace conf sites | Search for a Google cache or the conference's CFP-specific archive page |
| `npm run validate` fails after edits | Forgot to update `tags.yaml`, malformed date, duplicate id | Read the error message and fix the offending file |
| Many events suddenly stale after a long gap | A major refresh has been skipped | Run anyway; the PR description will be longer but the protocol is unchanged |

## What this skill does NOT do

- It does not modify the UI (`web/index.html`, `web/assets/*`).
- It does not change the schema or controlled vocabulary unless explicitly asked.
- It does not deploy. GitHub Actions handles deploy on push to `main`.
- It does not delete events. Past events are kept for historical reference.
