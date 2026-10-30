// Shared pieces of the private one-card pages: Accept / Decline (/api/decide) and Pay (/pay/:ref).
import crypto from "node:crypto";
import { V, esc } from "./site.mjs";

export const RX_REF = /^YQ-\d{1,7}$/;

// Links carry a code made from the ref and SHEETS_SECRET, built the same way in the Apps Script.
// The pay code is different from the decide code, so a client's pay link can never accept or decline.
export function token(ref, secret, kind = "") {
  return crypto.createHmac("sha256", secret).update(kind + ref).digest("hex").slice(0, 20);
}
export function tokenOk(ref, t, secret, kind = "") {
  const want = token(ref, secret, kind);
  return typeof t === "string" && t.length === want.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(want));
}

// Calls the Apps Script web app with the shared secret
export async function sheet(body) {
  const url = Netlify.env.get("SHEETS_WEBHOOK_URL");
  const secret = Netlify.env.get("SHEETS_SECRET");
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, ...body }), redirect: "follow" });
  return res.json();
}

export function first(q) { return String(q.name || "").trim().split(/\s+/)[0] || ""; }

export function usd(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function cardPage(title, inner, status = 200, lang = "en") {
  return new Response(`<!doctype html>
<html lang="${lang === "es" ? "es" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
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
