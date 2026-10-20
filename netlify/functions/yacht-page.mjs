// GET /yachts/:handle
// One page per yacht, built from the live fleet (/api/fleet) so it always matches the home page.
// Rendered on the server so WhatsApp, iMessage and Google see the yacht's name, price and photo.
const SITE = "https://yachtique.co";
const WA = "13058124721";

export default async (req, context) => {
  const handle = (context.params && context.params.handle) || "";
  if (!handle) return Response.redirect(new URL("/#fleet", req.url), 302);

  // The fleet can be slow on a cold start, so try twice before giving up
  let fleet = null;
  for (let attempt = 0; attempt < 2 && !fleet; attempt++) {
    try {
      const res = await fetch(new URL("/api/fleet", req.url), { signal: AbortSignal.timeout(9000) });
      if (res.ok) fleet = (await res.json()).yachts || null;
    } catch (e) {
      console.error("fleet fetch failed", e);
    }
  }
  if (!fleet || !fleet.length) {
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
      ${y.images.length > 1 ? `<button type="button" class="ygallery__all js-photo" data-i="0">View all ${y.images.length} photos</button>` : ""}
    </div>

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
<script src="/assets/js/yacht.js" defer></script>`;
}

function simCard(y) {
  const first = y.durations[0];
  return `
        <article class="yacht">
          <a class="yacht__media" href="/yachts/${esc(y.handle)}">
            <img src="${esc(sized(y.images[0] || "", 900))}" alt="${esc(y.name)}" loading="lazy">
            <span class="yacht__tag">${esc(y.type)}</span>
            <span class="yacht__price"><b>${money(first.price)}</b>/ ${esc(shortDur(first.label))}</span>
          </a>
          <div class="yacht__body">
            <div><h3><a href="/yachts/${esc(y.handle)}">${esc(y.name)}</a></h3>
            <p class="yacht__model">${esc(y.builder)} · ${y.feet} ft</p></div>
            <a class="yacht__more" href="/yachts/${esc(y.handle)}" aria-label="View ${esc(y.name)}">→</a>
          </div>
        </article>`;
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

function unavailable() {
  return `
<main class="ypage">
  <div class="container ypage__empty">
    <p class="eyebrow">The Fleet</p>
    <h1 class="ypage__title">One moment</h1>
    <p class="lead">We're updating the fleet right now. Please refresh this page in a few seconds, or message us on WhatsApp.</p>
    <a href="" class="btn btn--gold">Refresh</a>
  </div>
</main>`;
}

// Closest in length first, skipping the yacht itself
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

// ---------- shared page shell ----------

function page({ title, description = "", image = `${SITE}/assets/img/og-image.png`, canonical, jsonld, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="theme-color" content="#000F16">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Yachtique">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/styles.css">
  ${jsonld ? `<script type="application/ld+json">${json(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body class="is-subpage">

<header class="nav is-scrolled" id="top">
  <div class="nav__inner">
    <a href="/" class="nav__logo" aria-label="Yachtique home">
      <img src="/assets/img/logo-nav.png" alt="Yachtique" width="180" height="46">
    </a>
    <nav class="nav__links" id="navLinks" aria-label="Main">
      <a href="/#fleet">Fleet</a>
      <a href="/#services">Concierge</a>
      <a href="/#experiences">Experiences</a>
      <a href="/#about">About</a>
      <a href="/#contact" class="btn btn--gold btn--sm">Enquire</a>
    </nav>
    <button class="nav__toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks">
      <span></span><span></span>
    </button>
  </div>
</header>
${body}
<footer class="footer">
  <div class="container">
    <div class="footer__grid">
      <div class="footer__brand">
        <img src="/assets/img/logo-stacked-notag.png" alt="Yachtique" class="footer__logo" width="220" height="74">
        <p>Private yacht charters and concierge in Miami, arranged by one broker from the first message to the dock.</p>
      </div>
      <div>
        <h3 class="footer__title">Explore</h3>
        <ul class="footer__list">
          <li><a href="/#fleet">The Fleet</a></li>
          <li><a href="/#services">Concierge</a></li>
          <li><a href="/#experiences">Experiences</a></li>
          <li><a href="/#about">About</a></li>
          <li><a href="/faq.html">FAQ</a></li>
          <li><a href="/terms.html">Booking terms</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__title">Where we charter</h3>
        <ul class="footer__list footer__list--muted">
          <li>Miami Beach &amp; Downtown Miami</li>
          <li>Coconut Grove &amp; Key Biscayne</li>
          <li>Fort Lauderdale &amp; Palm Beach</li>
          <li>Key West</li>
          <li>Bimini &amp; Nassau, Bahamas</li>
        </ul>
      </div>
      <div>
        <h3 class="footer__title">Contact</h3>
        <ul class="footer__list">
          <li><a href="https://wa.me/${WA}" target="_blank" rel="noopener">WhatsApp</a></li>
          <li><a href="tel:+13058124721">+1 (305) 812-4721</a></li>
          <li><a href="mailto:yachtiquemiami@gmail.com">yachtiquemiami@gmail.com</a></li>
          <li><a href="https://www.instagram.com/yachtiquemiami/" target="_blank" rel="noopener">Instagram</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <p>&copy; ${new Date().getFullYear()} Yachtique. Miami, Florida.</p>
      <p><a href="/terms.html">Booking terms</a> &middot; <a href="/privacy.html">Privacy Policy</a></p>
    </div>
  </div>
</footer>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="icon-wa" viewBox="0 0 32 32"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8.9 3.9.8a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.4z"/></symbol>
</svg>
</body>
</html>`;
}

// ---------- helpers ----------

function html(body, status, cache) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(cache === "no-store"
        ? { "Cache-Control": "no-store" }
        : {
            "Cache-Control": "public, max-age=300",
            "Netlify-CDN-Cache-Control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
          }),
    },
  });
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function json(v) { return JSON.stringify(v); }
function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
function sized(src, w) { return src + (src.indexOf("?") > -1 ? "&" : "?") + "width=" + w; }
function shortDur(d) { return d.replace(/ hours?$/, "h"); }
function list(arr) { return arr && arr.length ? arr.map(esc).join(" · ") : "—"; }
