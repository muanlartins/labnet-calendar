# labnet-calendar

Academic event calendar for [LabNet — PESC/COPPE/UFRJ](https://labnet.nce.ufrj.br/). Tracks conferences, workshops, and journals across all of CS, with a focus on Brazilian (SBC) and top-tier international venues.

The calendar is a static site backed by per-event YAML files. The unusual part: data is refreshed by [Claude Code](https://claude.com/product/claude-code) on a ~15-day cadence — when the in-page banner says "refresh due", a maintainer opens the repo in Claude Code and runs `/refresh-events`. Claude visits each tracked series' official site, extracts dates, opens a PR.

**Live site**: https://muanlartins.github.io/labnet-calendar (deploys from `main`)

## Layout

| Path | Purpose |
|---|---|
| `data/events/<id>.yaml` | One file per event-edition (e.g. `sigcomm-2026.yaml`) |
| `data/series.yaml` | Watch list of conference series the refresh skill iterates over |
| `data/tags.yaml` | Canonical taxonomy (areas, regions, societies, tiers) |
| `data/meta.yaml` | `last_refresh`, `cadence_days`, `schema_version` |
| `schema/event.schema.json` | JSON Schema enforced by `npm run validate` |
| `scripts/build.mjs` | Compiles event YAMLs into `web/data/events.json` |
| `scripts/validate.mjs` | Schema check on every event YAML |
| `scripts/ical.mjs` | Generates `web/data/calendar.ics` and per-area feeds |
| `web/` | The static site (HTML + Tailwind + Alpine.js, no build framework) |
| `.claude/commands/refresh-events.md` | Slash command wrapper |
| `.claude/skills/refresh-events/` | The refresh protocol that Claude follows |

## Local development

```bash
npm install
npm run all      # validate + build + ical
npm run dev      # builds, then serves web/ on http://localhost:8000
```

`web/data/` is build output (gitignored) — `npm run all` regenerates it.

## Refreshing the data

```bash
# In Claude Code, with this repo open:
/refresh-events
```

Claude reads `data/series.yaml`, triages which events need re-verification (events with imminent deadlines verified every run, mid-range every cadence, far-out monthly), hits the official sites, updates the YAML files, validates, builds, and opens a PR. Cadence is configured in `data/meta.yaml` (default: 15 days). The page banner turns red when a refresh is overdue.

To restrict a refresh to specific series:

```bash
/refresh-events sigcomm bracis
```

## Subscribing to deadlines

The build emits one full-feed iCal plus a per-area feed for each area that has events. Add by URL in any calendar app:

| Feed | URL |
|---|---|
| Everything | `https://muanlartins.github.io/labnet-calendar/data/calendar.ics` |
| Networking | `https://muanlartins.github.io/labnet-calendar/data/calendar-networking.ics` |
| ML / AI | `https://muanlartins.github.io/labnet-calendar/data/calendar-ml.ics` |
| Security | `https://muanlartins.github.io/labnet-calendar/data/calendar-security.ics` |
| (other areas) | `…/data/calendar-<area-id>.ics` |

For a single event, click "Download .ics" inside its detail panel.

## Contributing

- **Missing event** → file an issue using the *Suggest an event* template; the next refresh will import it.
- **Wrong date or field** → file an issue using the *Report incorrect data* template with a link to the official source.
- **New series** → PR an entry to `data/series.yaml` (see `.claude/skills/refresh-events/series-watchlist.md` for the schema). The next refresh will seed editions.
- **Direct edits** are welcome; keep `last_verified` accurate and run `npm run validate` before pushing.

## How this differs from existing trackers

[AI Deadlines](https://aideadlin.es) covers ML only and depends on community PRs. [WikiCFP](http://www.wikicfp.com/cfp/) is broad but stale and crowdsourced. This calendar tries to thread the needle: broad scope (all of CS, with explicit Brazilian/SBC coverage), high data quality (every change cites a source on the official site), and low maintenance burden (one human runs `/refresh-events` every two weeks instead of curating PRs).

## License

MIT — see `LICENSE`.

## Credits

Maintained by Luan Martins ([LabNet — PESC/COPPE/UFRJ](https://labnet.nce.ufrj.br/)). Architecture inspired by [aideadlin.es](https://aideadlin.es). Refreshed by [Claude Code](https://claude.com/product/claude-code).
