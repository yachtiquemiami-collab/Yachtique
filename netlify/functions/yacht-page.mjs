// GET /yachts/:handle
// One page per yacht, built from the live fleet (/api/fleet) so it always matches the home page.
// Rendered on the server so WhatsApp, iMessage and Google see the yacht's name, price and photo.
import { SITE, WA, V, loadFleet, simCard, unavailable, page, html, esc, json, money, sized, shortDur, list } from "../lib/site.mjs";

export default async (req, context) => {
  const handle = (context.params && context.params.handle) || "";
  if (!handle) return Response.redirect(new URL("/#fleet", req.url), 302);

  const fleet = await loadFleet(req);
  if (!fleet) {
    return html(page({ title: "Yachtique", body: unavailable(), canonical: `${SITE}/yachts/${handle}` }), 503, "no-store");
  }

  const y = fleet.find((x) => x.handle === handle);
  if (!y) {
    return html(page({ title: "Yacht not found | Yachtique", body: notFound(), canonical: `${SITE}/yachts/`, robots: "noindex" }), 404, "no-store");
  }
  return html(page({
    title: `${y.name} · ${y.feet}ft ${y.builder} yacht charter in Miami | Yachtique`,
    description: `${y.name}, a ${y.feet}ft ${y.builder} ${y.type.toLowerCase()} for private charter${y.guests ? ` for up to ${y.guests} guests` : ""}. From ${money(y.from)}. Live availability and booking with Yachtique Miami.`,
    image: y.images[0] ? sized(y.images[0], 1200) : `${SITE}/assets/img/og-image.png`,
    canonical: `${SITE}/yachts/${y.handle}`,
    jsonld: productLd(y),
    body: yachtBody(y, similar(fleet, y)),
    bodyAttrs: `data-yacht="${esc(y.handle)}"`,
    es: {
      _title: `${y.name} · Alquiler de yate ${y.builder} de ${y.feet} pies en Miami | Yachtique`,
      "y.sub": `${esc(y.builder)} · ${y.feet} ft${y.guests ? ` · hasta ${y.guests} invitados` : ""}${(y.locations || [])[0] ? ` · ${esc(y.locations[0])}` : ""}`,
      "y.allphotos": `Ver las ${y.images.length} fotos`,
    },
  }), 200);
};

export const config = { path: ["/yachts", "/yachts/", "/yachts/:handle"] };

// ---------- page sections ----------

function yachtBody(y, others) {
  const first = y.durations[0];
  const label = `${y.name} (${y.feet}ft ${y.builder})`;
  // [label key, English label, value HTML]
  const facts = [
    ["f.length", "Length", `${y.feet} ft`],
    y.guests ? ["f.guests", "Guests", `<span data-i18n="f.upto">Up to</span> ${y.guests}`] : null,
    y.cabins ? ["f.cabins", "Cabins", esc(y.cabins)] : null,
    y.sleeps ? ["f.sleeps", "Sleeps", esc(y.sleeps)] : null,
    y.crew && y.crew.length ? ["f.crew", "Crew", y.crew.length] : null,
    ["f.builder", "Builder", esc(y.builder)],
  ].filter(Boolean);
  const photos = y.images.slice(0, 5);
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(`Hi Yachtique, I'm interested in ${label}.`)}`;
  const waEs = `Hola Yachtique, me interesa ${label}.`;

  return `
<main class="ypage">
  <div class="container">
    <nav class="ypage__crumbs" aria-label="Breadcrumb"><a href="/#fleet" data-i18n="crumb.fleet">The Fleet</a><span>/</span>${esc(y.name)}</nav>

    <div class="ygallery" data-count="${photos.length}">
      ${photos.map((src, i) => `<button type="button" class="ygallery__item js-photo" data-i="${i}" aria-label="View photo ${i + 1}"><img src="${esc(sized(src, i ? 900 : 1600))}" alt="${esc(label)}${i ? ` photo ${i + 1}` : ""}"${i ? ' loading="lazy"' : ' fetchpriority="high"'}></button>`).join("")}
    </div>
    <div class="ygallery__bar">
      <button type="button" class="save save--text" data-save="${esc(y.handle)}" aria-pressed="false" aria-label="Save to shortlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.5 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg><span class="save__txt">Save</span></button>
      ${y.images.length > 1 ? `<button type="button" class="ygallery__all js-photo" data-i="0" data-i18n="y.allphotos">View all ${y.images.length} photos</button>` : ""}
    </div>

    <div class="ypage__grid">
      <article class="ypage__main">
        <p class="eyebrow" data-i18n="type:${esc(y.type)}">${esc(y.type)}</p>
        <h1 class="ypage__title">${esc(y.name)}</h1>
        <p class="ypage__sub" data-i18n="y.sub">${esc(y.builder)} · ${y.feet} ft${y.guests ? ` · up to ${y.guests} guests` : ""}${(y.locations || [])[0] ? ` · ${esc(y.locations[0])}` : ""}</p>

        <ul class="yfacts">${facts.map(([key, k, v]) => `<li><b>${v}</b><span data-i18n="${key}">${k}</span></li>`).join("")}</ul>

        <section class="ysection">
          <h2 data-i18n="y.theyacht">The yacht</h2>
          <p class="muted yabout__note" data-i18n="y.english"></p>
          <div class="yabout">${(y.about && y.about.length ? y.about : [{ p: y.summary }]).map((b) => (b.h ? `<h3>${esc(b.h)}</h3>` : `<p>${esc(b.p)}</p>`)).join("")}</div>
        </section>

        <section class="ysection">
          <h2 data-i18n="y.rates">Rates</h2>
          <ul class="ydlg__prices yrates">${y.durations.map((d) => `<li><span data-dur>${esc(d.label)}</span><b>${money(d.price)}</b></li>`).join("")}</ul>
          <p class="muted ydlg__small" data-i18n="${y.gratuityIncluded ? "y.ratesnote.tip" : "y.ratesnote"}">Starting rates from the lowest-priced pickup point. Sales tax${y.gratuityIncluded ? "" : " and crew gratuity"} may apply. Your final quote is confirmed on enquiry.</p>
        </section>

        <section class="ysection">
          <h2 data-i18n="y.onboard">On board</h2>
          <dl class="ydlg__meta">
            <dt data-i18n="y.departs">Departs from</dt><dd>${list(y.locations)}</dd>
            <dt data-i18n="f.crew">Crew</dt><dd>${list(y.crew)}</dd>
            <dt data-i18n="y.toys">Toys</dt><dd>${list(y.toys)}</dd>
            <dt data-i18n="y.gratuity">Gratuity</dt><dd data-i18n="${y.gratuityIncluded ? "y.included" : "y.notincluded"}">${y.gratuityIncluded ? "Included" : "Not included"}</dd>
          </dl>
        </section>

        <section class="ysection">
          <h2 data-i18n="y.availability">Availability</h2>
          ${y.busy ? `<div class="ycals" id="yachtCals"></div>` : `<p class="muted" data-i18n="y.noavail">Live availability for this yacht is confirmed on enquiry.</p>`}
        </section>
      </article>

      <aside class="ybook" id="book">
        <div class="ybook__card">
          <p class="ybook__from"><span data-i18n="card.From">From</span> <b>${money(first.price)}</b> / ${esc(shortDur(first.label))}</p>
          <form class="form ybook__form" name="enquiry" method="POST" action="/thank-you.html" data-netlify="true" netlify-honeypot="bot-field">
            <input type="hidden" name="form-name" value="enquiry">
            <input type="hidden" name="yacht" value="${esc(label)}">
            <p class="hidden" aria-hidden="true"><label>Leave empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
            <div class="form__row">
              <label><span data-i18n="form.date">Date</span><input type="date" name="date" id="ybDate"></label>
              <label><span data-i18n="form.guests">Guests</span><input type="number" name="guests" min="1" max="${y.guests || 100}" inputmode="numeric"></label>
            </div>
            <small class="form__note" id="ybNote" hidden></small>
            <label><span data-i18n="form.duration">Duration</span>
              <select name="duration">${y.durations.map((d) => `<option value="${esc(d.label)}" data-dur>${esc(d.label)}</option>`).join("")}<option value="Not sure yet" data-i18n="form.notsure">Not sure yet</option></select>
            </label>
            <label><span data-i18n="form.name">Name</span><input type="text" name="name" required autocomplete="name"></label>
            <label><span data-i18n="form.phone">Phone / WhatsApp</span><input type="tel" name="phone" required autocomplete="tel"></label>
            <label><span data-i18n="form.email">Email</span><input type="email" name="email" required autocomplete="email"></label>
            <label><span data-i18n="form.else">Anything else?</span><textarea name="message" rows="3" placeholder="Occasion, pickup point, special requests…" data-i18n-attr="placeholder:form.else.ph"></textarea></label>
            <button type="submit" class="btn btn--gold btn--block"><span data-i18n="y.request">Request</span> ${esc(y.name)}</button>
          </form>
          <a href="${esc(wa)}" data-wa-es="${esc(waEs)}" data-yacht="${esc(y.handle)}" class="btn btn--wa btn--block" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.ask">Ask on WhatsApp</span></a>
          <p class="ybook__note" data-i18n="y.nopay">No payment now. We reply with options, usually within the hour.</p>
        </div>
      </aside>
    </div>

    ${others.length ? `
    <section class="ysimilar">
      <h2 class="title" data-i18n="y.similar">Similar yachts</h2>
      <div class="fleet__grid">${others.map(simCard).join("")}</div>
    </section>` : ""}
  </div>
</main>

<div class="ylight" id="ylight" hidden>
  <button type="button" class="ylight__close js-lclose" aria-label="Close">&times;</button>
  <button type="button" class="ylight__nav ylight__nav--prev js-lprev" aria-label="Previous photo">‹</button>
  <img class="ylight__img" id="ylightImg" alt="${esc(label)}">
  <button type="button" class="ylight__nav ylight__nav--next js-lnext" aria-label="Next photo">›</button>
  <p class="ylight__count" id="ylightCount"></p>
</div>

<div class="mobilebar">
  <a href="${esc(wa)}" data-wa-es="${esc(waEs)}" data-yacht="${esc(y.handle)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="#book" class="mobilebar__gold js-tobook" data-i18n="mb.request">Request</a>
</div>

<script type="application/json" id="yachtData">${json({ name: y.name, images: y.images, busy: y.busy || null }).replace(/</g, "\\u003c")}</script>
<script src="/assets/js/datepicker.js?v=${V}" defer></script>
<script src="/assets/js/yacht.js?v=${V}" defer></script>`;
}


function notFound() {
  return `
<main class="ypage">
  <div class="container ypage__empty">
    <p class="eyebrow" data-i18n="crumb.fleet">The Fleet</p>
    <h1 class="ypage__title" data-i18n="y.notfound">This yacht isn't available</h1>
    <p class="lead" data-i18n="y.notfound.p">It may have left the fleet. Have a look at the yachts we can offer today.</p>
    <a href="/#fleet" class="btn btn--gold" data-i18n="btn.viewfleet">View the fleet</a>
  </div>
</main>`;
}

function similar(fleet, y) {
  return fleet
    .filter((x) => x.handle !== y.handle && x.images && x.images.length && x.durations.length)
    .sort((a, b) => Math.abs(a.feet - y.feet) - Math.abs(b.feet - y.feet))
    .slice(0, 3);
}

function productLd(y) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${y.name} – ${y.feet}ft ${y.builder} yacht charter`,
    description: y.summary,
    image: y.images.slice(0, 5).map((s) => sized(s, 1200)),
    brand: { "@type": "Brand", name: "Yachtique" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...y.durations.map((d) => d.price)),
      highPrice: Math.max(...y.durations.map((d) => d.price)),
      offerCount: y.durations.length,
      url: `${SITE}/yachts/${y.handle}`,
    },
  };
}

