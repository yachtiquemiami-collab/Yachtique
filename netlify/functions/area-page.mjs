// GET /yacht-charter/:area
// One landing page per charter area (Miami Beach, Fort Lauderdale, Bahamas...), listing the yachts
// that depart from there. Areas and their wording live in ../lib/site.mjs (AREAS).
import { SITE, WA, V, AREAS, AREAS_ES, yachtsIn, loadFleet, simCard, unavailable, page, html, esc, json, money, sized } from "../lib/site.mjs";

export default async (req, context) => {
  const slug = (context.params && context.params.area) || "";
  const area = AREAS.find((a) => a.slug === slug);
  if (!area) return Response.redirect(new URL("/#fleet", req.url), 302);

  const fleet = await loadFleet(req);
  if (!fleet) {
    return html(page({ title: "Yachtique", body: unavailable(), canonical: `${SITE}/yacht-charter/${slug}` }), 503, "no-store");
  }

  const yachts = yachtsIn(fleet, area).sort((a, b) => a.feet - b.feet);
  const from = yachts.length ? Math.min(...yachts.map((y) => y.from)) : 0;
  // Header photo: a featured yacht that really departs from this area, else any yacht that does
  const local = yachts.filter((y) => (y.locations || []).some((l) => area.match.test(l)));
  const cover = (local.find((y) => y.featured >= 0) || local[0] || yachts[0] || {}).images;
  const title = `Yacht charter in ${area.name} | Yachtique`;

  return html(page({
    title,
    description: area.seo,
    image: cover && cover[0] ? sized(cover[0], 1200) : `${SITE}/assets/img/og-image.png`,
    canonical: `${SITE}/yacht-charter/${area.slug}`,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Yacht charters in ${area.name}`,
      itemListElement: yachts.map((y, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/yachts/${y.handle}`, name: y.name })),
    },
    body: body(area, yachts, from, cover),
    es: areaEs(area, yachts.length),
  }), 200);
};

export const config = { path: ["/yacht-charter", "/yacht-charter/", "/yacht-charter/:area"] };

function areaEs(area, n) {
  const es = AREAS_ES[area.slug] || {};
  return {
    _title: `Alquiler de yates en ${es.name || area.name} | Yachtique`,
    "a.eyebrow": "Alquiler de yates", "a.name": es.name, "a.intro": es.intro, "a.short": es.short,
    "a.count": n === 1 ? "Yate disponible" : "Yates disponibles", "a.from": "Tarifa desde",
    "a.points1": "Punto de salida", "a.points": "Puntos de salida", "a.departs": "Sale desde",
    "a.none": "No hay yates aquí en este momento. Escríbanos y encontraremos el adecuado.",
    "a.plan": `Planifique su día en ${es.short || area.short}`,
    "a.plan.p": "Díganos la fecha y el número de invitados. Le respondemos con los yates libres, normalmente en menos de una hora.",
    "a.more": "Más zonas de alquiler",
  };
}

function body(area, yachts, from, cover) {
  // Unique departure points (YCN spells some marinas two ways, e.g. "Bay Street" / "Baystreet")
  const seen = new Set();
  const points = yachts.flatMap((y) => (y.locations || []).filter((l) => area.match.test(l)))
    .filter((l) => { const k = l.toLowerCase().replace(/\s+/g, ""); return seen.has(k) ? false : seen.add(k); });
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(`Hi Yachtique, I'd like to charter a yacht in ${area.name}.`)}`;
  return `
<main class="ypage apage">
  <section class="ahero">
    <div class="ahero__text">
      <nav class="ypage__crumbs" aria-label="Breadcrumb"><a href="/#fleet" data-i18n="crumb.fleet">The Fleet</a><span>/</span><span data-i18n="a.short">${esc(area.short)}</span></nav>
      <p class="eyebrow" data-i18n="a.eyebrow">Yacht charter</p>
      <h1 class="ypage__title" data-i18n="a.name">${esc(area.name)}</h1>
      <p class="ahero__intro" data-i18n="a.intro">${esc(area.intro)}</p>
      <ul class="ahero__facts">
        <li><b>${yachts.length}</b><span data-i18n="a.count">${yachts.length === 1 ? "Yacht" : "Yachts"} available</span></li>
        ${from ? `<li><b>${money(from)}</b><span data-i18n="a.from">Starting rate</span></li>` : ""}
        <li><b>${points.length || "—"}</b><span data-i18n="${points.length === 1 ? "a.points1" : "a.points"}">${points.length === 1 ? "Departure point" : "Departure points"}</span></li>
      </ul>
    </div>
    ${cover && cover[0] ? `<div class="ahero__media"><img src="${esc(sized(cover[0], 1600))}" alt="Yacht charter in ${esc(area.name)}" fetchpriority="high"></div>` : ""}
  </section>

  <div class="container">
    ${points.length ? `<p class="apoints"><span data-i18n="a.departs">Departs from</span>${points.map((p) => `<i>${esc(p)}</i>`).join("")}</p>` : ""}
    ${yachts.length
      ? `<div class="fleet__grid">${yachts.map(simCard).join("")}</div>`
      : `<p class="lead" data-i18n="a.none">No yachts are listed here right now. Message us and we'll find the right one.</p>`}

    <section class="acta">
      <div>
        <h2 class="title" data-i18n="a.plan">Plan your day in ${esc(area.short)}</h2>
        <p class="lead" data-i18n="a.plan.p">Tell us the date and number of guests. We reply with the yachts that are free, usually within the hour.</p>
      </div>
      <div class="acta__btns">
        <a href="${esc(wa)}" data-wa-es="${esc(`Hola Yachtique, me gustaría alquilar un yate en ${(AREAS_ES[area.slug] || area).name}.`)}" class="btn btn--wa" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.chat">Chat on WhatsApp</span></a>
        <a href="/#contact" class="btn btn--gold" data-i18n="btn.enquiry">Send an enquiry</a>
      </div>
    </section>

    <nav class="aother" aria-label="Other charter areas">
      <p class="eyebrow" data-i18n="a.more">More charter areas</p>
      <ul>${AREAS.filter((a) => a.slug !== area.slug).map((a) => `<li><a href="/yacht-charter/${a.slug}" data-i18n="area.${a.slug}">${esc(a.name)}</a></li>`).join("")}</ul>
    </nav>
  </div>
</main>

<div class="mobilebar">
  <a href="${esc(wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="/#contact" class="mobilebar__gold" data-i18n="mb.enquire">Enquire</a>
</div>
<script src="/assets/js/yacht.js?v=${V}" defer></script>`;
}
