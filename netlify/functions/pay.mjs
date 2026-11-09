// GET/POST /pay/YQ-1042?t=CODE  ·  The client's payment page, linked from the "Accepted" email.
//
//   GET                -> the charter, the total with Florida sales tax, and one Pay button (in the client's language).
//   POST               -> opens Stripe Checkout for the total saved in the Google Sheet (never an amount from the browser).
//                         The client can switch the gratuity (15/18/20%) first: the Sheet recalculates and saves the total.
//   GET ?session_id=   -> Stripe sends the client back here; we check the payment with Stripe and mark the enquiry Paid.
//                         The Stripe webhook (/api/stripe-webhook) does the same, in case the client closes the tab.
//
// Netlify environment variables: STRIPE_SECRET_KEY (plus SHEETS_WEBHOOK_URL and SHEETS_SECRET).
import { WA, esc, payBadges } from "../lib/site.mjs";
import { RX_REF, tokenOk, sheet, first, usd, cardPage, stripe } from "../lib/card.mjs";

const T = {
  en: {
    eyebrow: "Secure payment", head: (n) => "Your charter" + (n ? ", " + n : ""), charter: "Charter", discount: (p) => `Discount${p ? ` (${p}%)` : ""}`, offNote: (a) => ` · discount of ${a} applied`, gratuity: (p) => `Gratuity (${p}%)`, tax: (r) => `Florida sales tax (${r}%)`, total: "Total",
    date: "Date", guests: "Guests", duration: "Duration", yacht: "Yacht", flexible: "Flexible", help: "To confirm",
    secure: "Secure checkout by Stripe", saved: "Your card is kept securely by Stripe for this booking, so you can add time on board with one tap.", tip: "Gratuity", tipNote: "Change it if you like. It goes to the crew, so there is nothing to settle on board.", none: "None",
    pay: (a) => `Pay ${a}`, safe: "Card, Apple Pay or Google Pay, processed securely by Stripe. Yachtique never sees your card number.",
    terms: "By paying you agree to our", termsLink: "booking terms",
    paidEyebrow: "Payment received", paidHead: (n) => "Thank you" + (n ? ", " + n : "") + ".",
    paidP: "We're reserving your yacht with the captain now. You'll receive the final confirmation and the boarding details shortly. A receipt is on its way to your email.",
    waitHead: "Almost there", waitP: "Your payment is still being processed. You'll receive an email as soon as it's complete.",
    notReady: "This payment link isn't ready yet", notReadyP: "Message us and we'll send you the right link.",
    off: "Online payment is coming soon", offP: "Message us and we'll arrange your payment.",
    bad: "This link is not valid", badP: "Open the link from your email again, or message us.",
    chat: "Chat on WhatsApp", waPay: (r) => `Hi Yachtique, I have a question about paying for my charter (${r}).`,
    error: "Something went wrong", errorP: "No payment was taken. Please try again in a moment, or message us.",
    product: (y) => "Yacht charter" + (y ? " · " + y : ""),
  },
  es: {
    eyebrow: "Pago seguro", head: (n) => "Su alquiler" + (n ? ", " + n : ""), charter: "Alquiler", discount: (p) => `Descuento${p ? ` (${p}%)` : ""}`, offNote: (a) => ` · descuento de ${a} aplicado`, gratuity: (p) => `Propina (${p}%)`, tax: (r) => `Impuesto de ventas de Florida (${r}%)`, total: "Total",
    date: "Fecha", guests: "Invitados", duration: "Duración", yacht: "Yate", flexible: "Flexible", help: "Por confirmar",
    secure: "Pago seguro con Stripe", saved: "Stripe guarda su tarjeta de forma segura para esta reserva, así puede añadir tiempo a bordo con un toque.", tip: "Propina", tipNote: "Puede cambiarla si lo desea. Es para la tripulación, así que no hay nada que pagar a bordo.", none: "Sin propina",
    pay: (a) => `Pagar ${a}`, safe: "Tarjeta, Apple Pay o Google Pay, procesado de forma segura por Stripe. Yachtique nunca ve el número de su tarjeta.",
    terms: "Al pagar acepta nuestras", termsLink: "condiciones de reserva",
    paidEyebrow: "Pago recibido", paidHead: (n) => "Gracias" + (n ? ", " + n : "") + ".",
    paidP: "Ahora estamos reservando su yate con el capitán. En breve recibirá la confirmación final y los detalles para embarcar. El recibo está en camino a su correo.",
    waitHead: "Casi listo", waitP: "Su pago aún se está procesando. Recibirá un correo en cuanto se complete.",
    notReady: "Este enlace de pago aún no está listo", notReadyP: "Escríbanos y le enviaremos el enlace correcto.",
    off: "El pago en línea llega pronto", offP: "Escríbanos y organizamos su pago.",
    bad: "Este enlace no es válido", badP: "Abra de nuevo el enlace de su correo o escríbanos.",
    chat: "Chatear por WhatsApp", waPay: (r) => `Hola Yachtique, tengo una pregunta sobre el pago de mi alquiler (${r}).`,
    error: "Algo salió mal", errorP: "No se realizó ningún cargo. Inténtelo de nuevo en un momento o escríbanos.",
    product: (y) => "Alquiler de yate" + (y ? " · " + y : ""),
  },
};
const GRATUITY_CHOICES = [15, 18, 20];
const ES_DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ES_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async (req, context) => {
  const url = new URL(req.url);
  const ref = String(context.params.ref || "").toUpperCase();
  const t = url.searchParams.get("t") || "";
  const qs = url.searchParams.get("lang");
  let L = qs === "es" || qs === "en" ? qs : "en";
  const page = (title, inner, status) => cardPage(title, inner, status, L);
  const say = (title, p, status = 200, ref2) => page(title, `<h1>${esc(title)}</h1><p class="dnote">${esc(p)}</p>${waBtn(ref2 || ref)}`, status);
  const waBtn = (r) => `<a class="btn btn--wa btn--block" href="https://wa.me/${WA}?text=${encodeURIComponent(T[L].waPay(r))}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>${T[L].chat}</a>`;

  const secret = Netlify.env.get("SHEETS_SECRET");
  if (!secret || !Netlify.env.get("SHEETS_WEBHOOK_URL")) return say(T[L].off, T[L].offP, 503);
  if (!RX_REF.test(ref) || !tokenOk(ref, t, secret, "pay:")) return say(T[L].bad, T[L].badP, 403);

  const r = await sheet({ type: "lookup", ref }).catch(() => null);
  if (!r || !r.ok) return say(T[L].bad, T[L].badP, 404);
  let q = r.enquiry;
  if (qs !== "es" && qs !== "en") L = q.lang === "es" ? "es" : "en";
  const S = T[L];
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  const self = `${url.origin}/pay/${ref}?t=${t}`;

  // Back from Stripe: confirm with Stripe itself, then mark the enquiry Paid
  const sid = url.searchParams.get("session_id");
  if (sid && key && !/^paid$/i.test(q.status)) {
    const s = await stripe(key, "GET", `checkout/sessions/${encodeURIComponent(sid)}`).catch(() => null);
    if (s && s.client_reference_id === ref && s.payment_status === "paid") {
      const p = await sheet({ type: "paid", ref, amount: s.amount_total, payment: s.payment_intent || s.id }).catch(() => null);
      if (p && p.ok) q = p.enquiry;
    } else if (s && s.client_reference_id === ref && s.status === "complete") {
      return page(S.waitHead, `<p class="eyebrow">${esc(ref)}</p><h1>${S.waitHead}</h1><p class="dnote">${S.waitP}</p>${waBtn(ref)}`);
    }
  }

  if (/^paid$/i.test(q.status)) {
    return page(S.paidEyebrow, `
      <p class="eyebrow">${S.paidEyebrow} · ${esc(ref)}</p>
      <div class="dicon is-ok">✓</div>
      <h1>${S.paidHead(esc(first(q)))}</h1>
      ${facts(q, S, L)}
      ${sum(q, S, r.taxRate, true)}
      <p class="dnote">${S.paidP}</p>
      ${waBtn(ref)}`);
  }
  if (!/^accepted$/i.test(q.status) || !(q.total > 0)) return say(S.notReady, S.notReadyP, 409);
  if (!key) return say(S.off, S.offP, 503);

  if (req.method === "POST") {
    // A different gratuity picked on the page: the Sheet works out and saves the new total first
    const form = await req.formData().catch(() => null);
    const pct = parseInt(form && form.get("gratuity"), 10);
    if (GRATUITY_CHOICES.includes(pct) && pct !== gratPct(q)) {
      const g = await sheet({ type: "gratuity", ref, gratuity: pct }).catch(() => null);
      if (!g || !g.ok) return say(S.error, S.errorP, 502);
      q = g.enquiry;
    }
    const cents = (n) => Math.round(Number(n) * 100);
    const yacht = String(q.yacht || "").replace(/\s*\(.*$/, "").trim();
    const what = [/help me choose/i.test(yacht) ? "" : yacht, q.duration, prettyDate(q.date, "en")].filter(Boolean).join(" · ");
    const p = {
      mode: "payment",
      client_reference_id: ref,
      locale: L,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": cents(q.price),
      "line_items[0][price_data][product_data][name]": S.product(/help me choose/i.test(yacht) ? "" : yacht),
      "line_items[0][price_data][product_data][description]": `${ref} · ${[durLabel(q.duration, L), prettyDate(q.date, L)].filter(Boolean).join(" · ")}${q.discount > 0 ? S.offNote(usd(q.discount)) : ""}`,
      "metadata[ref]": ref,
      "payment_intent_data[metadata][ref]": ref,
      "payment_intent_data[description]": `${ref} · ${q.name} · ${what}`,
      success_url: `${self}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: self,
      // While extensions are off (extend.mjs) the card isn't kept. To keep it again for one-tap extra time:
      //   customer_creation: "always", "payment_intent_data[setup_future_usage]": "off_session",
    };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) p.customer_email = q.email;
    // Gratuity and sales tax as their own lines, so the receipt shows them
    const extra = [];
    if (cents(q.gratuity || 0) > 0) extra.push([S.gratuity(gratPct(q)), cents(q.gratuity)]);
    const tax = cents(q.total) - cents(q.price) - cents(q.gratuity || 0);
    if (tax > 0) extra.push([S.tax(rateLabel(r.taxRate)), tax]);
    extra.forEach(([name, amount], i) => Object.assign(p, {
      [`line_items[${i + 1}][quantity]`]: 1,
      [`line_items[${i + 1}][price_data][currency]`]: "usd",
      [`line_items[${i + 1}][price_data][unit_amount]`]: amount,
      [`line_items[${i + 1}][price_data][product_data][name]`]: name,
    }));
    const s = await stripe(key, "POST", "checkout/sessions", p).catch((e) => { console.error(e); return null; });
    if (!s || !s.url) return say(S.error, S.errorP, 502);
    return new Response(null, { status: 303, headers: { Location: s.url, "Cache-Control": "no-store" } });
  }

  return page(S.eyebrow, `
      <p class="eyebrow">${S.eyebrow} · ${esc(ref)}</p>
      <h1>${S.head(esc(first(q)))}</h1>
      ${facts(q, S, L)}
      <form method="POST" action="${esc(self)}" class="dpay">
        ${tipPicker(q, S, r)}
        ${sum(q, S, r.taxRate)}
        <button type="submit" class="btn btn--gold btn--block" data-pay>${S.pay(usd(q.total))}</button>
      </form>
      ${payBadges(S.secure)}
      <p class="dhint dsafe">${S.safe}</p>
      <p class="dswitch">${S.terms} <a href="/terms.html${L === "es" ? "?lang=es" : ""}" target="_blank" rel="noopener">${S.termsLink}</a>.</p>`);
};

export const config = { path: "/pay/:ref" };

function rateLabel(rate) { return +((Number(rate) || 0) * 100).toFixed(2); }
function gratPct(q) { return Math.round((Number(q.gratuity) || 0) / q.price * 100); }

function prettyDate(iso, L) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return iso || "";
  const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3]));
  if (L === "es") return `${ES_DAYS[d.getUTCDay()]}, ${+m[3]} de ${ES_MONTHS[m[2] - 1]} de ${m[1]}`;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function durLabel(x, L) { return L === "es" ? String(x || "").replace(/(\d+)\s*hours?/i, "$1 horas") : x; }

function facts(q, S, L) {
  const dur = (x) => durLabel(x, L);
  const yacht = String(q.yacht || "").replace(/\s*\(.*$/, "").trim();
  const f = [
    [S.date, prettyDate(q.date, L).replace(/^./, (c) => c.toUpperCase()) || S.flexible],
    [S.guests, q.guests || S.help],
    [S.duration, q.duration ? dur(q.duration) : S.help],
    [S.yacht, yacht && !/help me choose/i.test(yacht) ? yacht : S.help],
  ];
  return `<ul class="yfacts dfacts">${f.map(([k, v]) => `<li><b>${esc(v)}</b><span>${esc(k)}</span></li>`).join("")}</ul>`;
}

function sum(q, S, rate, paid) {
  return `<ul class="dsum">
        <li><span>${S.charter}</span><b>${usd((q.price || 0) + (q.discount || 0))}</b></li>
        ${q.discount > 0 ? `<li><span>${S.discount(Math.round(q.discount / (q.price + q.discount) * 100))}</span><b>&minus;${usd(q.discount)}</b></li>` : ""}
        <li data-row="grat"${q.gratuity > 0 ? "" : " hidden"}><span data-sum="gratlabel">${S.gratuity(gratPct(q))}</span><b data-sum="grat">${usd(q.gratuity)}</b></li>
        ${q.total > q.price + (q.gratuity || 0) ? `<li><span>${S.tax(rateLabel(rate))}</span><b data-sum="tax">${usd(q.total - q.price - (q.gratuity || 0))}</b></li>` : ""}
        <li class="dsum__total"><span>${S.total}${paid ? " ✓" : ""}</span><b data-sum="total">${usd(q.total)}</b></li>
      </ul>`;
}

// 15 / 18 / 20% pills (plus what Nektarios set, if it's something else). The page shows the new total at once;
// the amount itself is worked out again in the Sheet when the client pays.
function tipPicker(q, S, r) {
  const now = gratPct(q);
  const opts = [...new Set([...GRATUITY_CHOICES, now])].sort((a, b) => a - b);
  const taxed = r.taxGratuity === false ? 0 : 1;
  return `<fieldset class="form__tips dtips">
        <legend>${S.tip}</legend>
        <div class="tips" style="grid-template-columns:repeat(${opts.length},1fr)">${opts.map((p) => `<label><input type="radio" name="gratuity" value="${p}"${p === now ? " checked" : ""}><span>${p ? `${p}%` : S.none}</span></label>`).join("")}</div>
        <small class="form__note">${S.tipNote}</small>
      </fieldset>
      <script>
        (function () {
          var price = ${Number(q.price) || 0}, rate = ${Number(r.taxRate) || 0}, taxTip = ${taxed}, f = document.currentScript.closest("form");
          var label = ${JSON.stringify(S.gratuity("{p}"))}, payLabel = ${JSON.stringify(S.pay("{a}"))};
          function fmt(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
          f.addEventListener("change", function () {
            var pct = +(f.querySelector('[name="gratuity"]:checked') || {}).value || 0, g = Math.round(price * pct) / 100;
            var total = Math.round((price + g + (taxTip ? price + g : price) * rate) * 100) / 100;
            var row = f.querySelector('[data-row="grat"]'), tax = f.querySelector('[data-sum="tax"]');
            row.hidden = !g;
            f.querySelector('[data-sum="gratlabel"]').textContent = label.replace("{p}", pct);
            f.querySelector('[data-sum="grat"]').textContent = fmt(g);
            if (tax) tax.textContent = fmt(Math.round((total - price - g) * 100) / 100);
            f.querySelector('[data-sum="total"]').textContent = fmt(total);
            f.querySelector("[data-pay]").textContent = payLabel.replace("{a}", fmt(total));
          });
        })();
      </script>`;
}
