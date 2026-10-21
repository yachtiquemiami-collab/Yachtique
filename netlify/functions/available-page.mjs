// GET /available
// "Available this week": every yacht with a free day in the next seven days, straight from the yacht calendars.
// Free = no booking that day; partly booked = another charter that day, some hours may still be free.
import { SITE, WA, V, loadFleet, simCard, unavailable, page, html, esc, money } from "../lib/site.mjs";

export default async (req) => {
  const fleet = await loadFleet(req);
  if (!fleet) return html(page({ title: "Yachtique", body: unavailable(), canonical: `${SITE}/available` }), 503, "no-store");

  const days = nextDays(7);
  const rows = fleet
    .filter((y) => y.busy && y.images && y.images.length)
    .map((y) => {
      const free = days.filter((d) => !y.busy[d.key]).map((d) => d.key);
      const partial = days.filter((d) => y.busy[d.key] === "partial").map((d) => d.key);
      return { y, free, partial };
    })
    .filter((r) => r.free.length || r.partial.length)
    .sort((a, b) => b.free.length - a.free.length || (a.y.featured < 0) - (b.y.featured < 0) || a.y.from - b.y.from);

  const weekend = days.filter((d) => d.dow === 0 || d.dow === 6 || d.dow === 5).map((d) => d.key);
  const freeWeekend = rows.filter((r) => r.free.some((k) => weekend.includes(k))).length;
  const from = rows.length ? Math.min(...rows.map((r) => r.y.from)) : 0;

  return html(page({
    title: "Yachts available this week in Miami | Yachtique",
    description: "Private yachts with free days in the next seven days in Miami, Fort Lauderdale and the Bahamas. Live from the yacht calendars, updated every hour.",
    canonical: `${SITE}/available`,
    es: {
      _title: "Yates disponibles esta semana en Miami | Yachtique",
      "av.eyebrow": "Disponibilidad en vivo", "av.title": "Disponibles esta semana",
      "av.intro": "Yates con días libres en los próximos siete días, directamente de los calendarios de cada yate. Se actualiza cada hora.",
      "av.count": "Yates libres esta semana", "av.weekend": "Libres este fin de semana", "av.from": "Tarifa desde",
      "av.all": "Toda la semana", "av.free": "Libre", "av.part": "Parcial", "av.legend.free": "Día libre", "av.legend.part": "Parcialmente reservado",
      "av.none": "Esta semana está completa. Escríbanos y le buscaremos la mejor alternativa.",
      "av.other": "¿Otra fecha?", "av.other.p": "Elija cualquier fecha en la página de inicio y le mostramos los yates libres ese día.",
      "av.other.btn": "Buscar otra fecha", "av.empty": "Ningún yate libre ese día. Pruebe otro día o escríbanos.",
      "av.hold": "Los fines de semana se llenan rápido. Escríbanos por WhatsApp para reservar el suyo.",
    },
    body: body(days, rows, freeWeekend, from),
  }), 200);
};

export const config = { path: ["/available", "/available/"] };

// Today and the next days in Miami time
function nextDays(n) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    return {
      key: dt.toISOString().slice(0, 10),
      dow: dt.getUTCDay(),
      label: dt.toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }),
    };
  });
}

function body(days, rows, freeWeekend, from) {
  const counts = Object.fromEntries(days.map((d) => [d.key, rows.filter((r) => r.free.includes(d.key) || r.partial.includes(d.key)).length]));
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent("Hi Yachtique, I'd like a yacht this week.")}`;
  return `
<main class="ypage avpage">
  <div class="container">
    <header class="avhead">
      <p class="eyebrow" data-i18n="av.eyebrow">Live availability</p>
      <h1 class="ypage__title" data-i18n="av.title">Available this week</h1>
      <p class="lead" data-i18n="av.intro">Yachts with free days in the next seven days, straight from each yacht's calendar. Updated every hour.</p>
      <ul class="ahero__facts avfacts">
        <li><b>${rows.length}</b><span data-i18n="av.count">Yachts free this week</span></li>
        <li><b>${freeWeekend}</b><span data-i18n="av.weekend">Free this weekend</span></li>
        ${from ? `<li><b>${money(from)}</b><span data-i18n="av.from">Starting rate</span></li>` : ""}
      </ul>
    </header>

    <div class="daybar" id="dayBar" role="group" aria-label="Choose a day">
      <button type="button" class="is-active" data-day=""><span data-i18n="av.all">All week</span><b>${rows.length}</b></button>
      ${days.map((d) => `<button type="button" data-day="${d.key}" data-date="${d.key}"><span class="js-daylabel">${esc(d.label)}</span><b>${counts[d.key]}</b></button>`).join("")}
    </div>
    <p class="avlegend"><i class="is-free"></i><span data-i18n="av.legend.free">Free day</span> <i class="is-part"></i><span data-i18n="av.legend.part">Partly booked</span></p>

    ${rows.length ? `<div class="fleet__grid avgrid" id="avGrid">${rows.map((r) => avCard(r, days)).join("")}</div>
    <p class="avempty" id="avEmpty" hidden data-i18n="av.empty">No yacht is free that day. Try another day or message us.</p>`
      : `<p class="lead" data-i18n="av.none">This week is fully booked. Message us and we'll find you the best alternative.</p>`}

    <section class="acta">
      <div>
        <h2 class="title" data-i18n="av.other">Another date?</h2>
        <p class="lead" data-i18n="av.other.p">Pick any date on the home page and we show you the yachts free that day.</p>
      </div>
      <div class="acta__btns">
        <a href="${esc(wa)}" data-wa-es="Hola Yachtique, me gustaría un yate esta semana." class="btn btn--wa" target="_blank" rel="noopener" data-track="available-cta"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.chat">Chat on WhatsApp</span></a>
        <a href="/#top" class="btn btn--gold" data-i18n="av.other.btn">Search another date</a>
      </div>
    </section>
  </div>
</main>

<div class="mobilebar">
  <a href="${esc(wa)}" data-wa-es="Hola Yachtique, me gustaría un yate esta semana." target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="/#contact" class="mobilebar__gold" data-i18n="mb.enquire">Enquire</a>
</div>
<script src="/assets/js/available.js?v=${V}" defer></script>`;
}

function avCard(r, days) {
  const chips = days.map((d) => {
    const st = r.free.includes(d.key) ? "free" : r.partial.includes(d.key) ? "part" : "";
    return st ? `<li class="is-${st}" data-date="${d.key}"><span class="js-daylabel">${esc(d.label)}</span></li>` : "";
  }).join("");
  const card = simCard(r.y, `data-free="${r.free.join(" ")}" data-part="${r.partial.join(" ")}"`);
  // Day chips go under the model line
  return card.replace('<p class="yacht__model">', `<ul class="adays">${chips}</ul><p class="yacht__model">`);
}
