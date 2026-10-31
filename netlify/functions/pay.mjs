// GET/POST /pay/YQ-1042?t=CODE  ·  The client's payment page, linked from the "Accepted" email.
//
//   GET                -> the charter, the total with Florida sales tax, and one Pay button (in the client's language).
//   POST               -> opens Stripe Checkout for the total saved in the Google Sheet (never an amount from the browser).
//   GET ?session_id=   -> Stripe sends the client back here; we check the payment with Stripe and mark the enquiry Paid.
//                         The Stripe webhook (/api/stripe-webhook) does the same, in case the client closes the tab.
//
// Netlify environment variables: STRIPE_SECRET_KEY (plus SHEETS_WEBHOOK_URL and SHEETS_SECRET).
import { WA, esc } from "../lib/site.mjs";
import { RX_REF, tokenOk, sheet, first, usd, cardPage } from "../lib/card.mjs";

const T = {
  en: {
    eyebrow: "Secure payment", head: (n) => "Your charter" + (n ? ", " + n : ""), charter: "Charter", gratuity: (p) => `Gratuity (${p}%)`, tax: (r) => `Florida sales tax (${r}%)`, total: "Total",
    date: "Date", guests: "Guests", duration: "Duration", yacht: "Yacht", flexible: "Flexible", help: "To confirm",
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
    eyebrow: "Pago seguro", head: (n) => "Su alquiler" + (n ? ", " + n : ""), charter: "Alquiler", gratuity: (p) => `Propina (${p}%)`, tax: (r) => `Impuesto de ventas de Florida (${r}%)`, total: "Total",
    date: "Fecha", guests: "Invitados", duration: "Duración", yacht: "Yate", flexible: "Flexible", help: "Por confirmar",
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
      "line_items[0][price_data][product_data][description]": `${ref} · ${[durLabel(q.duration, L), prettyDate(q.date, L)].filter(Boolean).join(" · ")}`,
      "metadata[ref]": ref,
      "payment_intent_data[metadata][ref]": ref,
      "payment_intent_data[description]": `${ref} · ${q.name} · ${what}`,
      success_url: `${self}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: self,
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
      ${sum(q, S, r.taxRate)}
      <form method="POST" action="${esc(self)}">
        <button type="submit" class="btn btn--gold btn--block">${S.pay(usd(q.total))}</button>
      </form>
      <p class="dhint dsafe">${S.safe}</p>
      <p class="dswitch">${S.terms} <a href="/terms.html${L === "es" ? "?lang=es" : ""}" target="_blank" rel="noopener">${S.termsLink}</a>.</p>`);
};

export const config = { path: "/pay/:ref" };

async function stripe(key, method, path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: params ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${j.error && j.error.message}`);
  return j;
}

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
        <li><span>${S.charter}</span><b>${usd(q.price)}</b></li>
        ${q.gratuity > 0 ? `<li><span>${S.gratuity(gratPct(q))}</span><b>${usd(q.gratuity)}</b></li>` : ""}
        ${q.total > q.price + (q.gratuity || 0) ? `<li><span>${S.tax(rateLabel(rate))}</span><b>${usd(q.total - q.price - (q.gratuity || 0))}</b></li>` : ""}
        <li class="dsum__total"><span>${S.total}${paid ? " ✓" : ""}</span><b>${usd(q.total)}</b></li>
      </ul>`;
}
