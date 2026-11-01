// POST /api/stripe-webhook  ·  Stripe tells us a Checkout payment finished, even if the client closed the tab.
// Marks the enquiry Paid in the Google Sheet (the Apps Script ignores repeats, so the pay page and this can both report it).
//
// Stripe Dashboard > Developers > Webhooks > Add endpoint: https://yachtique.co/api/stripe-webhook
//   events: checkout.session.completed, checkout.session.async_payment_succeeded
// Netlify environment variable: STRIPE_WEBHOOK_SECRET (the endpoint's signing secret, starts with whsec_).
import crypto from "node:crypto";
import { RX_REF, sheet, stripe } from "../lib/card.mjs";

const TOLERANCE = 300; // seconds

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const whsec = (Netlify.env.get("STRIPE_WEBHOOK_SECRET") || "").trim();
  if (!whsec) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  if (!verify(raw, req.headers.get("stripe-signature") || "", whsec)) return new Response("Bad signature", { status: 400 });

  const ev = JSON.parse(raw);
  const s = ev.data && ev.data.object;
  // More time on board (extend.mjs): the card is only held, so record the hold; it is charged when Nektarios confirms
  if (ev.type === "checkout.session.completed" && s && s.metadata && s.metadata.kind === "extension") {
    const key = Netlify.env.get("STRIPE_SECRET_KEY");
    const pi = key && s.payment_intent ? await stripe(key, "GET", `payment_intents/${encodeURIComponent(s.payment_intent)}`).catch(() => null) : null;
    if (!pi || pi.status !== "requires_capture" || !RX_REF.test(String(s.client_reference_id || ""))) return new Response("Ignored", { status: 200 });
    const h = await sheet({ type: "extension", ref: s.client_reference_id, state: "held", hours: Number(s.metadata.hours) || 1, amount: pi.amount, payment: pi.id }).catch(() => null);
    // The Sheet couldn't be reached: 500, so Stripe tries again. A refusal (say, another request already waiting) is final.
    if (!h) return new Response("Sheet update failed", { status: 500 });
    if (!h.ok) {
      console.error(`Extension hold for ${s.client_reference_id} not recorded, released: ${h.error}`);
      await stripe(key, "POST", `payment_intents/${pi.id}/cancel`).catch(() => null);
    }
    return new Response("OK", { status: 200 });
  }
  const done = ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded";
  if (!done || !s || s.payment_status !== "paid" || !RX_REF.test(String(s.client_reference_id || ""))) {
    return new Response("Ignored", { status: 200 });
  }
  const r = await sheet({ type: "paid", ref: s.client_reference_id, amount: s.amount_total, payment: s.payment_intent || s.id }).catch((e) => ({ ok: false, error: String(e) }));
  // A failure answers 500, so Stripe retries later
  if (!r || !r.ok) {
    console.error(`Marking ${s.client_reference_id} paid failed: ${r && r.error}`);
    return new Response("Sheet update failed", { status: 500 });
  }
  console.log(`${s.client_reference_id} paid ${s.amount_total / 100} USD${r.already ? " (already marked)" : ""}`);
  return new Response("OK", { status: 200 });
};

export const config = { path: "/api/stripe-webhook" };

// Stripe-Signature: t=TIMESTAMP,v1=HMAC_SHA256(secret, "TIMESTAMP.BODY")
function verify(raw, header, whsec) {
  const parts = header.split(",").map((p) => p.split("="));
  const ts = (parts.find(([k]) => k === "t") || [])[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!ts || !sigs.length || Math.abs(Date.now() / 1000 - Number(ts)) > TOLERANCE) return false;
  const want = Buffer.from(crypto.createHmac("sha256", whsec).update(`${ts}.${raw}`).digest("hex"));
  return sigs.some((v) => v.length === want.length && crypto.timingSafeEqual(Buffer.from(v), want));
}
