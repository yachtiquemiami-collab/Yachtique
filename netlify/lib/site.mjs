// Shared pieces for the server-rendered pages (yacht pages, area pages, sitemap).
export const SITE = "https://yachtique.co";
export const WA = "13058124721";

// Charter areas: one landing page each at /yacht-charter/<slug>.
// `match` is tested against each yacht's pickup locations; `bimini` also includes yachts offering a Bimini day.
export const AREAS = [
  { slug: "miami-beach", name: "Miami Beach & Downtown Miami", short: "Miami Beach",
    match: /south beach|haulover|collins|island gardens|venetian|aventura|miami beach/i,
    intro: "Board in South Beach, at Haulover or in Downtown Miami and spend the day on Biscayne Bay: the Haulover sandbar, the islands off Star Island and the Miami Beach shoreline at sunset.",
    seo: "Private yacht charters from Miami Beach, Haulover and Downtown Miami with captain and crew. Live availability and prices." },
  { slug: "coconut-grove-key-biscayne", name: "Coconut Grove & Key Biscayne", short: "Coconut Grove & Key Biscayne",
    match: /coconut grove|bayshore|key biscayne|no name harbor/i,
    intro: "Leave from Bayshore Landing in Coconut Grove or No Name Harbor on Key Biscayne, minutes from the Nixon sandbar, Stiltsville and the calm water of south Biscayne Bay.",
    seo: "Yacht charters from Coconut Grove and Key Biscayne: sandbar days, Stiltsville and sunset cruises. Live availability and prices." },
  { slug: "fort-lauderdale", name: "Fort Lauderdale", short: "Fort Lauderdale",
    match: /fort lauderdale|cox landing/i,
    intro: "Cruise the Intracoastal past the waterfront homes of Fort Lauderdale, anchor off the beach, or run north along the coast with captain and crew on board.",
    seo: "Private yacht charters in Fort Lauderdale with captain and crew. Intracoastal cruises, beach anchorages, live availability." },
  { slug: "palm-beach-boca-raton", name: "Palm Beach & Boca Raton", short: "Palm Beach & Boca",
    match: /palm beach|royal yacht club|boca/i,
    intro: "Charters from the Royal Yacht Club in Palm Beach and the Boca Resort, for days on Lake Worth Lagoon, Boca Inlet and the clear Atlantic water off Palm Beach County.",
    seo: "Yacht charters from Palm Beach and Boca Raton with captain and crew. Live availability and prices." },
  { slug: "key-west", name: "Key West", short: "Key West",
    match: /key west|stock island/i,
    intro: "Charters from Stock Island Marina in Key West: reef snorkelling, sandbars and the Key West sunset, with longer trips across the Florida Keys.",
    seo: "Private yacht charters in Key West from Stock Island Marina. Reefs, sandbars and sunset cruises with crew." },
  { slug: "bahamas-bimini", name: "Bimini & the Bahamas", short: "Bahamas & Bimini",
    match: /nassau|bahamas|bimini/i, bimini: true,
    intro: "Cross the Gulf Stream to Bimini for the day, or charter in Nassau from Paradise Island for the Exumas and the out islands, with captain and crew who know the waters.",
    seo: "Yacht charters to Bimini from Miami and in Nassau, Bahamas. Day trips and multi-day charters with crew, live availability." },
];

export function yachtsIn(fleet, area) {
  return fleet.filter((y) =>
    (y.locations || []).some((l) => area.match.test(l)) ||
    (area.bimini && y.durations.some((d) => /bimini/i.test(d.label))));
}

// The fleet can be slow on a cold start, so try twice before giving up
export async function loadFleet(req) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(new URL("/api/fleet", req.url), { signal: AbortSignal.timeout(9000) });
      if (res.ok) {
        const yachts = (await res.json()).yachts;
        if (yachts && yachts.length) return yachts;
      }
    } catch (e) {
      console.error("fleet fetch failed", e);
    }
  }
  return null;
}

export function simCard(y) {
  const first = y.durations[0];
  const bits = [y.type, y.builder, `${y.feet} ft`];
  if (y.guests) bits.push(`${y.guests} guests`);
  return `
        <article class="yacht">
          <a class="yacht__media" href="/yachts/${esc(y.handle)}" aria-label="${esc(y.name)}">
            <img src="${esc(sized(y.images[0] || "", 900))}" alt="${esc(y.name)}" loading="lazy">
          </a>
          <div class="yacht__body">
            <div class="yacht__row"><h3><a href="/yachts/${esc(y.handle)}">${esc(y.name)}</a></h3>
            <span class="yacht__price">from <b>${money(first.price)}</b> / ${esc(shortDur(first.label))}</span></div>
            <p class="yacht__model">${esc(bits.join(" · "))}</p>
            <div class="yacht__row yacht__row--foot"><span></span><a class="yacht__link" href="/yachts/${esc(y.handle)}">View yacht <span aria-hidden="true">→</span></a></div>
          </div>
        </article>`;
}

export function unavailable() {
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

// ---------- shared page shell ----------

export function page({ title, description = "", image = `${SITE}/assets/img/og-image.png`, canonical, jsonld, body }) {
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
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Lato:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/styles.css?v=20261021d">
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
        <ul class="footer__list">
          ${AREAS.map((a) => `<li><a href="/yacht-charter/${a.slug}">${esc(a.name)}</a></li>`).join("")}
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

export function html(body, status, cache) {
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
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
export function json(v) { return JSON.stringify(v); }
export function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
export function sized(src, w) { return src + (src.indexOf("?") > -1 ? "&" : "?") + "width=" + w; }
export function shortDur(d) { return d.replace(/ hours?$/, "h"); }
export function list(arr) { return arr && arr.length ? arr.map(esc).join(" · ") : "—"; }
