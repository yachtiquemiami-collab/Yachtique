// GET /yacht-charter/:area
// One landing page per charter area (Miami Beach, Fort Lauderdale, Bahamas...), listing the yachts
// that depart from there. Areas and their wording live in ../lib/site.mjs (AREAS).
import { SITE, WA, AREAS, yachtsIn, loadFleet, simCard, unavailable, page, html, esc, json, money, sized } from "../lib/site.mjs";

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
  }), 200);
};

export const config = { path: ["/yacht-charter", "/yacht-charter/", "/yacht-charter/:area"] };

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
      <nav class="ypage__crumbs" aria-label="Breadcrumb"><a href="/#fleet">The Fleet</a><span>/</span>${esc(area.short)}</nav>
      <p class="eyebrow">Yacht charter</p>
      <h1 class="ypage__title">${esc(area.name)}</h1>
      <p class="ahero__intro">${esc(area.intro)}</p>
      <ul class="ahero__facts">
        <li><b>${yachts.length}</b><span>${yachts.length === 1 ? "Yacht" : "Yachts"} available</span></li>
        ${from ? `<li><b>${money(from)}</b><span>Starting rate</span></li>` : ""}
        <li><b>${points.length || "—"}</b><span>${points.length === 1 ? "Departure point" : "Departure points"}</span></li>
      </ul>
    </div>
    ${cover && cover[0] ? `<div class="ahero__media"><img src="${esc(sized(cover[0], 1600))}" alt="Yacht charter in ${esc(area.name)}" fetchpriority="high"></div>` : ""}
  </section>

  <div class="container">
    ${points.length ? `<p class="apoints"><span>Departs from</span>${points.map(esc).join(" · ")}</p>` : ""}
    ${yachts.length
      ? `<div class="fleet__grid">${yachts.map(simCard).join("")}</div>`
      : `<p class="lead">No yachts are listed here right now. Message us and we'll find the right one.</p>`}

    <section class="acta">
      <div>
        <h2 class="title">Plan your day in ${esc(area.short)}</h2>
        <p class="lead">Tell us the date and number of guests. We reply with the yachts that are free, usually within the hour.</p>
      </div>
      <div class="acta__btns">
        <a href="${esc(wa)}" class="btn btn--wa" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>Chat on WhatsApp</a>
        <a href="/#contact" class="btn btn--gold">Send an enquiry</a>
      </div>
    </section>

    <nav class="aother" aria-label="Other charter areas">
      <p class="eyebrow">More charter areas</p>
      <ul>${AREAS.filter((a) => a.slug !== area.slug).map((a) => `<li><a href="/yacht-charter/${a.slug}">${esc(a.name)}</a></li>`).join("")}</ul>
    </nav>
  </div>
</main>

<div class="mobilebar">
  <a href="${esc(wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="/#contact" class="mobilebar__gold">Enquire</a>
</div>
<script src="/assets/js/yacht.js?v=20261021c" defer></script>`;
}
