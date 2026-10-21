// GET /p/:id
// A private proposal for one client: their date, group and pickup, then the yachts Nektarios picked with his prices.
// Proposals come from the Proposals tab of the Google Sheet (one row per yacht option, see README),
// or from netlify/lib/proposals.mjs. Photos, specs and live availability come from the fleet.
// Not listed anywhere and marked noindex: only people with the link see it.
import { SITE, WA, V, loadFleet, unavailable, page, esc, money, sized, saveBtn, TYPES_ES, durEs } from "../lib/site.mjs";
import { PROPOSALS } from "../lib/proposals.mjs";

export default async (req, context) => {
  const id = String((context.params && context.params.id) || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!id) return Response.redirect(new URL("/", req.url), 302);

  const [fleet, fromSheet] = await Promise.all([loadFleet(req), PROPOSALS[id] ? null : sheetProposal(id)]);
  const p = PROPOSALS[id] || fromSheet;
  if (!fleet) return respond(page({ title: "Yachtique", body: unavailable(), canonical: `${SITE}/p/${id}`, robots: "noindex" }), 503, 0);
  if (!p) return respond(page({ title: "Proposal not found | Yachtique", body: notFound(), canonical: `${SITE}/p/${id}`, robots: "noindex",
    es: { "pp.nf": "No encontramos esta propuesta", "pp.nf.p": "Puede que el enlace esté incompleto o que la propuesta haya vencido. Escríbanos y le enviaremos una nueva." } }), 404, 0);

  const options = (p.options || []).map((o) => ({ ...o, y: findYacht(fleet, o.yacht) })).filter((o) => o.y);
  const d = parseDate(p.date);
  const dayEn = d ? d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) : "";
  const dayEs = d ? d.toLocaleDateString("es-US", { weekday: "long", timeZone: "UTC" }) : "";
  const dateEn = d ? d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }) : "To confirm";
  const dateEs = d ? d.toLocaleDateString("es-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "Por confirmar";
  const ctx = { id, p, d, dayEn, dayEs, dateEn, dateEs, short: d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : "" };

  const es = {
    _title: `Propuesta privada${dayEs ? ` · ${cap(dayEs)}` : ""} | Yachtique`,
    "pp.eyebrow": "Propuesta privada de alquiler",
    "pp.title": dayEs ? `Su ${dayEs} en el agua` : "Su día en el agua",
    "pp.for": "Preparada para", "pp.date": "Fecha", "pp.group": "Grupo", "pp.time": "Horario", "pp.pickup": "Recogida",
    "pp.dateval": cap(dateEs), "pp.groupval": `${p.guests || "—"} invitados`, "pp.timeval": p.time_es || p.time || "Por confirmar",
    "pp.pickupval": p.pickup_es || p.pickup || "Por confirmar",
    "pp.intro": `Seleccionamos ${options.length} yates para su grupo. Cada uno está confirmado en vivo con el calendario del yate. Elija el yate y la duración, y le respondemos para reservarlo.`,
    "pp.choose": "Elegir", "pp.more": "Más fotos y detalles", "pp.terms": "Bueno saber",
    "pp.valid": p.validUntil ? `Propuesta válida hasta el ${cap(parseDate(p.validUntil).toLocaleDateString("es-US", { day: "numeric", month: "long", timeZone: "UTC" }))}.` : "",
    "pp.ready": "¿Listo para reservar?", "pp.ready.p": "Escríbanos por WhatsApp con el yate que eligió, o llámenos si prefiere hablarlo.",
    "pp.call": "Llamar",
    ...Object.fromEntries((p.terms_es || []).map((t, i) => [`pp.t${i}`, t])),
  };
  options.forEach((o, i) => {
    const st = state(o.y, p.date);
    es[`pp.o${i}.label`] = `${String(i + 1).padStart(2, "0")} · ${o.label_es || o.label || ""}`;
    if (o.note_es) es[`pp.o${i}.note`] = o.note_es;
    es[`pp.o${i}.state`] = stateText(st, dayEs, true);
    es[`pp.o${i}.spec`] = specLine(o.y, true);
  });

  return respond(page({
    title: `Private charter proposal${dayEn ? ` · ${dayEn}` : ""} | Yachtique`,
    description: `Your private yacht charter proposal from Yachtique${p.guests ? ` for ${p.guests} guests` : ""}.`,
    image: options[0] && options[0].y.images[0] ? sized(options[0].y.images[0], 1200) : undefined,
    canonical: `${SITE}/p/${id}`,
    robots: "noindex, nofollow",
    bodyAttrs: `data-yacht="proposal:${esc(id)}"${p.lang === "es" ? ' data-lang-default="es"' : ""}`,
    es,
    body: body(ctx, options),
  }), 200, PROPOSALS[id] ? 3600 : 60);
};

export const config = { path: ["/p/:id"] };

// ---------- data ----------

async function sheetProposal(id) {
  const url = Netlify.env.get("SHEETS_WEBHOOK_URL");
  const secret = Netlify.env.get("SHEETS_SECRET");
  if (!url || !secret) return null;
  try {
    const res = await fetch(`${url}?action=proposal&id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { redirect: "follow", signal: AbortSignal.timeout(9000) });
    const data = await res.json();
    return data && data.ok ? data.proposal : null;
  } catch (e) {
    console.error("proposal fetch failed", e);
    return null;
  }
}

// The Sheet may name a yacht by its web address, its handle or its name
function findYacht(fleet, ref) {
  const key = String(ref || "").toLowerCase().trim().replace(/^.*\/yachts\//, "").replace(/\/$/, "");
  const flat = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  return fleet.find((y) => y.handle === key) || fleet.find((y) => flat(y.name) === flat(key)) || fleet.find((y) => flat(y.handle) === flat(key));
}

function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
  return m ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3])) : null;
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function state(y, date) { return date && y.busy ? y.busy[String(date).slice(0, 10)] || "free" : null; }
function stateText(st, day, es) {
  if (!st) return es ? "Disponibilidad a confirmar" : "Availability to confirm";
  if (es) return st === "free" ? `Disponible el ${day}` : st === "partial" ? `Pocas horas libres el ${day}` : `Reservado el ${day}, le proponemos otro`;
  return st === "free" ? `Available ${day}` : st === "partial" ? `Limited ${day} slots` : `Booked ${day}, ask us for another`;
}
function specLine(y, es) {
  const type = es ? TYPES_ES[y.type] || y.type : y.type;
  return [`${y.feet} ft ${y.builder}`, type, y.guests ? (es ? `hasta ${y.guests} invitados` : `up to ${y.guests} guests`) : ""].filter(Boolean).join(" · ");
}

// ---------- page ----------

function body(c, options) {
  const p = c.p;
  const link = `${SITE}/p/${c.id}`;
  const facts = [
    ["pp.date", "Date", "pp.dateval", c.dateEn],
    ["pp.group", "Group", "pp.groupval", p.guests ? `${p.guests} guests` : "To confirm"],
    ["pp.time", "Time", "pp.timeval", p.time || "To confirm"],
    p.pickup ? ["pp.pickup", "Pickup", "pp.pickupval", p.pickup] : null,
  ].filter(Boolean);
  const waAll = `https://wa.me/${WA}?text=${encodeURIComponent(`Hi Nektarios, about my charter proposal ${link}`)}`;
  return `
<main class="ypage ppage">
  <div class="container">
    <header class="phead">
      <img src="/assets/img/logo-stacked-notag.png" alt="Yachtique" class="phead__logo" width="190" height="64">
      <p class="eyebrow" data-i18n="pp.eyebrow">Private charter proposal</p>
      <h1 class="ypage__title" data-i18n="pp.title">${c.dayEn ? `Your ${esc(c.dayEn)} on the water` : "Your day on the water"}</h1>
      ${p.client ? `<p class="phead__for"><span data-i18n="pp.for">Prepared for</span> ${esc(p.client)}</p>` : ""}
      <ul class="yfacts phead__facts">${facts.map(([lk, l, vk, v]) => `<li><b data-i18n="${vk}">${esc(v)}</b><span data-i18n="${lk}">${l}</span></li>`).join("")}</ul>
      <p class="lead phead__intro" data-i18n="pp.intro">We picked ${options.length} yachts for your group, each checked live against the yacht's own calendar. Choose a yacht and a length of day, and we reply to reserve it.</p>
    </header>

    <div class="popts">
      ${options.map((o, i) => optionCard(o, i, c)).join("")}
    </div>

    <section class="pterms">
      <p class="eyebrow" data-i18n="pp.terms">Good to know</p>
      <ul>
        ${(p.terms || []).map((t, i) => `<li data-i18n="pp.t${i}">${esc(t)}</li>`).join("")}
        ${p.validUntil ? `<li data-i18n="pp.valid">Proposal valid until ${esc(parseDate(p.validUntil).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }))}.</li>` : ""}
      </ul>
    </section>

    <section class="acta">
      <div>
        <h2 class="title" data-i18n="pp.ready">Ready to reserve?</h2>
        <p class="lead" data-i18n="pp.ready.p">Message us on WhatsApp with the yacht you chose, or call if you would rather talk it through.</p>
      </div>
      <div class="acta__btns">
        <a href="${esc(waAll)}" data-wa-es="Hola Nektarios, sobre mi propuesta de alquiler ${esc(link)}" class="btn btn--wa" target="_blank" rel="noopener" data-track="proposal-cta"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.chat">Chat on WhatsApp</span></a>
        <a href="tel:+13058124721" class="btn btn--ghost"><span data-i18n="pp.call">Call</span> +1 (305) 812-4721</a>
      </div>
    </section>
  </div>
</main>

<div class="mobilebar">
  <a href="${esc(waAll)}" data-wa-es="Hola Nektarios, sobre mi propuesta de alquiler ${esc(link)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>WhatsApp</a>
  <a href="tel:+13058124721" class="mobilebar__gold" data-i18n="pp.call">Call</a>
</div>`;
}

function optionCard(o, i, c) {
  const y = o.y;
  const st = state(y, c.p.date);
  const prices = o.prices && Object.keys(o.prices).length
    ? Object.entries(o.prices).filter(([, v]) => Number(v) > 0).map(([label, price]) => ({ label, price: Number(price) }))
    : y.durations.filter((d) => /hour/i.test(d.label)).slice(0, 3);
  const photos = y.images.slice(0, 3);
  const link = `${SITE}/p/${c.id}`;
  const rows = prices.map((d) => {
    const en = `Hi Nektarios, I'd like to reserve ${y.name} for ${d.label}${c.short ? ` on ${c.short}` : ""} (${money(d.price)}). Proposal: ${link}`;
    const es = `Hola Nektarios, me gustaría reservar ${y.name} por ${durEs(d.label)}${c.dateEs ? ` el ${c.dateEs}` : ""} (${money(d.price)}). Propuesta: ${link}`;
    return `<li><span data-dur>${esc(d.label)}</span><b>${money(d.price)}</b>
          <a class="btn btn--gold btn--sm" href="https://wa.me/${WA}?text=${encodeURIComponent(en)}" data-wa-es="${esc(es)}" data-yacht="${esc(y.handle)}" data-track="proposal-choose" target="_blank" rel="noopener" data-i18n="pp.choose">Choose</a></li>`;
  }).join("");
  return `
      <article class="popt" id="option-${i + 1}">
        <div class="popt__media">
          ${photos.map((src, n) => `<a href="/yachts/${esc(y.handle)}" class="popt__img${n ? "" : " popt__img--main"}"><img src="${esc(sized(src, n ? 700 : 1400))}" alt="${esc(y.name)}${n ? ` photo ${n + 1}` : ""}" loading="${i || n ? "lazy" : "eager"}"></a>`).join("")}
          ${saveBtn(y.handle)}
        </div>
        <div class="popt__body">
          <div class="popt__top">
            <p class="eyebrow" data-i18n="pp.o${i}.label">${String(i + 1).padStart(2, "0")} · ${esc(o.label || "")}</p>
            <span class="slstate slstate--${st || "unknown"}" data-i18n="pp.o${i}.state">${esc(stateText(st, c.dayEn, false))}</span>
          </div>
          <h2 class="popt__name">${esc(y.name)}</h2>
          <p class="popt__spec" data-i18n="pp.o${i}.spec">${esc(specLine(y, false))}</p>
          ${o.note ? `<p class="popt__note" data-i18n="pp.o${i}.note">${esc(o.note)}</p>` : ""}
          <ul class="ydlg__prices pprices">${rows}</ul>
          <a href="/yachts/${esc(y.handle)}" class="yacht__link"><span data-i18n="pp.more">More photos & details</span> <span aria-hidden="true">→</span></a>
        </div>
      </article>`;
}

function notFound() {
  return `
<main class="ypage">
  <div class="container ypage__empty">
    <p class="eyebrow">Yachtique</p>
    <h1 class="ypage__title" data-i18n="pp.nf">We couldn't find this proposal</h1>
    <p class="lead" data-i18n="pp.nf.p">The link may be incomplete or the proposal may have expired. Message us and we'll send you a fresh one.</p>
    <a href="https://wa.me/${WA}" class="btn btn--wa" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg><span data-i18n="wa.chat">Chat on WhatsApp</span></a>
  </div>
</main>`;
}

function respond(htmlBody, status, seconds) {
  return new Response(htmlBody, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      ...(seconds
        ? { "Cache-Control": "public, max-age=60", "Netlify-CDN-Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=300` }
        : { "Cache-Control": "no-store" }),
    },
  });
}
