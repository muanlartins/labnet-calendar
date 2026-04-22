const AREA_COLORS = {
  networking: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  ml: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
  security: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  systems: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  data: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30",
  theory: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30",
  hci: "bg-pink-500/15 text-pink-300 ring-1 ring-pink-500/30",
  graphics: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  pl: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
  se: "bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/30",
  architecture: "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30",
  compilers: "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30",
  crypto: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  bio: "bg-green-500/15 text-green-300 ring-1 ring-green-500/30",
  quantum: "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30",
  education: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30",
  general: "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/30",
};

const DOT_COLORS = {
  networking: "bg-sky-400", ml: "bg-violet-400", security: "bg-rose-400",
  systems: "bg-amber-400", data: "bg-teal-400", theory: "bg-indigo-400",
  hci: "bg-pink-400", graphics: "bg-emerald-400", pl: "bg-orange-400",
  se: "bg-lime-400", architecture: "bg-cyan-400", compilers: "bg-fuchsia-400",
  crypto: "bg-red-400", bio: "bg-green-400", quantum: "bg-purple-400",
  education: "bg-yellow-400", general: "bg-zinc-400",
};

const MONTHS_TO_SHOW = 6;

function calendarApp() {
  return {
    data: { events: [], tags: { areas: [], regions: [], societies: [], tiers: { qualis: [] }, modes: [] }, counts: { by_area: {}, by_region: {} }, meta: null },
    view: "list",
    sort: "next_deadline",
    q: "",
    window: null,
    filtersOpen: false,
    selectedEvent: null,
    error: null,
    filters: { areas: [], regions: [], types: [], societies: [], qualis: [], modes: [] },

    async init() {
      try {
        const r = await fetch("./data/events.json", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        Object.assign(this.data, j);
        this._applyHash();
        window.addEventListener("hashchange", () => this._applyHash());
        window.addEventListener("popstate", () => this._applyHash());
      } catch (err) {
        this.error = String(err);
        console.error("[labnet-calendar] failed to load events.json:", err);
      }
    },

    openEvent(e) {
      if (!e) return;
      this.selectedEvent = e;
      this._syncHash();
    },

    openEventById(id) {
      const e = this.data.events.find((x) => x.id === id);
      if (e) this.openEvent(e);
    },

    closeOverlay() {
      this.selectedEvent = null;
      this._syncHash();
    },

    _syncHash() {
      const h = this.selectedEvent ? `#/event/${this.selectedEvent.id}` : "";
      const url = location.pathname + location.search + h;
      if (location.pathname + location.search + location.hash !== url) {
        history.replaceState(null, "", url);
      }
    },

    _applyHash() {
      const raw = (location.hash || "").replace(/^#\/?/, "");
      if (!raw) { this.selectedEvent = null; return; }
      const slash = raw.indexOf("/");
      const kind = slash < 0 ? raw : raw.slice(0, slash);
      const id   = slash < 0 ? ""  : raw.slice(slash + 1);
      if (kind === "event" && id) {
        const e = this.data.events.find((x) => x.id === id);
        if (e) { this.selectedEvent = e; return; }
      }
      this.selectedEvent = null;
      history.replaceState(null, "", location.pathname + location.search);
    },

    toggleQualis(q) {
      const i = this.filters.qualis.indexOf(q);
      if (i >= 0) this.filters.qualis.splice(i, 1);
      else this.filters.qualis.push(q);
    },

    toggleMode(m) {
      const i = this.filters.modes.indexOf(m);
      if (i >= 0) this.filters.modes.splice(i, 1);
      else this.filters.modes.push(m);
    },

    resetFilters() {
      this.filters = { areas: [], regions: [], types: [], societies: [], qualis: [], modes: [] };
      this.window = null;
      this.q = "";
    },

    areaName(id) {
      return this.data.tags.areas.find((a) => a.id === id)?.name || id;
    },

    areaColor(id) {
      return AREA_COLORS[id] || AREA_COLORS.general;
    },

    dotColor(id) {
      return DOT_COLORS[id] || DOT_COLORS.general;
    },

    countdownColor(days) {
      if (days <= 7) return "text-rose-400";
      if (days <= 30) return "text-amber-400";
      if (days <= 90) return "text-zinc-200";
      return "text-zinc-500";
    },

    formatDateRange(start, end) {
      if (!start) return "";
      const s = new Date(start + "T00:00:00Z");
      const opts = { month: "short", day: "numeric" };
      const sStr = s.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
      if (!end || end === start) return `${sStr} ${s.getUTCFullYear()}`;
      const e = new Date(end + "T00:00:00Z");
      const eStr = e.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
      return `${sStr} – ${eStr} ${s.getUTCFullYear()}`;
    },

    matches(e) {
      if (this.filters.areas.length && !this.filters.areas.some((a) => e.areas.includes(a))) return false;
      if (this.filters.regions.length && !this.filters.regions.includes(e.region)) return false;
      if (this.filters.types.length && !this.filters.types.includes(e.type)) return false;
      if (this.filters.societies.length && !this.filters.societies.includes(e.society)) return false;
      if (this.filters.qualis.length && !this.filters.qualis.includes(e.tier?.qualis)) return false;
      if (this.filters.modes.length && !this.filters.modes.includes(e.location?.mode)) return false;
      if (this.window) {
        const days = e.derived?.next_deadline?.days_until;
        if (days == null || days < 0 || days > this.window) return false;
      }
      if (this.q) {
        const q = this.q.toLowerCase();
        const hay = [e.name, e.full_name, e.notes, ...(e.tags || []), ...(e.areas || []), ...(e.subareas || [])].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    },

    get filtered() {
      const arr = this.data.events.filter((e) => this.matches(e));
      const dateOf = (e) => {
        if (this.sort === "name") return null;
        if (this.sort === "event_start") return e.event_dates?.start ? new Date(e.event_dates.start) : new Date("9999");
        return e.derived?.next_deadline ? new Date(e.derived.next_deadline.date) : new Date(e.event_dates?.start || "9999");
      };
      if (this.sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
      else arr.sort((a, b) => dateOf(a) - dateOf(b));
      return arr;
    },

    get calendarMonths() {
      const months = [];
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10);
      const start = new Date(today.getFullYear(), today.getMonth(), 1);

      const deadlinesByDay = new Map();
      const eventSpansByDay = new Map();

      for (const e of this.filtered) {
        for (const d of (e.deadlines || [])) {
          const key = d.date.slice(0, 10);
          if (!deadlinesByDay.has(key)) deadlinesByDay.set(key, []);
          deadlinesByDay.get(key).push({ event: e, deadline: d });
        }
        if (e.event_dates?.start) {
          const sd = new Date(e.event_dates.start + "T00:00:00Z");
          const ed = new Date((e.event_dates.end || e.event_dates.start) + "T00:00:00Z");
          for (let d = new Date(sd); d <= ed; d.setUTCDate(d.getUTCDate() + 1)) {
            const key = d.toISOString().slice(0, 10);
            if (!eventSpansByDay.has(key)) eventSpansByDay.set(key, []);
            eventSpansByDay.get(key).push({ event: e });
          }
        }
      }

      for (let i = 0; i < MONTHS_TO_SHOW; i++) {
        const monthDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const label = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells = [];
        let monthDeadlineCount = 0;

        for (let p = 0; p < firstDow; p++) cells.push({ key: `pad-${i}-${p}`, day: null });

        for (let day = 1; day <= daysInMonth; day++) {
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const deadlines = deadlinesByDay.get(key) || [];
          const eventSpans = (eventSpansByDay.get(key) || []).slice(0, 3);
          monthDeadlineCount += deadlines.length;
          cells.push({ key, day, isToday: key === todayKey, deadlines, eventSpans });
        }

        while (cells.length % 7 !== 0) cells.push({ key: `tail-${i}-${cells.length}`, day: null });

        months.push({ key: `${year}-${month}`, label, cells, eventCount: monthDeadlineCount });
      }
      return months;
    },

    downloadIcs(event) {
      const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//labnet-calendar//EN", "CALSCALE:GREGORIAN"];
      const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

      const dtFromIso = (iso) => {
        if (!iso) return null;
        const date = iso.length === 10 ? iso + "T23:59:00" : iso;
        const d = new Date(date.endsWith("Z") ? date : date + "Z");
        return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };

      for (const dl of (event.deadlines || [])) {
        const dt = dtFromIso(dl.date);
        if (!dt) continue;
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${event.id}-${dl.kind}@labnet-calendar`);
        lines.push(`DTSTAMP:${stamp}`);
        lines.push(`DTSTART:${dt}`);
        lines.push(`DTEND:${dt}`);
        lines.push(`SUMMARY:${esc(event.name + " " + event.edition + " — " + dl.kind.replace("_"," ") + " deadline")}`);
        if (event.url) lines.push(`URL:${esc(event.url)}`);
        if (dl.timezone) lines.push(`DESCRIPTION:${esc("Timezone: " + dl.timezone + (dl.note ? " · " + dl.note : ""))}`);
        lines.push("END:VEVENT");
      }

      if (event.event_dates?.start) {
        const sd = event.event_dates.start.replace(/-/g, "");
        const endIso = event.event_dates.end || event.event_dates.start;
        const endDate = new Date(endIso + "T00:00:00Z");
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        const ed = endDate.toISOString().slice(0, 10).replace(/-/g, "");
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${event.id}-event@labnet-calendar`);
        lines.push(`DTSTAMP:${stamp}`);
        lines.push(`DTSTART;VALUE=DATE:${sd}`);
        lines.push(`DTEND;VALUE=DATE:${ed}`);
        lines.push(`SUMMARY:${esc(event.name + " " + event.edition)}`);
        if (event.location?.city || event.location?.country) {
          lines.push(`LOCATION:${esc([event.location.city, event.location.country].filter(Boolean).join(", "))}`);
        }
        if (event.url) lines.push(`URL:${esc(event.url)}`);
        lines.push("END:VEVENT");
      }

      lines.push("END:VCALENDAR");
      const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.id}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

window.calendarApp = calendarApp;
