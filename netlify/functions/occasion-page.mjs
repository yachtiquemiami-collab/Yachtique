// GET /occasions/:slug
// One page per occasion (sunset, birthday, bachelorette, sandbar, corporate, proposal), in English and Spanish.
// The words live in OCCASIONS in ../lib/site.mjs; the recommended yachts come from the live fleet.
import { SITE, WA, OCCASIONS, loadFleet, simCard, unavailable, page, html, esc, money } from "../lib/site.mjs";

export default async (req, context) => {
  const slug = (context.params && context.params.slug) || "";
  const occ = OCCASIONS.find((o) => o.slug === slug);
  if (!occ) return Response.redirect(new URL("/#experiences", req.url), 302);

  const fleet = await loadFleet(req);
  if (!fleet) {
    return html(page({ title: "Yachtique", body: unavailable(), canonical: `${SITE}/occasions/${slug}` }), 503, "no-store");
  }

  // Featured yachts first, then the most affordable, six at most
  const yachts = fleet.filter((y) => y.images && y.images.length && occ.pick(y))
    .sort((a, b) => (a.featured < 0) - (b.featured < 0) || a.from - b.from)
    .slice(0, 6);
  const from = yachts.length ? Math.min(...yachts.map((y) => y.from)) : 0;
  const en = occ.en, es = occ.es;

  return html(page({
    title: `${en.title} | Yachtique`,
    description: en.seo,
    image: `${SITE}${occ.photo}`,
    canonical: `${SITE}/occasions/${occ.slug}`,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: en.title,
      serviceType: "Yacht charter",
      areaServed: "Miami, Florida",
      provider: { "@type": "TravelAgency", name: "Yachtique", url: SITE, telephone: "+1-305-812-4721" },
      description: en.seo,
    },
    es: {
      _title: `${es.title} | Yachtique`,
      "o.eyebrow": es.eyebrow, "o.name": es.name, "o.title": es.title, "o.intro": es.intro, "o.cta": es.cta,
      ...Object.fromEntries(es.ideas.flatMap((d, i) => [[`o.i${i}h`, d[0]], [`o.i${i}p`, d[1]]])),
      "o.exp": "Experiencias", "o.ideas.eyebrow": "Lo que organizamos", "o.ideas.title": "Ideas para el día",
      "o.yachts.eyebrow": "Nuestra recomendación", "o.yachts.title": "Yates que recomendamos",
      "o.count": "Yates recomendados", "o.from": "Tarifa desde", "o.broker": "Bróker para cada detalle",
      "o.more": "Más ocasiones", "o.plan": "Cuéntenos su idea",
      "o.plan.p": "Díganos la fecha, el número de invitados y lo que imagina. Le enviamos opciones con precios claros, normalmente en menos de una hora.",
      "o.all": "Ver toda la flota",
    },
    body: body(occ, yachts, from),
  }), 200);
};

export const config = { path: ["/occasions", "/occasions/", "/occasions/:slug"] };

function body(occ, yachts, from) {
  const en = occ.en;
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(en.wa)}`;
  const plan = `/?occasion=${occ.slug}#contact`;
  return `
<main class="ypage apage opage">
  <section class="ahero">
    <div class="ahero__text">
      <nav class="ypage__crumbs" aria-label="Breadcrumb"><a href="/#experiences" data-i18n="o.exp">Experiences</a><span>/</span><span data-i18n="o.name">${esc(en.name)}</span></nav>
      <p class="eyebrow" data-i18n="o.eyebrow">${esc(en.eyebrow)}</p>
      <h1 class="ypage__title" data-i18n="o.title">${esc(en.title)}</h1>
      <p class="ahero__intro" data-i18n="o.intro">${esc(en.intro)}</p>
      <ul class="ahero__facts">
        <li><b>${yachts.length}</b><span data-i18n="o.count">Yachts we recommend</span></li>
        ${from ? `<li><b>${money(from)}</b><span data-i18n="o.from">Starting rate</span></li>` : ""}
        <li><b>1</b><span data-i18n="o.broker">Broker for every detail</span></li>
      </ul>
      <div class="ahero__ctas">
        <a href="${plan}" class="btn btn--gold" data-track="occasion-hero" data-i18n="o.cta">${esc(en.cta)}</a>
        <a href="${esc(wa)}" data-wa-es="${esc(occ.es.wa)}" class="btn btn--wa" target="_blank" rel="noopener" data-track="occasion-hero"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.chat">Chat on WhatsApp</span></a>
      </div>
    </div>
    <div class="ahero__media"><img src="${occ.photo}" alt="${esc(occ.alt)}" fetchpriority="high"></div>
  </section>

  <div class="container">
    <section class="oideas-wrap">
      <div class="section__head">
        <p class="eyebrow" data-i18n="o.ideas.eyebrow">What we arrange</p>
        <h2 class="title" data-i18n="o.ideas.title">Ideas for the day</h2>
      </div>
      <ol class="oideas">
        ${en.ideas.map((d, i) => `<li><span class="oideas__n">${i + 1}</span><h3 data-i18n="o.i${i}h">${esc(d[0])}</h3><p data-i18n="o.i${i}p">${esc(d[1])}</p></li>`).join("")}
      </ol>
    </section>

    ${yachts.length ? `
    <section class="oyachts">
      <div class="section__head">
        <p class="eyebrow" data-i18n="o.yachts.eyebrow">Our pick</p>
        <h2 class="title" data-i18n="o.yachts.title">Yachts we recommend</h2>
      </div>
      <div class="fleet__grid">${yachts.map((y) => simCard(y)).join("")}</div>
      <p class="oyachts__all"><a href="/#fleet" class="btn btn--ghost" data-i18n="o.all">See the whole fleet</a></p>
    </section>` : ""}

    <section class="acta">
      <div>
        <h2 class="title" data-i18n="o.plan">Tell us your idea</h2>
        <p class="lead" data-i18n="o.plan.p">Share the date, the number of guests and what you have in mind. We send options with clear pricing, usually within the hour.</p>
      </div>
      <div class="acta__btns">
        <a href="${esc(wa)}" data-wa-es="${esc(occ.es.wa)}" class="btn btn--wa" target="_blank" rel="noopener" data-track="occasion-cta"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.chat">Chat on WhatsApp</span></a>
        <a href="${plan}" class="btn btn--gold" data-track="occasion-cta" data-i18n="o.cta">${esc(en.cta)}</a>
      </div>
    </section>

    <nav class="aother" aria-label="Other occasions">
      <p class="eyebrow" data-i18n="o.more">More occasions</p>
      <ul>${OCCASIONS.filter((o) => o.slug !== occ.slug).map((o) => `<li><a href="/occasions/${o.slug}" data-i18n="occ.${o.slug}">${esc(o.en.name)}</a></li>`).join("")}</ul>
    </nav>
  </div>
</main>

<div class="mobilebar">
  <a href="${esc(wa)}" data-wa-es="${esc(occ.es.wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="${plan}" class="mobilebar__gold" data-i18n="mb.enquire">Enquire</a>
</div>`;
}
