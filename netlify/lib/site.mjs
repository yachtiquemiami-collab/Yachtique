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

// Spanish for the area pages (shown when the visitor picks ES)
export const AREAS_ES = {
  "miami-beach": { name: "Miami Beach y Downtown Miami", short: "Miami Beach",
    intro: "Embarque en South Beach, en Haulover o en Downtown Miami y pase el día en la bahía de Biscayne: el banco de arena de Haulover, las islas junto a Star Island y la costa de Miami Beach al atardecer." },
  "coconut-grove-key-biscayne": { name: "Coconut Grove y Key Biscayne", short: "Coconut Grove y Key Biscayne",
    intro: "Salga desde Bayshore Landing en Coconut Grove o desde No Name Harbor en Key Biscayne, a minutos del banco de arena de Nixon, Stiltsville y las aguas tranquilas del sur de la bahía de Biscayne." },
  "fort-lauderdale": { name: "Fort Lauderdale", short: "Fort Lauderdale",
    intro: "Navegue por el Intracoastal frente a las casas sobre el agua de Fort Lauderdale, fondee frente a la playa o recorra la costa hacia el norte con capitán y tripulación a bordo." },
  "palm-beach-boca-raton": { name: "Palm Beach y Boca Raton", short: "Palm Beach y Boca",
    intro: "Alquileres desde el Royal Yacht Club en Palm Beach y el Boca Resort, para días en Lake Worth Lagoon, Boca Inlet y las aguas claras del Atlántico frente al condado de Palm Beach." },
  "key-west": { name: "Key West", short: "Key West",
    intro: "Alquileres desde Stock Island Marina en Key West: snorkel en el arrecife, bancos de arena y el atardecer de Key West, con travesías más largas por los Cayos de Florida." },
  "bahamas-bimini": { name: "Bimini y las Bahamas", short: "Bahamas y Bimini",
    intro: "Cruce la corriente del Golfo hasta Bimini por un día, o alquile en Nassau desde Paradise Island para recorrer las Exumas y las islas exteriores, con capitán y tripulación que conocen estas aguas." },
};

// Occasion pages at /occasions/<slug>. `pick` chooses the yachts we recommend; ideas are what we arrange.
// Every claim here must stay true: we arrange extras through partners on request, prices come in the quote.
export const OCCASIONS = [
  { slug: "sunset-cruise", photo: "/assets/img/photos/sunset.jpg", alt: "Superyacht at anchor at sunset in Miami",
    pick: () => true,
    en: { name: "Sunset Cruises", title: "Sunset yacht cruises in Miami", eyebrow: "Golden hour on Biscayne Bay",
      intro: "The skyline turning pink, music low, a glass in hand. A private sunset charter is the most beautiful way to see Miami from the water.",
      seo: "Private sunset yacht cruises in Miami and Biscayne Bay with captain and crew. Live availability and prices from Yachtique.",
      ideas: [["Timed to the light", "We plan your departure so you are on the water for the last hour of sun and come back as the city lights up."],
        ["The skyline route", "Star Island, Fisher Island and the Downtown skyline, with a swim stop first if the day is warm."],
        ["Drinks and bites", "Bring your own, or let us arrange a private chef, platters and champagne on board."],
        ["Make it a moment", "Anniversaries, proposals or simply a beautiful evening for two or for twelve."]],
      cta: "Plan my sunset cruise", wa: "Hi Yachtique, I'd like to plan a sunset cruise." },
    es: { name: "Cruceros al atardecer", title: "Cruceros en yate al atardecer en Miami", eyebrow: "La hora dorada en la bahía de Biscayne",
      intro: "El horizonte tiñéndose de rosa, música suave y una copa en la mano. Un alquiler privado al atardecer es la forma más bella de ver Miami desde el agua.",
      ideas: [["Al ritmo de la luz", "Planificamos la salida para que esté en el agua durante la última hora de sol y regrese cuando se encienden las luces de la ciudad."],
        ["La ruta del horizonte", "Star Island, Fisher Island y el horizonte de Downtown, con una parada para nadar antes si el día está cálido."],
        ["Bebidas y bocados", "Traiga lo suyo o deje que organicemos un chef privado, tablas y champán a bordo."],
        ["Un momento especial", "Aniversarios, propuestas o simplemente una velada hermosa para dos o para doce."]],
      cta: "Planificar mi atardecer", wa: "Hola Yachtique, me gustaría planificar un crucero al atardecer." } },

  { slug: "birthday", photo: "/assets/img/photos/bow.jpg", alt: "Guest relaxing on the bow of a yacht",
    pick: (y) => y.feet >= 45,
    en: { name: "Birthdays & Celebrations", title: "Birthday yacht parties in Miami", eyebrow: "Celebrate on the water",
      intro: "A birthday your friends will talk about for years: a private yacht, your music, a cake on the bow and the whole bay to yourselves.",
      seo: "Birthday yacht parties and celebrations in Miami with captain and crew. Cake, decor, DJ and catering arranged by Yachtique.",
      ideas: [["Cake and decor", "Tell us the theme. We arrange the cake, balloons and flowers so the yacht is ready when you step on board."],
        ["Your music", "Bring a playlist for the sound system, or let us book a DJ for a real party."],
        ["A sandbar stop", "Anchor at the Haulover or Nixon sandbar to swim, float and dance in the water."],
        ["Photos to keep", "A photographer on board, so you are in the pictures instead of taking them."]],
      cta: "Plan my birthday", wa: "Hi Yachtique, I'd like to plan a birthday on a yacht." },
    es: { name: "Cumpleaños y celebraciones", title: "Fiestas de cumpleaños en yate en Miami", eyebrow: "Celebre sobre el agua",
      intro: "Un cumpleaños del que sus amigos hablarán durante años: un yate privado, su música, un pastel en la proa y toda la bahía para ustedes.",
      ideas: [["Pastel y decoración", "Cuéntenos la temática. Organizamos el pastel, los globos y las flores para que el yate esté listo cuando suba a bordo."],
        ["Su música", "Traiga su lista de canciones para el equipo de sonido, o reservamos un DJ para una verdadera fiesta."],
        ["Parada en el banco de arena", "Fondee en el banco de arena de Haulover o de Nixon para nadar, flotar y bailar en el agua."],
        ["Fotos para guardar", "Un fotógrafo a bordo, para que usted salga en las fotos en lugar de tomarlas."]],
      cta: "Planificar mi cumpleaños", wa: "Hola Yachtique, me gustaría planificar un cumpleaños en yate." } },

  { slug: "bachelorette-bachelor", photo: "/assets/img/photos/swim.jpg", alt: "Guests on the swim platform of a catamaran",
    pick: (y) => y.feet >= 50,
    en: { name: "Bachelor & Bachelorette", title: "Bachelorette and bachelor yacht parties in Miami", eyebrow: "The last big day out",
      intro: "Music, floats, the sandbar and your favourite people. Most of our larger yachts take up to 13 guests, so the whole group sails together.",
      seo: "Bachelorette and bachelor party yacht charters in Miami for groups up to 13 guests. Sandbar days, music and water toys with Yachtique.",
      ideas: [["Room for the group", "Spacious decks and up to 13 guests on most of our larger yachts, so nobody is left on the dock."],
        ["Floats and water toys", "Floating mats, paddleboards and, on many yachts, jet skis or Seabobs on request."],
        ["Sandbar party", "Anchor with the music on at Haulover or Nixon, where Miami goes to party on the water."],
        ["Decor and drinks", "Sashes, balloons and a stocked cooler arranged before you arrive."]],
      cta: "Plan the party", wa: "Hi Yachtique, I'd like to plan a bachelorette or bachelor party on a yacht." },
    es: { name: "Despedidas de soltero y soltera", title: "Despedidas de soltera y soltero en yate en Miami", eyebrow: "El último gran día de fiesta",
      intro: "Música, flotadores, el banco de arena y sus personas favoritas. La mayoría de nuestros yates más grandes llevan hasta 13 invitados, así que todo el grupo navega junto.",
      ideas: [["Espacio para el grupo", "Cubiertas amplias y hasta 13 invitados en la mayoría de nuestros yates más grandes, para que nadie se quede en el muelle."],
        ["Flotadores y juguetes acuáticos", "Colchonetas flotantes, tablas de paddle y, en muchos yates, motos de agua o Seabobs bajo pedido."],
        ["Fiesta en el banco de arena", "Fondee con la música encendida en Haulover o Nixon, donde Miami va de fiesta sobre el agua."],
        ["Decoración y bebidas", "Bandas, globos y una nevera llena, preparados antes de su llegada."]],
      cta: "Planificar la fiesta", wa: "Hola Yachtique, me gustaría planificar una despedida de soltera o soltero en yate." } },

  { slug: "sandbar-day", photo: "/assets/img/photos/sandbar.jpg", alt: "Guests paddleboarding beside a yacht at the sandbar",
    pick: (y) => (y.toys && y.toys.length) || /catamaran/i.test(y.type || ""),
    en: { name: "Sandbar Days", title: "Sandbar yacht days in Miami", eyebrow: "Haulover and Nixon sandbars",
      intro: "Turquoise water up to your waist, a floating mat behind the yacht and lunch on deck. The sandbar is Miami's favourite day on the water.",
      seo: "Yacht charters to the Haulover and Nixon sandbars in Miami with captain, crew and water toys. Live availability with Yachtique.",
      ideas: [["The right sandbar", "Haulover for the party, Nixon off Key Biscayne for calmer water. We suggest the best one for your day and the tide."],
        ["Swim and float", "Floating mats and paddleboards on most yachts, more toys on request."],
        ["Lunch on board", "Bring a picnic, or we arrange catering delivered to the yacht."],
        ["Shade and comfort", "Covered decks and cabins, so the day stays easy from morning to late afternoon."]],
      cta: "Plan my sandbar day", wa: "Hi Yachtique, I'd like to plan a sandbar day." },
    es: { name: "Días en el banco de arena", title: "Días en yate en los bancos de arena de Miami", eyebrow: "Bancos de arena de Haulover y Nixon",
      intro: "Agua turquesa hasta la cintura, una colchoneta flotante detrás del yate y almuerzo en cubierta. El banco de arena es el día favorito de Miami en el agua.",
      ideas: [["El banco de arena ideal", "Haulover para la fiesta, Nixon frente a Key Biscayne para aguas más tranquilas. Le sugerimos el mejor para su día y la marea."],
        ["Nadar y flotar", "Colchonetas flotantes y tablas de paddle en la mayoría de los yates, y más juguetes bajo pedido."],
        ["Almuerzo a bordo", "Traiga un picnic, o le organizamos un catering entregado en el yate."],
        ["Sombra y comodidad", "Cubiertas techadas y camarotes, para que el día sea cómodo de la mañana a la tarde."]],
      cta: "Planificar mi día", wa: "Hola Yachtique, me gustaría planificar un día en el banco de arena." } },

  { slug: "corporate", photo: "/assets/img/photos/aerial.jpg", alt: "Aerial view of a yacht on turquoise water",
    pick: (y) => y.feet >= 60,
    en: { name: "Corporate & VIP", title: "Corporate yacht charters and VIP events in Miami", eyebrow: "Client days and private events",
      intro: "Host clients, reward a team or close a deal somewhere memorable. One broker handles the yacht, catering, transport and security, discreetly.",
      seo: "Corporate yacht charters and VIP events in Miami: client hosting, team days and private events with catering, transport and security by Yachtique.",
      ideas: [["Hosting that impresses", "A larger yacht with space to talk, eat and enjoy the view of the city."],
        ["Catering and bar", "A private chef or catering and a bar set up for your guests, arranged in advance."],
        ["Door to dock", "Chauffeured transport from the office or hotel straight to the marina."],
        ["Discretion", "Licensed private security for VIP guests, on land and on the water."]],
      cta: "Plan a corporate charter", wa: "Hi Yachtique, I'd like to plan a corporate or VIP charter." },
    es: { name: "Corporativo y VIP", title: "Alquiler de yates corporativo y eventos VIP en Miami", eyebrow: "Días con clientes y eventos privados",
      intro: "Atienda a sus clientes, recompense a su equipo o cierre un acuerdo en un lugar memorable. Un solo bróker se ocupa del yate, el catering, el transporte y la seguridad, con discreción.",
      ideas: [["Una atención que impresiona", "Un yate más grande con espacio para conversar, comer y disfrutar de la vista de la ciudad."],
        ["Catering y bar", "Un chef privado o catering y un bar preparado para sus invitados, organizados con antelación."],
        ["De la puerta al muelle", "Transporte con chofer desde la oficina o el hotel directamente a la marina."],
        ["Discreción", "Seguridad privada con licencia para invitados VIP, en tierra y en el agua."]],
      cta: "Planificar un evento corporativo", wa: "Hola Yachtique, me gustaría planificar un alquiler corporativo o VIP." } },

  { slug: "proposal", photo: "/assets/img/photos/sunset2.jpg", alt: "Catamaran at anchor at sunset",
    pick: (y) => y.feet <= 60,
    en: { name: "Proposals", title: "Yacht proposals in Miami", eyebrow: "The question, on the water",
      intro: "Just the two of you, the bay at sunset and a ring. We plan every detail quietly so the only surprise is the one you have in mind.",
      seo: "Plan a marriage proposal on a private yacht in Miami at sunset. Flowers, champagne and a hidden photographer arranged by Yachtique.",
      ideas: [["Perfect timing", "Sail at golden hour and choose the moment with the captain, away from the crowds."],
        ["Flowers and champagne", "Roses, candles and a bottle on ice, set up before you board."],
        ["A hidden photographer", "Every second captured, without giving the secret away."],
        ["Celebrate after", "Invite family and friends to join you at the dock or for dinner afterwards."]],
      cta: "Plan my proposal", wa: "Hi Yachtique, I'd like to plan a proposal on a yacht." },
    es: { name: "Propuestas de matrimonio", title: "Propuestas de matrimonio en yate en Miami", eyebrow: "La pregunta, sobre el agua",
      intro: "Solo ustedes dos, la bahía al atardecer y un anillo. Planificamos cada detalle en silencio para que la única sorpresa sea la que usted tiene en mente.",
      ideas: [["El momento perfecto", "Navegue a la hora dorada y elija el momento con el capitán, lejos de la multitud."],
        ["Flores y champán", "Rosas, velas y una botella en hielo, preparadas antes de que suban a bordo."],
        ["Un fotógrafo escondido", "Cada segundo capturado, sin revelar el secreto."],
        ["Celebrar después", "Invite a familia y amigos a recibirlos en el muelle o a cenar después."]],
      cta: "Planificar mi propuesta", wa: "Hola Yachtique, me gustaría planificar una propuesta de matrimonio en yate." } },
];

// Words the server writes into Spanish strings
export const TYPES_ES = { "Motor Yacht": "Yate a motor", "Express Cruiser": "Crucero exprés", "Power Catamaran": "Catamarán a motor",
  "Sailing catamaran": "Catamarán de vela", "Super Yacht": "Superyate", "Sport Yacht": "Yate deportivo" };
export function durEs(label) {
  return String(label).replace(/(\d+)\s*hours?/i, "$1 horas").replace(/Day Trip/i, "excursión de un día");
}

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

export function saveBtn(handle, cls = "") {
  return `<button type="button" class="save ${cls}" data-save="${esc(handle)}" aria-pressed="false" aria-label="Save to shortlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.5 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg></button>`;
}

export function modelLine(y) {
  const bits = [`<span data-i18n="type:${esc(y.type)}">${esc(y.type)}</span>`, esc(y.builder), `${y.feet} ft`];
  if (y.guests) bits.push(`${y.guests} <span data-i18n="card.guests">guests</span>`);
  return bits.join(" · ");
}

export function simCard(y, extra = "") {
  const first = y.durations[0];
  return `
        <article class="yacht" data-handle="${esc(y.handle)}"${extra ? ` ${extra}` : ""}>
          <div class="yacht__mediawrap">
            <a class="yacht__media" href="/yachts/${esc(y.handle)}" aria-label="${esc(y.name)}">
              <img src="${esc(sized(y.images[0] || "", 900))}" alt="${esc(y.name)}" loading="lazy">
            </a>
            ${saveBtn(y.handle)}
          </div>
          <div class="yacht__body">
            <div class="yacht__row"><h3><a href="/yachts/${esc(y.handle)}">${esc(y.name)}</a></h3>
            <span class="yacht__price"><span data-i18n="card.from">from</span> <b>${money(first.price)}</b> / ${esc(shortDur(first.label))}</span></div>
            <p class="yacht__model">${modelLine(y)}</p>
            <div class="yacht__row yacht__row--foot"><span class="yacht__extra"></span><a class="yacht__link" href="/yachts/${esc(y.handle)}"><span data-i18n="btn.viewyacht">View yacht</span> <span aria-hidden="true">→</span></a></div>
          </div>
        </article>`;
}

export function unavailable() {
  return `
<main class="ypage">
  <div class="container ypage__empty">
    <p class="eyebrow" data-i18n="crumb.fleet">The Fleet</p>
    <h1 class="ypage__title" data-i18n="y.wait">One moment</h1>
    <p class="lead" data-i18n="y.wait.p">We're updating the fleet right now. Please refresh this page in a few seconds, or message us on WhatsApp.</p>
    <a href="" class="btn btn--gold" data-i18n="btn.refresh">Refresh</a>
  </div>
</main>`;
}

// Closest in length first, skipping the yacht itself

// ---------- shared page shell ----------

export function page({ title, description = "", image = `${SITE}/assets/img/og-image.png`, canonical, jsonld, body, es = {}, robots = "", bodyAttrs = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${robots ? `<meta name="robots" content="${esc(robots)}">` : ""}
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
  <link rel="stylesheet" href="/assets/css/styles.css?v=${V}">
  <script src="/assets/js/core.js?v=${V}" defer></script>
  ${jsonld ? `<script type="application/ld+json">${json(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body class="is-subpage"${bodyAttrs ? ` ${bodyAttrs}` : ""}>

${navHtml("/")}
${body}
${footerHtml("/")}

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="icon-wa" viewBox="0 0 32 32"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8.9 3.9.8a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.4z"/></symbol>
</svg>
<script type="application/json" id="i18n-es">${json(es).replace(/</g, "\\u003c")}</script>
</body>
</html>`;
}

// CSS/JS version: bump on every CSS or JS change (also in the .html files)
export const V = "20261022b";

// Header shared by every page (index.html carries a copy of the same markup)
export function navHtml() {
  return `<header class="nav is-scrolled" id="top">
  <div class="nav__inner">
    <a href="/" class="nav__logo" aria-label="Yachtique home">
      <img src="/assets/img/logo-nav.png" alt="Yachtique" width="180" height="46">
    </a>
    <nav class="nav__links" id="navLinks" aria-label="Main">
      <a href="/#fleet" data-i18n="nav.fleet">Fleet</a>
      <a href="/available" data-i18n="nav.available">Available</a>
      <a href="/#experiences" data-i18n="nav.experiences">Experiences</a>
      <a href="/#services" data-i18n="nav.concierge">Concierge</a>
      <a href="/#about" data-i18n="nav.about">About</a>
      <a href="/#contact" class="btn btn--gold btn--sm" data-i18n="nav.enquire">Enquire</a>
    </nav>
    <div class="lang" role="group" aria-label="Language" data-i18n-attr="aria-label:lang.label"><button type="button" data-lang="en">EN</button><button type="button" data-lang="es">ES</button></div>
    <button class="nav__toggle" id="navToggle" aria-label="Open menu" data-i18n-attr="aria-label:nav.menu" aria-expanded="false" aria-controls="navLinks">
      <span></span><span></span>
    </button>
  </div>
</header>`;
}

export function footerHtml() {
  return `<footer class="footer">
  <div class="container">
    <div class="footer__grid footer__grid--5">
      <div class="footer__brand">
        <img src="/assets/img/logo-stacked-notag.png" alt="Yachtique" class="footer__logo" width="220" height="74">
        <p data-i18n="foot.tag">Private yacht charters and concierge in Miami, arranged by one broker from the first message to the dock.</p>
      </div>
      <div>
        <h3 class="footer__title" data-i18n="foot.explore">Explore</h3>
        <ul class="footer__list">
          <li><a href="/#fleet" data-i18n="foot.fleet">The Fleet</a></li>
          <li><a href="/available" data-i18n="foot.available">Available this week</a></li>
          <li><a href="/shortlist" data-i18n="foot.shortlist">My shortlist</a></li>
          <li><a href="/#services" data-i18n="foot.concierge">Concierge</a></li>
          <li><a href="/faq.html" data-i18n="foot.faq">FAQ</a></li>
          <li><a href="/terms.html" data-i18n="foot.terms">Booking terms</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__title" data-i18n="foot.occasions">Occasions</h3>
        <ul class="footer__list">
          ${OCCASIONS.map((o) => `<li><a href="/occasions/${o.slug}" data-i18n="occ.${o.slug}">${esc(o.en.name)}</a></li>`).join("")}
        </ul>
      </div>
      <div>
        <h3 class="footer__title" data-i18n="foot.where">Where we charter</h3>
        <ul class="footer__list">
          ${AREAS.map((a) => `<li><a href="/yacht-charter/${a.slug}" data-i18n="area.${a.slug}">${esc(a.name)}</a></li>`).join("")}
        </ul>
      </div>
      <div>
        <h3 class="footer__title" data-i18n="foot.contact">Contact</h3>
        <ul class="footer__list">
          <li><a href="https://wa.me/${WA}" target="_blank" rel="noopener" data-track="footer">WhatsApp</a></li>
          <li><a href="tel:+13058124721">+1 (305) 812-4721</a></li>
          <li><a href="mailto:yachtiquemiami@gmail.com">yachtiquemiami@gmail.com</a></li>
          <li><a href="https://www.instagram.com/yachtiquemiami/" target="_blank" rel="noopener">Instagram</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <p>&copy; ${new Date().getFullYear()} <span data-i18n="foot.rights">Yachtique. Miami, Florida.</span></p>
      <p><a href="/terms.html" data-i18n="foot.terms">Booking terms</a> &middot; <a href="/privacy.html" data-i18n="foot.privacy">Privacy Policy</a></p>
    </div>
  </div>
</footer>`;
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
