// GET /yachts/:handle
// One page per yacht, built from the live fleet (/api/fleet) so it always matches the home page.
// Rendered on the server so WhatsApp, iMessage and Google see the yacht's name, price and photo.
import { SITE, WA, loadFleet, simCard, unavailable, page, html, esc, json, money, sized, shortDur, list } from "../lib/site.mjs";

export default async (req, context) => {
  const handle = (context.params && context.params.handle) || "";
  if (!handle) return Response.redirect(new URL("/#fleet", req.url), 302);

  const fleet = await loadFleet(req);
  if (!fleet) {
    return html(page({ title: "Yachtique", body: unavailable(), canonical: `${SITE}/yachts/${handle}` }), 503, "no-store");
  }

  const y = fleet.find((x) => x.handle === handle);
  if (!y) {
    return html(page({ title: "Yacht not found | Yachtique", body: notFound(), canonical: `${SITE}/yachts/` }), 404, "no-store");
  }
  return html(page({
    title: `${y.name} · ${y.feet}ft ${y.builder} yacht charter in Miami | Yachtique`,
    description: `${y.name}, a ${y.feet}ft ${y.builder} ${y.type.toLowerCase()} for private charter${y.guests ? ` for up to ${y.guests} guests` : ""}. From ${money(y.from)}. Live availability and booking with Yachtique Miami.`,
    image: y.images[0] ? sized(y.images[0], 1200) : `${SITE}/assets/img/og-image.png`,
    canonical: `${SITE}/yachts/${y.handle}`,
    jsonld: productLd(y),
    body: yachtBody(y, similar(fleet, y)),
  }), 200);
};

export const config = { path: ["/yachts", "/yachts/", "/yachts/:handle"] };

// ---------- page sections ----------

function yachtBody(y, others) {
  const first = y.durations[0];
  const label = `${y.name} (${y.feet}ft ${y.builder})`;
  const facts = [
    ["Length", `${y.feet} ft`],
    y.guests ? ["Guests", `Up to ${y.guests}`] : null,
    y.cabins ? ["Cabins", y.cabins] : null,
    y.sleeps ? ["Sleeps", y.sleeps] : null,
    y.crew && y.crew.length ? ["Crew", y.crew.length] : null,
    ["Builder", y.builder],
  ].filter(Boolean);
  const photos = y.images.slice(0, 5);
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(`Hi Yachtique, I'm interested in ${label}.`)}`;

  return `
<main class="ypage">
  <div class="container">
    <nav class="ypage__crumbs" aria-label="Breadcrumb"><a href="/#fleet">The Fleet</a><span>/</span>${esc(y.name)}</nav>

    <div class="ygallery" data-count="${photos.length}">
      ${photos.map((src, i) => `<button type="button" class="ygallery__item js-photo" data-i="${i}" aria-label="View photo ${i + 1}"><img src="${esc(sized(src, i ? 900 : 1600))}" alt="${esc(label)}${i ? ` photo ${i + 1}` : ""}"${i ? ' loading="lazy"' : ' fetchpriority="high"'}></button>`).join("")}
    </div>
    ${y.images.length > 1 ? `<div class="ygallery__bar"><button type="button" class="ygallery__all js-photo" data-i="0">View all ${y.images.length} photos</button></div>` : ""}

    <div class="ypage__grid">
      <article class="ypage__main">
        <p class="eyebrow">${esc(y.type)}</p>
        <h1 class="ypage__title">${esc(y.name)}</h1>
        <p class="ypage__sub">${esc(y.builder)} · ${y.feet} ft${y.guests ? ` · up to ${y.guests} guests` : ""}${(y.locations || [])[0] ? ` · ${esc(y.locations[0])}` : ""}</p>

        <ul class="yfacts">${facts.map(([k, v]) => `<li><b>${esc(v)}</b><span>${esc(k)}</span></li>`).join("")}</ul>

        <section class="ysection">
          <h2>The yacht</h2>
          <div class="yabout">${(y.about && y.about.length ? y.about : [{ p: y.summary }]).map((b) => (b.h ? `<h3>${esc(b.h)}</h3>` : `<p>${esc(b.p)}</p>`)).join("")}</div>
        </section>

        <section class="ysection">
          <h2>Rates</h2>
          <ul class="ydlg__prices yrates">${y.durations.map((d) => `<li><span>${esc(d.label)}</span><b>${money(d.price)}</b></li>`).join("")}</ul>
          <p class="muted ydlg__small">Starting rates from the lowest-priced pickup point. Sales tax${y.gratuityIncluded ? "" : " and crew gratuity"} may apply. Your final quote is confirmed on enquiry.</p>
        </section>

        <section class="ysection">
          <h2>On board</h2>
          <dl class="ydlg__meta">
            <dt>Departs from</dt><dd>${list(y.locations)}</dd>
            <dt>Crew</dt><dd>${list(y.crew)}</dd>
            <dt>Toys</dt><dd>${list(y.toys)}</dd>
            <dt>Gratuity</dt><dd>${y.gratuityIncluded ? "Included" : "Not included"}</dd>
          </dl>
        </section>

        <section class="ysection">
          <h2>Availability</h2>
          ${y.busy ? `<div class="ycals" id="yachtCals"></div>` : `<p class="muted">Live availability for this yacht is confirmed on enquiry.</p>`}
        </section>
      </article>

      <aside class="ybook" id="book">
        <div class="ybook__card">
          <p class="ybook__from">From <b>${money(first.price)}</b> / ${esc(shortDur(first.label))}</p>
          <form class="form ybook__form" name="enquiry" method="POST" action="/thank-you.html" data-netlify="true" netlify-honeypot="bot-field">
            <input type="hidden" name="form-name" value="enquiry">
            <input type="hidden" name="yacht" value="${esc(label)}">
            <p class="hidden" aria-hidden="true"><label>Leave empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
            <div class="form__row">
              <label>Date<input type="date" name="date" id="ybDate"></label>
              <label>Guests<input type="number" name="guests" min="1" max="${y.guests || 100}" inputmode="numeric"></label>
            </div>
            <small class="form__note" id="ybNote" hidden></small>
            <label>Duration
              <select name="duration">${y.durations.map((d) => `<option>${esc(d.label)}</option>`).join("")}<option>Not sure yet</option></select>
            </label>
            <label>Name<input type="text" name="name" required autocomplete="name"></label>
            <label>Phone / WhatsApp<input type="tel" name="phone" required autocomplete="tel"></label>
            <label>Email<input type="email" name="email" required autocomplete="email"></label>
            <label>Anything else?<textarea name="message" rows="3" placeholder="Occasion, pickup point, special requests…"></textarea></label>
            <button type="submit" class="btn btn--gold btn--block">Request ${esc(y.name)}</button>
          </form>
          <a href="${esc(wa)}" class="btn btn--wa btn--block" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>Ask on WhatsApp</a>
          <p class="ybook__note">No payment now. Nektarios replies with options, usually within the hour.</p>
        </div>
      </aside>
    </div>

    ${others.length ? `
    <section class="ysimilar">
      <h2 class="title">Similar yachts</h2>
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
  <a href="${esc(wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="#book" class="mobilebar__gold js-tobook">Request</a>
</div>

<script type="application/json" id="yachtData">${json({ name: y.name, images: y.images, busy: y.busy || null }).replace(/</g, "\\u003c")}</script>
<script src="/assets/js/yacht.js?v=20261021b" defer></script>`;
}


function notFound() {
  return `
<main class="ypage">
  <div class="container ypage__empty">
    <p class="eyebrow">The Fleet</p>
    <h1 class="ypage__title">This yacht isn't available</h1>
    <p class="lead">It may have left the fleet. Have a look at the yachts we can offer today.</p>
    <a href="/#fleet" class="btn btn--gold">View the fleet</a>
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

