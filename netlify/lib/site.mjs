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
  return `
        <article class="yacht" data-handle="${esc(y.handle)}"${extra ? ` ${extra}` : ""}>
          <div class="yacht__mediawrap">
            <a class="yacht__media" href="/yachts/${esc(y.handle)}" aria-label="${esc(y.name)}">
              <img src="${esc(sized(y.images[0] || "", 900))}" alt="${esc(y.name)}" loading="lazy">
            </a>
            ${saveBtn(y.handle)}
          </div>
          <div class="yacht__body">
            <div class="yacht__row"><h3><a href="/yachts/${esc(y.handle)}">${esc(y.name)}</a></h3></div>
            <p class="yacht__model">${modelLine(y)}</p>
            <ul class="yacht__rates">${y.durations.slice(0, 3).map((d) => `<li><span data-dur>${esc(shortDur(d.label))}</span><b>${money(d.price)}</b></li>`).join("")}</ul>
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
export const V = "20261101l";

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
      <a href="/locations" data-i18n="nav.locations">Locations</a>
      <a href="/#experiences" data-i18n="nav.experiences">Experiences</a>
      <a href="/#services" data-i18n="nav.concierge">Concierge</a>
      <a href="/#about" data-i18n="nav.about">About</a>
      <a href="/#contact" class="btn btn--gold btn--sm" data-i18n="nav.enquire">Inquire</a>
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
          <li><a href="/locations" data-i18n="foot.locations">All locations</a></li>
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
// "Secure checkout by Stripe" with the ways to pay that Stripe Checkout offers (wallets show on supported devices)
export function payBadges(label = "Secure checkout by Stripe") {
  return `<div class="paybadges" aria-label="Payment methods we accept">
  <p class="paybadges__lock"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h6V7a3 3 0 0 0-6 0v3z"/></svg><span data-i18n="pay.secure">${esc(label)}</span></p>
  <ul><li title="Apple Pay"><svg viewBox="0 0 24 24" width="40" height="40" role="img" aria-label="Apple Pay"><path fill="#000000" d="M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z"/></svg></li><li title="Google Pay"><svg viewBox="0 0 24 24" width="40" height="40" role="img" aria-label="Google Pay"><path fill="#3C4043" d="M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z"/></svg></li><li title="Visa"><svg viewBox="0 0 24 24" width="38" height="38" role="img" aria-label="Visa"><path fill="#1A1F71" d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/></svg></li><li title="Mastercard"><svg viewBox="0 0 32 20" width="30" height="19" role="img" aria-label="Mastercard"><circle cx="11" cy="10" r="9" fill="#EB001B"/><circle cx="21" cy="10" r="9" fill="#F79E1B"/><path fill="#FF5F00" d="M16 2.6a9 9 0 0 1 0 14.8 9 9 0 0 1 0-14.8z"/></svg></li><li title="American Express"><svg viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="American Express"><path fill="#2E77BC" d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507"/></svg></li></ul>
</div>`;
}

export function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
export function sized(src, w) { return src + (src.indexOf("?") > -1 ? "&" : "?") + "width=" + w; }
export function shortDur(d) { return d.replace(/ hours?$/, "h"); }
export function list(arr) { return arr && arr.length ? arr.map(esc).join(" · ") : "—"; }
