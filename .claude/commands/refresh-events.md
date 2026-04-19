---
description: Refresh academic event data from official conference websites and open a PR
---

Load the `refresh-events` skill from `.claude/skills/refresh-events/SKILL.md` and execute the full refresh protocol against this repository.

Inputs to consider:
- `data/meta.yaml` — current refresh state and cadence
- `data/series.yaml` — the watch list of conference series to track
- `data/events/*.yaml` — all currently tracked event editions

Output: a single pull request titled `refresh: YYYY-MM-DD` that contains updated/added event YAMLs, a bumped `last_refresh` in `data/meta.yaml`, and a regenerated `web/data/events.json`. Validation (`npm run validate`) must pass before the PR is opened.

If the user passes arguments to this command (e.g. `/refresh-events sigcomm`), restrict the run to series matching those identifiers — useful for testing or one-off corrections.
