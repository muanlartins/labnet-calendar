import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const tags = yaml.load(readFileSync(join(ROOT, "data/tags.yaml"), "utf8"));
const eventsDir = join(ROOT, "data/events");
const events = readdirSync(eventsDir)
  .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
  .map((f) => yaml.load(readFileSync(join(eventsDir, f), "utf8")));

const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function dtFromIso(iso) {
  if (!iso) return null;
  const date = iso.length === 10 ? iso + "T23:59:00Z" : (iso.endsWith("Z") ? iso : iso + "Z");
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function eventToVevents(event) {
  const out = [];
  for (const dl of (event.deadlines || [])) {
    const dt = dtFromIso(dl.date);
    if (!dt) continue;
    out.push(
      "BEGIN:VEVENT",
      `UID:${event.id}-${dl.kind}@labnet-calendar`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dt}`,
      `DTEND:${dt}`,
      `SUMMARY:${esc(`${event.name} ${event.edition} — ${dl.kind.replace("_", " ")} deadline`)}`,
      ...(event.url ? [`URL:${esc(event.url)}`] : []),
      ...(dl.timezone || dl.note ? [`DESCRIPTION:${esc((dl.timezone ? `Timezone: ${dl.timezone}` : "") + (dl.note ? ` · ${dl.note}` : ""))}`] : []),
      "END:VEVENT",
    );
  }
  if (event.event_dates?.start) {
    const sd = event.event_dates.start.replace(/-/g, "");
    const endIso = event.event_dates.end || event.event_dates.start;
    const endDate = new Date(endIso + "T00:00:00Z");
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const ed = endDate.toISOString().slice(0, 10).replace(/-/g, "");
    out.push(
      "BEGIN:VEVENT",
      `UID:${event.id}-event@labnet-calendar`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${sd}`,
      `DTEND;VALUE=DATE:${ed}`,
      `SUMMARY:${esc(`${event.name} ${event.edition}`)}`,
      ...(event.location?.city || event.location?.country
        ? [`LOCATION:${esc([event.location.city, event.location.country].filter(Boolean).join(", "))}`]
        : []),
      ...(event.url ? [`URL:${esc(event.url)}`] : []),
      "END:VEVENT",
    );
  }
  return out;
}

function buildCalendar(name, eventList) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//labnet-calendar//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(name)}`,
    "METHOD:PUBLISH",
  ];
  for (const e of eventList) lines.push(...eventToVevents(e));
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

const outDir = join(ROOT, "web/data");
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, "calendar.ics"), buildCalendar("LabNet Calendar — all events", events));

let perAreaCount = 0;
for (const area of tags.areas) {
  const subset = events.filter((e) => e.areas.includes(area.id));
  if (!subset.length) continue;
  writeFileSync(join(outDir, `calendar-${area.id}.ics`), buildCalendar(`LabNet Calendar — ${area.name}`, subset));
  perAreaCount++;
}

console.log(`✓ web/data/calendar.ics (${events.length} events) + ${perAreaCount} per-area feed(s)`);
