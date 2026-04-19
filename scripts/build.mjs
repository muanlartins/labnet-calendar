import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const tags = yaml.load(readFileSync(join(ROOT, "data/tags.yaml"), "utf8"));
const meta = yaml.load(readFileSync(join(ROOT, "data/meta.yaml"), "utf8"));

const eventsDir = join(ROOT, "data/events");
const files = readdirSync(eventsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
const events = files.map((f) => yaml.load(readFileSync(join(eventsDir, f), "utf8")));

const today = new Date().toISOString().slice(0, 10);

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s.length === 10 ? s + "T00:00:00Z" : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function nextDeadline(event, now) {
  if (!event.deadlines) return null;
  const future = event.deadlines
    .map((d) => ({ ...d, parsed: parseDate(d.date) }))
    .filter((d) => d.parsed && d.parsed >= now)
    .sort((a, b) => a.parsed - b.parsed);
  return future[0] || null;
}

function status(event, now) {
  const end = parseDate(event.event_dates?.end || event.event_dates?.start);
  if (end && end < now) return "past";
  const next = nextDeadline(event, now);
  if (next) {
    const days = Math.ceil((next.parsed - now) / 86400000);
    if (days <= 7) return "deadline-imminent";
    if (days <= 30) return "deadline-soon";
    return "deadline-future";
  }
  return "no-open-deadline";
}

const now = new Date();
const enriched = events.map((event) => {
  const next = nextDeadline(event, now);
  return {
    ...event,
    derived: {
      status: status(event, now),
      next_deadline: next ? { kind: next.kind, date: next.date, timezone: next.timezone || null, days_until: Math.ceil((next.parsed - now) / 86400000) } : null,
    },
  };
});

enriched.sort((a, b) => {
  const ad = a.derived.next_deadline ? new Date(a.derived.next_deadline.date) : new Date(a.event_dates?.start || "9999-12-31");
  const bd = b.derived.next_deadline ? new Date(b.derived.next_deadline.date) : new Date(b.event_dates?.start || "9999-12-31");
  return ad - bd;
});

const cadenceMs = meta.cadence_days * 86400000;
const lastRefresh = new Date(meta.last_refresh + "T00:00:00Z");
const nextRefreshDate = new Date(lastRefresh.getTime() + cadenceMs);
const refreshOverdue = now > nextRefreshDate;

const output = {
  generated_at: new Date().toISOString(),
  meta: {
    ...meta,
    next_refresh: nextRefreshDate.toISOString().slice(0, 10),
    refresh_overdue: refreshOverdue,
  },
  tags,
  events: enriched,
  counts: {
    total: enriched.length,
    by_area: Object.fromEntries(tags.areas.map((a) => [a.id, enriched.filter((e) => e.areas.includes(a.id)).length])),
    by_region: Object.fromEntries(tags.regions.map((r) => [r.id, enriched.filter((e) => e.region === r.id).length])),
    by_status: enriched.reduce((acc, e) => { acc[e.derived.status] = (acc[e.derived.status] || 0) + 1; return acc; }, {}),
  },
};

const outDir = join(ROOT, "web/data");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "events.json"), JSON.stringify(output, null, 2));

console.log(`✓ web/data/events.json — ${enriched.length} event(s), refresh ${refreshOverdue ? "OVERDUE" : "OK"} (next due ${output.meta.next_refresh})`);
