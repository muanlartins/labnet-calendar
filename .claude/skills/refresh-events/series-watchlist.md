# series-watchlist

`data/series.yaml` is the master list of conference and journal series the calendar tracks. The refresh skill iterates over it to (a) find the next edition of each series and (b) decide which events to re-verify.

## Schema

```yaml
- id: sigcomm                              # kebab-case, unique, matches series_id on event YAMLs
  name: ACM SIGCOMM                         # display name
  full_name: "ACM Special Interest Group on Data Communications"  # optional
  url_pattern: "conferences.sigcomm.org/sigcomm/{year}/"  # {year} is substituted to find the next edition
  cadence: annual                           # annual | biannual | rolling | irregular
  typical_month: august                     # rough hint for when the event happens
  areas: [networking]                       # default areas for new editions, copied to event YAMLs
  subareas: [internet, transport, measurement]
  society: ACM
  region: world                             # default region; some series rotate (e.g. ICC) — note in `notes`
  tier:
    qualis: A1
    core: "A*"
    custom: top
  notes: "40+ year history; site goes live ~6 months before each edition."
```

Required: `id`, `name`, `cadence`, `areas`. Everything else is optional but encouraged — the more pre-filled metadata, the less work the refresh skill has to do.

## Conventions

- **`id`** is permanent. If a series renames itself, keep the old `id` and update `name`. Don't break links.
- **`url_pattern`** uses `{year}` for substitution. If the URL doesn't follow a year-templated pattern, omit it and rely on search.
- **`cadence`**:
  - `annual` (most common)
  - `biannual` (every 2 years — e.g., some workshops)
  - `rolling` (no fixed cycle — e.g., journals with continuous submissions)
  - `irregular` (refresh manually when an edition is announced)
- **`areas`** must match `data/tags.yaml`. The refresh skill copies these to new event YAMLs as the default.
- **`region`** for international conferences that rotate (ICC, GLOBECOM, IJCAI), set to `world` and let each event YAML override per edition.

## Adding a series

1. Append a new entry to `data/series.yaml`, alphabetized within its area block.
2. Run `npm run validate` (the validator has a separate check for series.yaml — see `scripts/validate.mjs`).
3. The next `/refresh-events` run will discover and seed the upcoming edition.

## Removing a series

Removing a series from `series.yaml` does **not** delete its existing event YAMLs — it just stops the refresh skill from looking for new editions. To fully retire a series, remove the entry from `series.yaml` AND delete (or move to `data/archive/`) the event YAMLs.

## Journal series

Journals with rolling submissions are tracked as type `journal` with `cadence: rolling`. They don't have edition-specific YAMLs by default. When a journal announces a themed special issue with a hard deadline, create an event YAML of type `special_issue` with `parent_id` pointing to the journal's `id`.
