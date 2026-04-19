import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, extname } from "node:path";
import yaml from "js-yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const tags = yaml.load(readFileSync(join(ROOT, "data/tags.yaml"), "utf8"));
const baseSchema = JSON.parse(readFileSync(join(ROOT, "schema/event.schema.json"), "utf8"));

const areaIds = tags.areas.map((a) => a.id);
const regionIds = tags.regions.map((r) => r.id);
const allSubareas = Object.values(tags.subareas).flat();

const schema = structuredClone(baseSchema);
schema.properties.areas.items.enum = areaIds;
schema.properties.subareas.items.enum = allSubareas;
schema.properties.region.enum = regionIds;
schema.properties.society.enum = [...tags.societies, null];
schema.properties.type.enum = ["conference", "workshop", "symposium", "journal", "special_issue"];
schema.properties.tier.properties.qualis.enum = [...tags.tiers.qualis, null];
schema.properties.tier.properties.core.enum = [...tags.tiers.core, null];
schema.properties.tier.properties.custom.enum = [...tags.tiers.custom, null];
schema.properties.location.properties.mode.enum = tags.modes;
schema.properties.deadlines.items.properties.kind.enum = tags.deadline_kinds;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const eventsDir = join(ROOT, "data/events");
const files = readdirSync(eventsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

const seenIds = new Set();
const seriesIndex = new Map();
let errors = 0;

const events = files.map((file) => {
  const path = join(eventsDir, file);
  const stem = basename(file, extname(file));
  const event = yaml.load(readFileSync(path, "utf8"));
  return { file, path, stem, event };
});

for (const { file, stem, event } of events) {
  const fail = (msg) => { console.error(`  ✗ ${file}: ${msg}`); errors++; };

  if (!event || typeof event !== "object") { fail("not an object"); continue; }

  if (!validate(event)) {
    for (const e of validate.errors) fail(`${e.instancePath || "/"} ${e.message}`);
    continue;
  }

  if (event.id !== stem) fail(`id "${event.id}" does not match filename stem "${stem}"`);
  if (seenIds.has(event.id)) fail(`duplicate id "${event.id}"`);
  seenIds.add(event.id);

  if (event.subareas) {
    const allowed = new Set(event.areas.flatMap((a) => tags.subareas[a] || []));
    for (const sub of event.subareas) {
      if (!allowed.has(sub)) fail(`subarea "${sub}" is not valid for areas [${event.areas.join(", ")}]`);
    }
  }

  if (!seriesIndex.has(event.series_id)) seriesIndex.set(event.series_id, []);
  seriesIndex.get(event.series_id).push(event);
}

const idSet = new Set(events.map((e) => e.event.id));
for (const { file, event } of events) {
  if (event.parent_id && !idSet.has(event.parent_id)) {
    console.error(`  ✗ ${file}: parent_id "${event.parent_id}" does not match any existing event`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} validation error(s) across ${files.length} event file(s).`);
  process.exit(1);
}

console.log(`✓ ${files.length} event(s) valid · ${seriesIndex.size} series · ${areaIds.length} areas`);
