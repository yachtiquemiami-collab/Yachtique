// POST /api/track
// Anonymous click counts from assets/js/core.js: page views, WhatsApp taps, calls, enquiries, yachts viewed, shortlists.
// No cookies, no names, no IP addresses. Each event becomes one row in the Events tab of the Google Sheet
// (through the same Apps Script web app as the enquiries); the Insights tab adds them up.
const EVENTS = new Set([
  "view", "whatsapp", "call", "email", "instagram", "enquiry", "search", "language",
  "yacht_quickview", "shortlist_add", "shortlist_remove", "shortlist_send", "shortlist_share", "available_filter",
]);
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|lighthouse|headless/i;

export default async (req, context) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  let b;
  try { b = await req.json(); } catch { return new Response(null, { status: 400 }); }
  if (!b || !EVENTS.has(b.e) || BOTS.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });

  const url = Netlify.env.get("SHEETS_WEBHOOK_URL");
  const secret = Netlify.env.get("SHEETS_SECRET");
  if (!url || !secret) return new Response(null, { status: 204 });

  const clip = (v, n) => String(v ?? "").replace(/[\r\n\t]/g, " ").slice(0, n);
  const event = {
    e: b.e, p: clip(b.p, 120), y: clip(b.y, 80), v: clip(b.v, 120),
    l: b.l === "es" ? "es" : "en", s: clip(b.s, 80), d: b.d === "phone" ? "phone" : "desktop",
    h: new URL(req.url).hostname,
  };
  const send = fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, type: "event", event }),
    redirect: "follow",
  }).catch((err) => console.error("track failed", err));
  // Answer the browser straight away; the Sheet write finishes in the background
  if (context && context.waitUntil) context.waitUntil(send); else await send;
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/track" };
