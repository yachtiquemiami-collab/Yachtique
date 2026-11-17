// /api/partner  ·  The partner (referral) program.
//
//   POST (JSON from partners.html)  -> the sign-up goes to the Partners tab of the Google Sheet as "Pending",
//                                      and Nektarios gets an email with an Approve button.
//   GET  ?code=&a=approve&t=        -> Nektarios's Approve page (the link in that email): one confirm button.
//   POST ?code=&a=approve&t= (form) -> the partner becomes Active; they get their link by email, and Nektarios
//                                      gets a WhatsApp button with the welcome message and the link.
//
// Partners share yachtique.co/?p=CODE. core.js remembers the code for 60 days and adds it to the inquiry form;
// the Sheet credits 10% of the charter to the partner when the client pays.
import { esc } from "../lib/site.mjs";
import { tokenOk, sheet, cardPage } from "../lib/card.mjs";

const RX_CODE = /^[a-z0-9-]{2,24}$/;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  const secret = Netlify.env.get("SHEETS_SECRET");
  if (!secret || !Netlify.env.get("SHEETS_WEBHOOK_URL")) return json({ ok: false, error: "not connected" }, 503);
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") || "").toLowerCase();
  const a = url.searchParams.get("a");

  // ---- Nektarios approves a partner ----
  if (a === "approve") {
    if (!RX_CODE.test(code) || !tokenOk(code, url.searchParams.get("t") || "", secret, "partner:")) {
      return cardPage("Link not valid", `<h1>This link is not valid</h1><p class="dnote">Open it again from the email, or set the Status to Active in the Partners tab.</p>`, 403);
    }
    if (req.method !== "POST") {
      const r = await sheet({ type: "partnerlookup", code }).catch(() => null);
      const p = r && r.ok && r.partner;
      if (!p) return cardPage("Not found", `<h1>We couldn't find ${esc(code)}</h1><p class="dnote">Check the Partners tab in the sheet.</p>`, 404);
      if (/^active$/i.test(p.status)) return cardPage("Active", done(p, false));
      return cardPage("Approve partner", `
        <p class="eyebrow">Partner program · Approve</p>
        <h1>Approve ${esc(p.name)}?</h1>
        <ul class="yfacts dfacts">${[["Type", p.type], ["Business", p.business || "—"], ["WhatsApp", p.phone], ["Email", p.email]].map(([k, v]) => `<li><b>${esc(v)}</b><span>${k}</span></li>`).join("")}</ul>
        ${p.about ? `<p class="dnote">"${esc(p.about)}"</p>` : ""}
        <form method="POST" class="form dform">
          <p class="dnote">Their link will be <b>yachtique.co/?p=${esc(p.code)}</b>. They get it by email${p.lang === "es" ? " in Spanish" : ""}, and you get a WhatsApp button to welcome them. Every booking from the link earns them 10% of the charter, after the charter.</p>
          <button type="submit" class="btn btn--gold btn--block">Approve and send the link</button>
        </form>
        <p class="dswitch">Not a fit? Set their Status to Declined in the Partners tab. Nothing is sent.</p>`);
    }
    const r = await sheet({ type: "partnerapprove", code }).catch(() => null);
    if (!r || !r.ok) return cardPage("Not saved", `<h1>That didn't go through</h1><p class="dnote">Nothing changed. Try again, or set the Status to Active in the Partners tab.</p>`, 502);
    return cardPage("Approved", done(r.partner, true, r.emailed));
  }

  // ---- Sign-up from partners.html ----
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  if (d.website) return json({ ok: true }); // the hidden field only bots fill in
  const clean = (v, n = 200) => String(v || "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
  const p = {
    name: clean(d.name, 80), business: clean(d.business, 120), type: clean(d.type, 40), phone: clean(d.phone, 40),
    email: clean(d.email, 120), zelle: clean(d.zelle, 120), about: clean(d.about, 600), lang: d.lang === "es" ? "es" : "en",
  };
  if (!p.name || !p.type || !/\d{7,}/.test(p.phone.replace(/\D/g, "")) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    return json({ ok: false, error: "missing" }, 400);
  }
  const r = await sheet({ type: "partner", partner: p }).catch(() => null);
  return r && r.ok ? json({ ok: true }) : json({ ok: false, error: "sheet" }, 502);
};

export const config = { path: "/api/partner" };

function done(p, now, emailed) {
  const link = `https://yachtique.co/?p=${p.code}`;
  const es = p.lang === "es";
  const first = String(p.name || "").trim().split(/\s+/)[0];
  const msg = es
    ? `Hola ${first}, soy Nektarios de Yachtique. ¡Bienvenido al programa de socios! Su enlace es ${link} . Cada cliente que reserve desde su enlace le da el 10% del alquiler, pagado por Zelle después del día. Cualquier cosa, escríbame aquí.`
    : `Hi ${first}, this is Nektarios from Yachtique. Welcome to the partner program! Your link is ${link} . Every client who books from it earns you 10% of the charter, paid by Zelle after the day. Anything you need, message me here.`;
  const phone = String(p.phone || "").replace(/\D/g, "");
  const wa = phone.length === 10 ? "1" + phone : phone;
  return `
    <p class="eyebrow">Partner program · ${esc(p.code)}</p>
    <div class="dicon is-ok">✓</div>
    <h1>${now ? `${esc(first)} is approved` : `${esc(first)} is already active`}</h1>
    <ul class="dsum"><li><span>Their link</span><b>yachtique.co/?p=${esc(p.code)}</b></li><li><span>Commission</span><b>10% of the charter</b></li></ul>
    <p class="dnote">${now ? (emailed ? `${esc(first)} has been emailed the link and the terms.` : `No email was sent (check their address in the Partners tab).`) + " " : ""}Welcome them on WhatsApp too:</p>
    ${wa ? `<a class="btn btn--wa btn--block" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>Welcome ${esc(first)} on WhatsApp</a>` : ""}`;
}
