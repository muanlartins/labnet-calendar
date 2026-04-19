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

## Refreshing the data

```bash
# In Claude Code, with this repo open:
/refresh-events
```

Claude reads `data/series.yaml`, triages which events need re-verification, hits the official sites, updates YAML files, validates, builds, and opens a PR. Cadence is configured in `data/meta.yaml`.

## Contributing

- **Found a bug or missing event?** Open an issue.
- **Want to add a series?** Edit `data/series.yaml` and PR — the next refresh will seed editions.
- **Direct event edits** are welcome; please keep `last_verified` accurate and run `npm run validate` before pushing.

## License

MIT — see `LICENSE`.
