// GET /locations
// Where we charter: every area (AREAS in ../lib/site.mjs) with a photo of a yacht that leaves from there, its
// marinas, how many yachts leave from each and the lowest 4-hour price there, and a link to the area page.
import { SITE, WA, V, AREAS, AREAS_ES, yachtsIn, loadFleet, unavailable, page, html, esc, money, sized } from "../lib/site.mjs";

export default async (req) => {
  const fleet = await loadFleet(req);
  if (!fleet) return html(page({ title: "Yachtique", body: unavailable(), canonical: `${SITE}/locations` }), 503, "no-store");

  const areas = AREAS.map((area) => {
    const yachts = yachtsIn(fleet, area);
    const local = yachts.filter((y) => (y.locations || []).some((l) => area.match.test(l)));
    const cover = (local.find((y) => y.featured >= 0) || local[0] || yachts[0] || {}).images;
    // Marinas in this area, each with the yachts leaving from it and their lowest price there
    const marinas = new Map();
    for (const y of yachts) {
      for (const d of y.departures || []) {
        if (!area.match.test(d.name)) continue;
        const key = d.name.toLowerCase().replace(/\s+/g, "");
        const low = Math.min(...Object.values(d.prices));
        const m = marinas.get(key) || { name: d.name, yachts: 0, from: Infinity };
        m.yachts++;
        m.from = Math.min(m.from, low);
        marinas.set(key, m);
      }
    }
    // Bimini & the Bahamas: the Bimini day trip or a Bahamas marina, not a 4-hour Miami charter
    const bimini = area.bimini ? yachts.flatMap((y) => y.durations.filter((d) => /bimini/i.test(d.label)).map((d) => d.price)) : [];
    const lows = area.bimini ? [...bimini, ...[...marinas.values()].map((m) => m.from)] : yachts.map((y) => y.from);
    const from = lows.length ? Math.min(...lows) : 0;
    return { area, yachts, cover, from, marinas: [...marinas.values()].sort((a, b) => b.yachts - a.yachts) };
  });
  const totalMarinas = areas.reduce((n, a) => n + a.marinas.length, 0);

  return html(page({
    title: "Where we charter: Miami, Fort Lauderdale, Palm Beach, Keys & Bahamas | Yachtique",
    description: `Private yacht charters from ${totalMarinas} marinas across South Florida and the Bahamas: Miami Beach, Coconut Grove, Fort Lauderdale, Palm Beach, Key West, Bimini and Nassau.`,
    canonical: `${SITE}/locations`,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Where Yachtique charters",
      itemListElement: AREAS.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/yacht-charter/${a.slug}`, name: a.name })),
    },
    body: body(areas, totalMarinas),
    es: {
      "nav.home": "Inicio",
      _title: "Dónde navegamos: Miami, Fort Lauderdale, Palm Beach, los Cayos y Bahamas | Yachtique",
      "l.eyebrow": "Destinos", "l.title": "Dónde navegamos",
      "l.lead": "De Palm Beach a Key West y las Bahamas. Elija la zona y el puerto que le quedan mejor: le enviamos los yates libres desde allí.",
      "l.areas": "Zonas", "l.marinas": "Puertos de salida", "l.yachts": "Yates",
      "l.from": "Desde", "l.boats1": "yate", "l.boats": "yates", "l.see": "Ver los yates", "l.map": "Mapa",
      "l.plan": "¿No sabe desde dónde salir?", "l.plan.p": "Díganos dónde se aloja y qué le gustaría ver. Le recomendamos el puerto y el yate.",
      ...Object.fromEntries(AREAS.flatMap((a) => [[`l.name.${a.slug}`, (AREAS_ES[a.slug] || {}).name || a.name], [`l.intro.${a.slug}`, (AREAS_ES[a.slug] || {}).intro || a.intro]])),
    },
  }), 200);
};

export const config = { path: ["/locations", "/locations/"] };

function body(areas, totalMarinas) {
  const yachtsTotal = new Set(areas.flatMap((a) => a.yachts.map((y) => y.handle))).size;
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent("Hi Yachtique, which marina is best for us?")}`;
  return `
<main class="ypage lpage">
  <div class="container">
    <nav class="ypage__crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="nav.home">Home</a><span>/</span><span data-i18n="l.eyebrow">Locations</span></nav>
    <p class="eyebrow" data-i18n="l.eyebrow">Locations</p>
    <h1 class="ypage__title" data-i18n="l.title">Where we charter</h1>
    <p class="lead lpage__lead" data-i18n="l.lead">From Palm Beach to Key West and the Bahamas. Pick the area and marina that suit you best, and we send you the yachts that are free from there.</p>
    <ul class="ahero__facts lpage__facts">
      <li><b>${areas.length}</b><span data-i18n="l.areas">Areas</span></li>
      <li><b>${totalMarinas}</b><span data-i18n="l.marinas">Departure points</span></li>
      <li><b>${yachtsTotal}</b><span data-i18n="l.yachts">Yachts</span></li>
    </ul>

    <div class="lcards">
      ${areas.map(({ area, yachts, cover, from, marinas }) => `
      <article class="lcard">
        <a class="lcard__media" href="/yacht-charter/${area.slug}">
          <img src="${esc(area.photo)}" alt="${esc(area.photoAlt)}" loading="lazy" width="1400" height="1050">
          ${cover && cover[0] ? `<span class="lcard__yacht"><img src="${esc(sized(cover[0], 400))}" alt="A yacht that departs from ${esc(area.short)}" loading="lazy"></span>` : ""}
        </a>
        <div class="lcard__body">
          <h2><a href="/yacht-charter/${area.slug}" data-i18n="l.name.${area.slug}">${esc(area.name)}</a></h2>
          <p data-i18n="l.intro.${area.slug}">${esc(area.intro)}</p>
          ${marinas.length ? `<ul class="lmarinas">${marinas.map((m) => `
            <li><b>${esc(m.name)}</b><span>${m.yachts} <span data-i18n="${m.yachts === 1 ? "l.boats1" : "l.boats"}">${m.yachts === 1 ? "yacht" : "yachts"}</span> · <span data-i18n="l.from">From</span> ${money(m.from)}</span>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.name + ", Florida")}" target="_blank" rel="noopener" data-i18n="l.map">Map</a></li>`).join("")}
          </ul>` : ""}
          <a class="btn btn--ghost" href="/yacht-charter/${area.slug}"><span data-i18n="l.see">See the yachts</span> (${yachts.length})${from ? ` · <span data-i18n="l.from">From</span> ${money(from)}` : ""}</a>
        </div>
      </article>`).join("")}
    </div>

    <section class="acta">
      <div>
        <h2 class="title" data-i18n="l.plan">Not sure where to start from?</h2>
        <p class="lead" data-i18n="l.plan.p">Tell us where you're staying and what you'd like to see. We'll recommend the marina and the yacht.</p>
      </div>
      <div class="acta__btns">
        <a href="${esc(wa)}" data-wa-es="Hola Yachtique, ¿qué puerto nos conviene más?" class="btn btn--wa" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.chat">Chat on WhatsApp</span></a>
        <a href="/#contact" class="btn btn--gold" data-i18n="btn.enquiry">Send an inquiry</a>
      </div>
    </section>
  </div>
</main>
<div class="mobilebar">
  <a href="${esc(wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="/#contact" class="mobilebar__gold" data-i18n="mb.enquire">Inquire</a>
</div>
<script src="/assets/js/yacht.js?v=${V}" defer></script>`;
}
