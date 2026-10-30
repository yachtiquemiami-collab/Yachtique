// POST /api/stripe-webhook  ·  Stripe tells us a Checkout payment finished, even if the client closed the tab.
// Marks the enquiry Paid in the Google Sheet (the Apps Script ignores repeats, so the pay page and this can both report it).
//
// Stripe Dashboard > Developers > Webhooks > Add endpoint: https://yachtique.co/api/stripe-webhook
//   events: checkout.session.completed, checkout.session.async_payment_succeeded
// Netlify environment variable: STRIPE_WEBHOOK_SECRET (the endpoint's signing secret, starts with whsec_).
import crypto from "node:crypto";
import { RX_REF, sheet } from "../lib/card.mjs";

const TOLERANCE = 300; // seconds

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const whsec = Netlify.env.get("STRIPE_WEBHOOK_SECRET");
  if (!whsec) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  if (!verify(raw, req.headers.get("stripe-signature") || "", whsec)) return new Response("Bad signature", { status: 400 });

  const ev = JSON.parse(raw);
  const s = ev.data && ev.data.object;
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
