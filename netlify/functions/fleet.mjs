// GET /api/fleet
// Pulls the YCN Miami fleet (yachts, photos, prices) from their Shopify store and each yacht's
// availability from its public Google Calendar, applies the Yachtique markup from
// ../fleet-config.mjs and returns one JSON list for the site. Netlify's CDN caches it for an hour.
import settings from "../fleet-config.mjs";

const STORE = "https://ycn.yachts";
const SKIP_TYPES = ["catering", "water toys"];
const TZ = "America/New_York";
const DAYS_AHEAD = 180;

export default async () => {
  try {
    const [products, cards] = await Promise.all([fetchProducts(), fetchBrokerCards()]);
    const hidden = new Set(settings.hide || []);

    const yachts = products
      .filter((p) => !SKIP_TYPES.includes(String(p.product_type).toLowerCase()))
      .filter((p) => !hidden.has(p.handle))
      .filter((p) => !settings.brokerListedOnly || p.handle in cards)
      .map((p) => ({ ...toYacht(p), ...(cards[p.handle] || {}) }))
      .filter((y) => y.durations.length);

    await Promise.all(
      yachts.map(async (y) => {
        const cal = y.calendar || (settings.calendars || {})[y.handle];
        delete y.calendar;
        y.busy = cal ? await fetchBusy(cal) : null;
      })
    );

    yachts.sort((a, b) => a.feet - b.feet || a.from - b.from);
    const featured = settings.featured || [];
    yachts.forEach((y) => { y.featured = featured.indexOf(y.handle); });

    return json({ updated: new Date().toISOString(), yachts }, 200, {
      "Netlify-CDN-Cache-Control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
      "Cache-Control": "public, max-age=300",
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Fleet temporarily unavailable" }, 502, { "Cache-Control": "no-store" });
  }
};

export const config = { path: "/api/fleet" };

// ---------- YCN products ----------

async function fetchProducts() {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${STORE}/products.json?limit=250&page=${page}`);
    if (!res.ok) throw new Error(`products.json ${res.status}`);
    const { products } = await res.json();
    all.push(...products);
    if (products.length < 250) break;
  }
  return all;
}

function toYacht(p) {
  // Titles look like "45ft Axopar | Bimini Blue"
  const [left, right] = decode(p.title).split("|").map((s) => s.trim());
  const name = right || left;
  const feet = parseInt((left.match(/(\d{2,3})\s*ft/i) || [])[1], 10) || 0;
  const builder = left.replace(/\d{2,3}\s*ft/i, "").trim();

  const durIdx = p.options.findIndex((o) => /duration/i.test(o.name));
  const locIdx = p.options.findIndex((o) => /location|pickup/i.test(o.name));
  const overrides = (settings.priceOverrides || {})[p.handle] || {};

  // Lowest price per duration across all pickup locations
  const best = {};
  for (const v of p.variants) {
    const dur = durIdx >= 0 ? v[`option${durIdx + 1}`] : "Charter";
    const price = parseFloat(v.price);
    if (!price) continue;
    if (!(dur in best) || price < best[dur]) best[dur] = price;
  }
  const order = durIdx >= 0 ? p.options[durIdx].values : Object.keys(best);
  const durations = order
    .filter((d) => d in best)
    .map((d) => ({ label: d, price: overrides[d] != null ? overrides[d] : markup(best[d]) }));

  const text = decode(String(p.body_html || "").replace(/<\/(p|h\d|li)>/gi, "\n").replace(/<[^>]+>/g, " "))
    .split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  const guests = parseGuests(text.join(" "));

  return {
    handle: p.handle,
    name,
    builder,
    feet,
    type: p.product_type,
    guests,
    summary: (text.find((s) => s.length > 80) || "").replace(/\bYCN( Miami)?\b/gi, "Yachtique"),
    images: (p.images || []).slice(0, 14).map((i) => i.src),
    durations,
    from: durations.length ? Math.min(...durations.map((d) => d.price)) : 0,
    locations: locIdx >= 0 ? p.options[locIdx].values : [],
  };
}

const WORDS = { six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20 };
function parseGuests(text) {
  // Day-charter capacity only: sentences about overnight/sleeping are skipped
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (/overnight|sleep|stateroom|cabin/i.test(sentence)) continue;
    const m = sentence.match(/(?:up to|welcomes|carries|for|accommodates?|cruising)\s+(\d{1,2}|[a-z]+)\s+(?:guests|passengers|people)/i)
      || sentence.match(/(\d{1,2}|[a-z]+)\s+(?:guests|passengers)\s+(?:cruising|for day|on day)/i);
    const n = m && (parseInt(m[1], 10) || WORDS[m[1].toLowerCase()]);
    if (n && n <= 150) return n;
  }
  return null;
}

function markup(price) {
  const step = settings.roundTo || 1;
  return Math.ceil((price * (1 + (settings.markup || 0))) / step) * step;
}

// ---------- Calendars ----------

// YCN's broker page has one card per yacht (<article id="ycn-yacht-HANDLE">) with its
// toys, crew, gratuity, cabins and Google Calendar.
async function fetchBrokerCards() {
  try {
    const res = await fetch(`${STORE}/pages/brokers`);
    if (!res.ok) return {};
    const html = await res.text();
    const cards = {};
    for (const chunk of html.split('<article id="ycn-yacht-').slice(1)) {
      const handle = chunk.slice(0, chunk.indexOf('"'));
      const card = chunk.slice(0, chunk.indexOf("</article>"));
      const info = {};
      const cal = card.match(/calendar\/embed\?src=([^&"\\]+)/);
      if (cal) info.calendar = decodeURIComponent(cal[1]);
      const text = decode(card.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
      const m = text.match(/Toys (.*?) Crew (.*?) Gratuity (.*?) Configuration (.*?) (?:Photos|Live calendar|Brochure|Share)/);
      if (m) {
        const list = (s) => s.split("•").map((x) => x.trim()).filter((x) => x && x !== "—");
        info.toys = list(m[1]);
        info.crew = list(m[2]);
        info.gratuityIncluded = /^included/i.test(m[3].trim());
        info.cabins = parseInt((m[4].match(/(\d+)\s*cabin/i) || [])[1], 10) || null;
        info.sleeps = parseInt((m[4].match(/sleeps\s*(\d+)/i) || [])[1], 10) || null;
      }
      cards[handle] = info;
    }
    return cards;
  } catch {
    return {};
  }
}

// Returns { "2026-10-30": "full" | "partial" } for the next DAYS_AHEAD days.
// Only dates are read from the calendar; event titles and details are never used.
async function fetchBusy(calendarId) {
  const url = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return parseIcs(await res.text());
  } catch {
    return null;
  }
}

function parseIcs(ics) {
  const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const today = nyDate(new Date());
  const limit = nyDate(new Date(Date.now() + DAYS_AHEAD * 864e5));
  const busy = {};
  const mark = (day, kind) => {
    if (day < today || day > limit) return;
    if (busy[day] !== "full") busy[day] = kind;
  };

  let ev = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") ev = {};
    else if (line === "END:VEVENT") {
      // Google marks all-day events as "free" by default, so TRANSP is ignored on purpose
      if (ev && ev.start && ev.status !== "CANCELLED") addEvent(ev, mark);
      ev = null;
    } else if (ev) {
      const i = line.indexOf(":");
      const key = line.slice(0, i);
      const val = line.slice(i + 1);
      if (key.startsWith("DTSTART")) ev.start = parseDt(key, val);
      else if (key.startsWith("DTEND")) ev.end = parseDt(key, val);
      else if (key === "STATUS") ev.status = val;
    }
  }
  return busy;
}

// All-day → { allDay, day }; timed → { day (NY date), t (ms, comparable within one event) }
function parseDt(key, val) {
  if (/VALUE=DATE(?!-)/.test(key) || /^\d{8}$/.test(val)) {
    return { allDay: true, day: `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}` };
  }
  const [, y, mo, d, h, mi, s] = val.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/) || [];
  if (!y) return null;
  if (val.endsWith("Z")) {
    const date = new Date(Date.UTC(+y, mo - 1, +d, +h, +mi, +s));
    return { day: nyDate(date), t: date.getTime() };
  }
  // Local time (TZID=...): keep the wall-clock date; times are only compared to each other
  return { day: `${y}-${mo}-${d}`, t: Date.UTC(+y, mo - 1, +d, +h, +mi, +s) };
}

function addEvent(ev, mark) {
  const { start, end } = ev;
  if (start.allDay) {
    // DTEND is exclusive for all-day events
    const last = end && end.allDay ? addDays(end.day, -1) : start.day;
    for (let day = start.day; day <= last; day = addDays(day, 1)) mark(day, "full");
    return;
  }
  const hours = end && end.t ? (end.t - start.t) / 36e5 : 0;
  if (hours >= 20) {
    for (let day = start.day; day <= end.day; day = addDays(day, 1)) mark(day, "full");
  } else {
    mark(start.day, "partial");
  }
}

// ---------- helpers ----------

function nyDate(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function decode(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;|&mdash;/g, "-");
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
