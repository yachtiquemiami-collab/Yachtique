// GET/POST /extend/YQ-1042?t=CODE  ·  More time on board, linked from the "Want more time?" email (Apps Script, hourly).
//
//   GET                -> the charter and +1 / +2 hours, each with its price (gratuity and Florida sales tax included).
//   POST hours, how    -> Stripe HOLDS the amount on the client's card (capture_method=manual), nothing is charged yet:
//                         how=saved uses the card kept at the first payment (one tap, no form);
//                         how=card, or when the saved card can't be used, opens Stripe Checkout.
//   GET ?session_id=   -> back from Checkout: the hold is recorded in the Sheet (the Stripe webhook does it too).
//
// The Sheet then emails Nektarios Confirm / Not possible (/api/decide?a=extok|extno), which charges or releases the hold.
// The price per hour comes from the yacht's own rates on the site (the step to the next longer charter), from the
// client's marina when it has its own prices. The link carries a code made from "ext:" + the ref and SHEETS_SECRET.
import { WA, esc, loadFleet, payBadges } from "../lib/site.mjs";
import { RX_REF, tokenOk, sheet, first, usd, cardPage, stripe } from "../lib/card.mjs";

const HOURS = [1, 2];
const T = {
  en: {
    eyebrow: "More time on board", head: (n) => "Add more time" + (n ? ", " + n : ""),
    lead: (y, d) => `Your charter${y ? ` on <b>${esc(y)}</b>` : ""}${d ? `, ${esc(d)}` : ""}. Pick the extra time below.`,
    hour: (h) => `+${h} ${h === 1 ? "hour" : "hours"}`, charter: "Extra time", gratuity: (p) => `Gratuity (${p}%)`, tax: (r) => `Florida sales tax (${r}%)`, total: "Total",
    holdSaved: (a, c) => `Hold ${a} on ${c}`, holdCard: "Continue to secure payment", other: "Use another card",
    how: "Nothing is charged now: the amount is only held on your card. The captain confirms the yacht is free, then it's charged. If it isn't free, the hold is released.",
    heldHead: "Request sent", heldP: (w) => `We're checking ${w} with the captain now. The amount is only held on your card until it's confirmed, and you'll get an email either way.`,
    waitingHead: "Already asked", waitingP: "Your request for more time is with the captain. You'll get an email as soon as it's confirmed.",
    notToday: "Extra time is booked on the day", notTodayP: "This link works on the day of your charter, until it ends. Message us if you'd like to change your booking.",
    ended: "Your charter has ended", endedP: "We hope you had a wonderful day on the water. Message us anytime to plan the next one.",
    notBooked: "This charter isn't confirmed yet", notBookedP: "Message us and we'll help you.",
    noPrice: "Let's arrange it together", noPriceP: "We can't price extra time for this yacht online. Message us and we'll check with the captain.",
    off: "Online payment is coming soon", offP: "Message us and we'll arrange the extra time.",
    bad: "This link is not valid", badP: "Open the link from your email again, or message us.",
    error: "Something went wrong", errorP: "Nothing was charged. Please try again in a moment, or message us.",
    chat: "Chat on WhatsApp", wa: (r) => `Hi Yachtique, we'd like more time on board (${r}).`,
    product: (h, y) => `Extra time +${h}h` + (y ? " · " + y : ""),
  },
  es: {
    eyebrow: "Más tiempo a bordo", head: (n) => "Añadir más tiempo" + (n ? ", " + n : ""),
    lead: (y, d) => `Su alquiler${y ? ` en <b>${esc(y)}</b>` : ""}${d ? `, ${esc(d)}` : ""}. Elija el tiempo extra abajo.`,
    hour: (h) => `+${h} ${h === 1 ? "hora" : "horas"}`, charter: "Tiempo extra", gratuity: (p) => `Propina (${p}%)`, tax: (r) => `Impuesto de ventas de Florida (${r}%)`, total: "Total",
    holdSaved: (a, c) => `Retener ${a} en ${c}`, holdCard: "Continuar al pago seguro", other: "Usar otra tarjeta",
    how: "Ahora no se cobra nada: el importe solo queda retenido en su tarjeta. El capitán confirma que el yate está libre y entonces se cobra. Si no está libre, se libera la retención.",
    heldHead: "Solicitud enviada", heldP: (w) => `Estamos consultando ${w} con el capitán. El importe solo queda retenido en su tarjeta hasta la confirmación, y recibirá un correo en cualquier caso.`,
    waitingHead: "Ya lo pidió", waitingP: "Su solicitud de más tiempo está con el capitán. Recibirá un correo en cuanto se confirme.",
    notToday: "El tiempo extra se pide el mismo día", notTodayP: "Este enlace funciona el día de su alquiler, hasta que termina. Escríbanos si desea cambiar su reserva.",
    ended: "Su alquiler ha terminado", endedP: "Esperamos que haya disfrutado de un día maravilloso en el agua. Escríbanos cuando quiera para planear el próximo.",
    notBooked: "Este alquiler aún no está confirmado", notBookedP: "Escríbanos y le ayudamos.",
    noPrice: "Organicémoslo juntos", noPriceP: "No podemos calcular en línea el tiempo extra para este yate. Escríbanos y lo consultamos con el capitán.",
    off: "El pago en línea llega pronto", offP: "Escríbanos y organizamos el tiempo extra.",
    bad: "Este enlace no es válido", badP: "Abra de nuevo el enlace de su correo o escríbanos.",
    error: "Algo salió mal", errorP: "No se cobró nada. Inténtelo de nuevo en un momento o escríbanos.",
    chat: "Chatear por WhatsApp", wa: (r) => `Hola Yachtique, queremos más tiempo a bordo (${r}).`,
    product: (h, y) => `Tiempo extra +${h}h` + (y ? " · " + y : ""),
  },
};

export default async (req, context) => {
  const url = new URL(req.url);
  const ref = String(context.params.ref || "").toUpperCase();
  const t = url.searchParams.get("t") || "";
  const qs = url.searchParams.get("lang");
  let L = qs === "es" || qs === "en" ? qs : "en";
  const waBtn = (r) => `<a class="btn btn--wa btn--block" href="https://wa.me/${WA}?text=${encodeURIComponent(T[L].wa(r))}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>${T[L].chat}</a>`;
  const page = (title, inner, status) => cardPage(title, inner, status, L);
  const say = (title, p, status = 200) => page(title, `<p class="eyebrow">${T[L].eyebrow}</p><h1>${esc(title)}</h1><p class="dnote">${esc(p)}</p>${waBtn(ref)}`, status);

  const secret = Netlify.env.get("SHEETS_SECRET");
  if (!secret || !Netlify.env.get("SHEETS_WEBHOOK_URL")) return say(T[L].off, T[L].offP, 503);
  if (!RX_REF.test(ref) || !tokenOk(ref, t, secret, "ext:")) return say(T[L].bad, T[L].badP, 403);

  const r = await sheet({ type: "lookup", ref }).catch(() => null);
  if (!r || !r.ok) return say(T[L].bad, T[L].badP, 404);
  const q = r.enquiry;
  if (qs !== "es" && qs !== "en") L = q.lang === "es" ? "es" : "en";
  const S = T[L];
  if (!/^(paid|booked)$/i.test(q.status)) return say(S.notBooked, S.notBookedP, 409);
  const when = charterWindow(q);
  if (when === "before") return say(S.notToday, S.notTodayP, 409);
  if (when === "after") return say(S.ended, S.endedP, 409);
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) return say(S.off, S.offP, 503);
  const self = `${url.origin}/extend/${ref}?t=${t}${qs ? `&lang=${qs}` : ""}`;
  const yacht = String(q.yacht || "").replace(/\s*\(.*$/, "").replace(/help me choose/i, "").trim();
  const heldPage = (w) => page(S.heldHead, `<p class="eyebrow">${S.eyebrow} · ${esc(ref)}</p><div class="dicon is-ok">✓</div><h1>${S.heldHead}</h1><p class="dnote">${esc(S.heldP(w))}</p>${waBtn(ref)}`);
  const hold = (pi, hours) => sheet({ type: "extension", ref, state: "held", hours, amount: pi.amount, payment: pi.id }).catch(() => null);

  // Back from Checkout: record the hold
  const sid = url.searchParams.get("session_id");
  if (sid) {
    const s = await stripe(key, "GET", `checkout/sessions/${encodeURIComponent(sid)}?expand[]=payment_intent`).catch(() => null);
    const pi = s && s.payment_intent;
    if (s && s.client_reference_id === ref && s.metadata && s.metadata.kind === "extension" && pi && pi.status === "requires_capture") {
      const h = await hold(pi, Number(s.metadata.hours) || 1);
      if (h && h.ok) return heldPage(S.hour(Number(s.metadata.hours) || 1));
      // Refused (another request already waiting): let the money go
      if (h) await stripe(key, "POST", `payment_intents/${pi.id}/cancel`).catch(() => null);
      return say(S.error, S.errorP, 502);
    }
  }
  // One request at a time
  if (/Held$/.test(String(q.extension || ""))) {
    return page(S.waitingHead, `<p class="eyebrow">${S.eyebrow} · ${esc(ref)}</p><h1>${S.waitingHead}</h1><p class="dnote">${S.waitingP}</p>${waBtn(ref)}`);
  }

  const offer = await extOffer(req, q, Number(r.taxRate) || 0, r.taxGratuity !== false);
  if (!offer) return say(S.noPrice, S.noPriceP);
  const saved = await savedCard(key, q.payment);

  if (req.method === "POST") {
    const f = await req.formData().catch(() => null);
    const hours = Number(f && f.get("hours"));
    const o = offer.find((x) => x.hours === hours);
    if (!o) return say(S.error, S.errorP, 400);
    const cents = (n) => Math.round(n * 100);
    const meta = { "metadata[ref]": ref, "metadata[kind]": "extension", "metadata[hours]": hours };
    const what = `${ref} · ${q.name} · +${hours}h${yacht ? " · " + yacht : ""}`;
    // One tap: the card kept at the first payment. Any problem (expired card, extra check) falls back to Checkout.
    if (saved && f.get("how") === "saved") {
      const pi = await stripe(key, "POST", "payment_intents", {
        amount: cents(o.total), currency: "usd", customer: saved.customer, payment_method: saved.pm,
        off_session: true, confirm: true, capture_method: "manual", description: what, ...meta,
      }).catch((e) => { console.error(e); return null; });
      if (pi && pi.status === "requires_capture") {
        const h = await hold(pi, hours);
        if (h && h.ok) return heldPage(S.hour(hours));
        // Not recorded: let go of the money rather than leave a hold nobody sees
        await stripe(key, "POST", `payment_intents/${pi.id}/cancel`).catch(() => null);
        return say(S.error, S.errorP, 502);
      }
      if (pi && pi.id) await stripe(key, "POST", `payment_intents/${pi.id}/cancel`).catch(() => null);
    }
    const p = {
      mode: "payment", client_reference_id: ref, locale: L, ...meta,
      "payment_intent_data[capture_method]": "manual",
      "payment_intent_data[description]": what,
      "payment_intent_data[metadata][ref]": ref, "payment_intent_data[metadata][kind]": "extension", "payment_intent_data[metadata][hours]": hours,
      success_url: `${self}${self.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: self,
    };
    if (saved) p.customer = saved.customer;
    else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) p.customer_email = q.email;
    [[S.product(hours, yacht), o.charter], [S.gratuity(o.pct), o.grat], [S.tax(o.rate), o.tax]].filter(([, a]) => cents(a) > 0).forEach(([name, a], i) => Object.assign(p, {
      [`line_items[${i}][quantity]`]: 1,
      [`line_items[${i}][price_data][currency]`]: "usd",
      [`line_items[${i}][price_data][unit_amount]`]: cents(a),
      [`line_items[${i}][price_data][product_data][name]`]: name,
    }));
    const s = await stripe(key, "POST", "checkout/sessions", p).catch((e) => { console.error(e); return null; });
    if (!s || !s.url) return say(S.error, S.errorP, 502);
    return new Response(null, { status: 303, headers: { Location: s.url, "Cache-Control": "no-store" } });
  }

  const opt = (o, i) => `<label class="ydur"><input type="radio" name="hours" value="${o.hours}"${i ? "" : " checked"} data-total="${esc(usd(o.total))}"><span><i>${S.hour(o.hours)}</i><b>${usd(o.total)}</b></span></label>`;
  const rows = (o) => `<ul class="dsum" data-for="${o.hours}"${o.hours === offer[0].hours ? "" : " hidden"}>
        <li><span>${S.charter} (${S.hour(o.hours)})</span><b>${usd(o.charter)}</b></li>
        ${o.grat > 0 ? `<li><span>${S.gratuity(o.pct)}</span><b>${usd(o.grat)}</b></li>` : ""}
        ${o.tax > 0 ? `<li><span>${S.tax(o.rate)}</span><b>${usd(o.tax)}</b></li>` : ""}
        <li class="dsum__total"><span>${S.total}</span><b>${usd(o.total)}</b></li>
      </ul>`;
  return page(S.eyebrow, `
      <p class="eyebrow">${S.eyebrow} · ${esc(ref)}</p>
      <h1>${S.head(esc(first(q)))}</h1>
      <p class="dnote">${S.lead(yacht, q.duration)}</p>
      <form method="POST" action="${esc(self)}" class="dpay">
        <fieldset class="ydurs"><div class="ydurs__grid">${offer.map(opt).join("")}</div></fieldset>
        ${offer.map(rows).join("")}
        ${saved
          ? `<button type="submit" name="how" value="saved" class="btn btn--gold btn--block" data-pay>${S.holdSaved(usd(offer[0].total), esc(saved.label))}</button>
        <button type="submit" name="how" value="card" class="btn btn--ghost btn--block">${S.other}</button>`
          : `<button type="submit" name="how" value="card" class="btn btn--gold btn--block">${S.holdCard}</button>`}
      </form>
      <p class="dhint dsafe">${S.how}</p>
      ${payBadges(L === "es" ? "Pago seguro con Stripe" : "Secure checkout by Stripe")}
      <script>
        (function () {
          var f = document.querySelector("form.dpay"), pay = f.querySelector("[data-pay]"), tpl = ${JSON.stringify(saved ? S.holdSaved("{a}", saved.label) : "")};
          f.addEventListener("change", function () {
            var c = f.querySelector('[name="hours"]:checked');
            f.querySelectorAll(".dsum").forEach(function (u) { u.hidden = u.getAttribute("data-for") !== c.value; });
            if (pay) pay.textContent = tpl.replace("{a}", c.getAttribute("data-total"));
          });
        })();
      </script>`);
};

export const config = { path: "/extend/:ref" };

// "before" (not the charter day yet), "open", or "after" (the charter ended, with any extra time confirmed so far
// and 15 minutes' grace). Without a start time the link works the whole charter day.
function charterWindow(q) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map((p) => [p.type, p.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`, now = +parts.hour * 60 + +parts.minute;
  const date = String(q.date || "");
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(q.start || ""));
  const hours = parseInt(q.duration, 10);
  if (!m || !(hours > 0)) return date === today ? "open" : date > today ? "before" : "after";
  const extra = String(q.extension || "").split(" | ").filter((x) => /Confirmed$/.test(x)).reduce((n, x) => n + (parseInt((/\+(\d+)/.exec(x) || [])[1], 10) || 0), 0);
  const end = +m[1] * 60 + +m[2] + (hours + extra) * 60 + 15;
  const yesterday = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day - 1)).toISOString().slice(0, 10);
  if (date === today) return now <= end ? "open" : "after";
  if (date === yesterday) return now + 24 * 60 <= end ? "open" : "after";
  return date > today ? "before" : "after";
}

// +1 and +2 hours: the yacht's price per hour from its own rates (from the client's marina when it has its own),
// taken from the step between the booked duration and the next one up to 12 hours; gratuity at the booking's % and tax.
async function extOffer(req, q, rate, taxGratuity) {
  const name = String(q.yacht || "").replace(/\s*\(.*$/, "").trim().toLowerCase();
  if (!name || /help me choose/.test(name)) return null;
  const fleet = await loadFleet(req).catch(() => null);
  const y = (fleet || []).find((x) => String(x.name).trim().toLowerCase() === name);
  if (!y) return null;
  const at = (y.departures || []).find((p) => p.name === q.departure);
  const prices = at ? at.prices : Object.fromEntries(y.durations.map((d) => [d.label, d.price]));
  const points = Object.entries(prices)
    .map(([label, price]) => [parseInt((/^(\d+)\s*hours?$/i.exec(label.trim()) || [])[1], 10), price])
    .filter(([h]) => h > 0 && h <= 12)
    .sort((a, b) => a[0] - b[0]);
  if (points.length < 2) return null;
  const booked = parseInt(q.duration, 10);
  let i = points.findIndex(([h]) => h === booked);
  if (i < 0) i = 0;
  if (i === points.length - 1) i--;
  const perHour = Math.round((points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]));
  if (!(perHour > 0)) return null;
  const pct = q.price > 0 ? Math.round((q.gratuity || 0) / q.price * 100) : 0;
  const r2 = (n) => Math.round(n * 100) / 100;
  return HOURS.map((hours) => {
    const charter = perHour * hours, grat = r2(charter * pct / 100);
    const tax = r2((taxGratuity ? charter + grat : charter) * rate);
    return { hours, charter, grat, pct, tax, rate: +(rate * 100).toFixed(2), total: r2(charter + grat + tax) };
  });
}

// The card from the first payment, when Stripe kept it for this booking
async function savedCard(key, payment) {
  if (!/^pi_/.test(String(payment || ""))) return null;
  const pi = await stripe(key, "GET", `payment_intents/${encodeURIComponent(payment)}?expand[]=payment_method`).catch(() => null);
  const pm = pi && pi.payment_method;
  if (!pi || !pi.customer || !pm || !pm.id) return null;
  const c = pm.card || {};
  const brand = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" }[c.brand] || "card";
  const wallet = c.wallet && c.wallet.type === "apple_pay" ? "Apple Pay " : c.wallet && c.wallet.type === "google_pay" ? "Google Pay " : "";
  return { customer: typeof pi.customer === "string" ? pi.customer : pi.customer.id, pm: pm.id, label: c.last4 ? `${wallet}${brand} •••• ${c.last4}` : "your card" };
}
