// GET/POST /api/decide  ·  Accept or Decline an enquiry from the new-enquiry email.
//
//   GET  ?ref=YQ-1042&a=accept|decline&t=CODE  -> shows the enquiry and ONE confirm button.
//        Opening never changes anything: mail apps and link scanners open every link on their own.
//   POST ref, a, t                             -> sets the Status in the Google Sheet and emails the client
//        (in their language), through the Apps Script web app.
//
// t is an HMAC of the ref with SHEETS_SECRET (the Apps Script builds the same code for the email buttons).
import crypto from "node:crypto";
import { WA, V, esc } from "../lib/site.mjs";

const RX_REF = /^YQ-\d{1,7}$/;

export default async (req) => {
  const url = Netlify.env.get("SHEETS_WEBHOOK_URL");
  const secret = Netlify.env.get("SHEETS_SECRET");
  if (!url || !secret) return page("Not available", `<h1>Not available</h1><p>The enquiries sheet is not connected.</p>`, 503);

  let ref, a, t;
  if (req.method === "POST") {
    const f = await req.formData();
    ref = String(f.get("ref") || ""); a = String(f.get("a") || ""); t = String(f.get("t") || "");
  } else {
    const q = new URL(req.url).searchParams;
    ref = String(q.get("ref") || ""); a = String(q.get("a") || ""); t = String(q.get("t") || "");
  }
  if (!RX_REF.test(ref) || (a !== "accept" && a !== "decline") || !tokenOk(ref, t, secret)) {
    return page("Link not valid", `<h1>This link is not valid</h1><p>Open the enquiry from the email again, or change its Status in the Enquiries sheet.</p>`, 403);
  }

  const call = async (body) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, ...body }), redirect: "follow" });
    return res.json();
  };

  if (req.method !== "POST") {
    const r = await call({ type: "lookup", ref }).catch(() => null);
    if (!r || !r.ok) return page("Not found", `<h1>We couldn't find ${esc(ref)}</h1><p>Check the Enquiries sheet: the row may have been moved or deleted.</p>`, 404);
    const q = r.enquiry;
    if (/^(accepted|declined)$/i.test(q.status)) return page(q.status, decided(q, true));
    const accept = a === "accept";
    return page(accept ? "Accept enquiry" : "Decline enquiry", `
      <p class="eyebrow">${esc(ref)} · ${accept ? "Accept" : "Decline"}</p>
      <h1>${accept ? "Accept" : "Decline"} ${esc(q.name || "this enquiry")}?</h1>
      ${summary(q)}
      <p class="dnote">${accept
        ? `${esc(first(q))} gets an email${q.lang === "es" ? " in Spanish" : ""} saying the day is available and that you'll send the final quote and deposit.`
        : `${esc(first(q))} gets an email${q.lang === "es" ? " in Spanish" : ""} saying it can't be confirmed, with a link to the yachts free that day.`}</p>
      <form method="POST" action="/api/decide">
        <input type="hidden" name="ref" value="${esc(ref)}"><input type="hidden" name="a" value="${a}"><input type="hidden" name="t" value="${esc(t)}">
        <button type="submit" class="btn ${accept ? "btn--gold" : "btn--decline"} btn--block">Confirm ${accept ? "accept" : "decline"}</button>
      </form>
      <p class="dswitch"><a href="?ref=${encodeURIComponent(ref)}&a=${accept ? "decline" : "accept"}&t=${encodeURIComponent(t)}">${accept ? "Decline instead" : "Accept instead"}</a></p>`);
  }

  const r = await call({ type: "decide", ref, a }).catch(() => null);
  if (!r || !r.ok) return page("Not saved", `<h1>That didn't go through</h1><p>Nothing was sent. Try again, or set the Status in the Enquiries sheet.</p>`, 502);
  return page(r.enquiry.status, decided(r.enquiry, r.already, r.emailed));
};

export const config = { path: "/api/decide" };

function tokenOk(ref, t, secret) {
  const want = crypto.createHmac("sha256", secret).update(ref).digest("hex").slice(0, 20);
  return typeof t === "string" && t.length === want.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(want));
}

function first(q) { return String(q.name || "").trim().split(/\s+/)[0] || "The client"; }

function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return iso || "Flexible";
  return new Date(Date.UTC(+m[1], m[2] - 1, +m[3])).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function summary(q) {
  const facts = [["Date", prettyDate(q.date)], ["Guests", q.guests || "—"], ["Duration", q.duration || "—"], ["Yacht", q.yacht || "Help me choose"]];
  return `<ul class="yfacts dfacts">${facts.map(([k, v]) => `<li><b>${esc(v)}</b><span>${k}</span></li>`).join("")}</ul>
      <p class="dcontact">${[q.phone, q.email, q.lang === "es" ? "Spanish" : ""].filter(Boolean).map(esc).join(" · ")}</p>`;
}

function decided(q, already, emailed) {
  const ok = /accepted/i.test(q.status);
  const phone = String(q.phone || "").replace(/\D/g, "");
  const msg = ok
    ? (q.lang === "es" ? `Hola ${first(q)}, soy Nektarios de Yachtique. Su día está disponible. Le envío ahora la cotización final y el depósito.` : `Hi ${first(q)}, this is Nektarios from Yachtique. Your day is available. Sending you the final quote and deposit now.`)
    : (q.lang === "es" ? `Hola ${first(q)}, soy Nektarios de Yachtique. Le propongo otras opciones para su fecha.` : `Hi ${first(q)}, this is Nektarios from Yachtique. Let me suggest some other options for your date.`);
  return `
      <p class="eyebrow">${esc(q.ref)}</p>
      <div class="dicon ${ok ? "is-ok" : "is-no"}">${ok ? "✓" : "✕"}</div>
      <h1>${already ? `Already ${esc(q.status.toLowerCase())}` : esc(q.status)}</h1>
      ${summary(q)}
      <p class="dnote">${already
        ? "Nothing changed and no email was sent again."
        : emailed ? `${esc(first(q))} has been emailed${q.lang === "es" ? " in Spanish" : ""}. The Status in the sheet is now ${esc(q.status)}.`
          : `The Status in the sheet is now ${esc(q.status)}. No email was sent (no valid email address on the enquiry).`}</p>
      ${phone ? `<a class="btn btn--wa btn--block" href="https://wa.me/${phone}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>Message ${esc(first(q))} on WhatsApp</a>` : ""}`;
}

function page(title, inner, status = 200) {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Yachtique</title><meta name="robots" content="noindex, nofollow">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css?v=${V}">
</head><body class="dpage">
<main class="dwrap"><div class="dcard">
  <img src="/assets/img/logo-stacked-notag.png" alt="Yachtique" class="dlogo" width="160" height="54">
  ${inner}
</div></main>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="icon-wa" viewBox="0 0 32 32"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8.9 3.9.8a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.4z"/></symbol></svg>
</body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" },
  });
}
