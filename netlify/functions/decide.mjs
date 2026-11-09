// GET/POST /api/decide  ·  Accept or Decline an inquiry from the new-enquiry email.
//
//   GET  ?ref=YQ-1042&a=accept|decline&t=CODE  -> shows the inquiry and ONE confirm button.
//        Opening never changes anything: mail apps and link scanners open every link on their own.
//        Accept also shows the charter price (prefilled from the website rates, editable) and the gratuity
//        (18%, or none when the yacht includes it); Florida sales tax is added and the client's email gets
//        a Pay button for the total.
//   POST ref, a, t, price, gratuity            -> sets the Status in the Google Sheet and emails the client
//        (in their language), through the Apps Script web app.
//
//   a=zelle                                     -> the client paid by Zelle: one confirm button marks the row Paid
//        and sends the same emails as a card payment (price and gratuity asked first if there isn't a total yet).
//   a=extok | a=extno                           -> the client asked for more time on board (extend.mjs) and Stripe holds the
//        amount: Confirm charges the hold, Not possible releases it. The Sheet emails the client either way.
//
// t is an HMAC of the ref with SHEETS_SECRET (the Apps Script builds the same code for the email buttons).
import { esc, priceFor } from "../lib/site.mjs";
import { RX_REF, tokenOk, sheet, first, usd, cardPage as page, stripe } from "../lib/card.mjs";

const GRATUITY = 18;                         // % preselected on the Accept page
const GRATUITY_OPTIONS = [0, 15, 18, 20];

export default async (req) => {
  if (!Netlify.env.get("SHEETS_WEBHOOK_URL") || !Netlify.env.get("SHEETS_SECRET")) {
    return page("Not available", `<h1>Not available</h1><p>The inquiries sheet is not connected.</p>`, 503);
  }
  const secret = Netlify.env.get("SHEETS_SECRET");

  let ref, a, t, price = "", gratuity = "", discount = "";
  if (req.method === "POST") {
    const f = await req.formData();
    ref = String(f.get("ref") || ""); a = String(f.get("a") || ""); t = String(f.get("t") || "");
    price = String(f.get("price") || ""); gratuity = String(f.get("gratuity") || ""); discount = String(f.get("discount") || "");
  } else {
    const q = new URL(req.url).searchParams;
    ref = String(q.get("ref") || ""); a = String(q.get("a") || ""); t = String(q.get("t") || "");
  }
  if (!RX_REF.test(ref) || !["accept", "decline", "zelle", "extok", "extno", "edit"].includes(a) || !tokenOk(ref, t, secret)) {
    return page("Link not valid", `<h1>This link is not valid</h1><p>Open the inquiry from the email again, or change its Status in the Enquiries sheet.</p>`, 403);
  }

  if (req.method !== "POST") {
    const r = await sheet({ type: "lookup", ref }).catch(() => null);
    if (!r || !r.ok) return page("Not found", `<h1>We couldn't find ${esc(ref)}</h1><p>Check the Enquiries sheet: the row may have been moved or deleted.</p>`, 404);
    const q = r.enquiry;
    if (a === "zelle") return zellePage(q, t, Number(r.taxRate) || 0, r.taxGratuity, await sitePrice(req, q), Number(r.serviceFee) || 0);
    if (a === "extok" || a === "extno") return extensionPage(q, a, t);
    // Edit price or discount: an accepted quote the client hasn't paid yet
    const edit = a === "edit";
    if (edit && !(/^accepted$/i.test(q.status) && q.total > 0)) return page(q.status, decided(q, true, false, t));
    // Accepted earlier without a price: Accept again to send the payment link
    const addPrice = a === "accept" && /^accepted$/i.test(q.status) && !q.total;
    if (!edit && !addPrice && /^(accepted|declined|paid)$/i.test(q.status)) return page(q.status, decided(q, true, false, t));
    const accept = a === "accept" || edit;
    const rate = Number(r.taxRate) || 0, fee = Number(r.serviceFee) || 0;
    const site = accept ? await sitePrice(req, q) : { price: 0 };
    // Sent from a proposal with a discount (the form message names it): the Accept page starts with that discount
    const prop = accept && !edit ? await proposalOff(q) : null;
    // Editing: the price before the discount, and the discount, as they are now
    const suggested = edit ? Math.round(((q.price || 0) + (q.discount || 0)) * 100) / 100 : site.price;
    const chose = String(q.gratuityChoice || "");
    const picked = edit ? Math.round((q.gratuity || 0) / (q.price || 1) * 100) : parseInt(chose, 10);
    // The client's pick on the form wins, otherwise the default (editing: the gratuity on the quote)
    const tip = GRATUITY_OPTIONS.includes(picked) ? picked : edit ? GRATUITY_OPTIONS.reduce((b, o) => Math.abs(o - picked) < Math.abs(b - picked) ? o : b) : GRATUITY;
    return page(accept ? "Accept inquiry" : "Decline inquiry", `
      <p class="eyebrow">${esc(ref)} · ${edit ? "Edit the quote" : addPrice ? "Payment link" : accept ? "Accept" : "Decline"}</p>
      <h1>${edit ? `Change ${esc(first(q) || "the client")}'s price?` : addPrice ? `Send ${esc(first(q) || "the client")} the payment link?` : `${a === "accept" ? "Accept" : "Decline"} ${esc(q.name || "this inquiry")}?`}</h1>
      ${summary(q)}
      <form method="POST" action="/api/decide" class="form dform">
        <input type="hidden" name="ref" value="${esc(ref)}"><input type="hidden" name="a" value="${a}"><input type="hidden" name="t" value="${esc(t)}">
        ${accept ? `
        <label>Charter price before tax
          <input type="text" name="price" inputmode="decimal" autocomplete="off" placeholder="e.g. 2,690" value="${suggested || ""}" data-rate="${rate}" data-fee="${fee}">
        </label>
        <p class="dhint">${edit ? "The price before any discount. " : suggested ? `Website price for ${esc(q.duration)}${site.at ? ` from ${esc(site.at)}` : ""}. ` : ""}Include anything extra you agreed (catering, transport).${addPrice || edit ? "" : " Leave it empty to send the quote yourself."}</p>
        <label>Discount <em class="dchose">· optional</em>
          <input type="text" name="discount" inputmode="decimal" autocomplete="off" placeholder="e.g. 10% or 300" value="${edit && q.discount ? q.discount : prop ? esc(prop.discount) : ""}">
        </label>
        <p class="dhint">${prop ? `From proposal <a href="/p/${esc(prop.id)}" target="_blank" rel="noopener">${esc(prop.id)}</a>. ` : ""}A percentage or dollars off the charter. The client sees it as its own line, with the price before it.</p>
        <label>Gratuity${chose ? ` <em class="dchose">· client chose ${esc(/included/i.test(chose) ? "included" : chose)}</em>` : ""}
          <select name="gratuity" data-taxed="${r.taxGratuity === false ? 0 : 1}">${GRATUITY_OPTIONS.map((p) => `<option value="${p}"${p === tip ? " selected" : ""}>${p ? `${p}%` : "None"}</option>`).join("")}</select>
        </label>
        <ul class="dsum" hidden>
          <li><span>Charter</span><b data-sum="price"></b></li>
          <li data-row="off" hidden><span data-sum="offlabel">Discount</span><b data-sum="off"></b></li>
          <li data-row="grat"><span data-sum="gratlabel">Gratuity</span><b data-sum="grat"></b></li>
          <li data-row="fee" hidden><span data-sum="feelabel">Service fee</span><b data-sum="fee"></b></li>
          <li><span>Florida sales tax (${+(rate * 100).toFixed(2)}%)</span><b data-sum="tax"></b></li>
          <li class="dsum__total"><span>Client pays</span><b data-sum="total"></b></li>
        </ul>
        ${site.cost ? `<ul class="dsum dsum--you" data-cost="${site.cost}" hidden>
          <li class="dsum__head"><span>For you only</span></li>
          <li><span>YCN charges you<small>Broker price for ${esc(q.duration)}${site.at ? ` from ${esc(site.at)}` : ""}</small></span><b>${usd(site.cost)}</b></li>
          <li><span>Your margin<small>Charter price minus YCN's price</small></span><b data-sum="margin"></b></li>
          <li><span>Gratuity<small>Passed to YCN for the crew</small></span><b data-sum="grat2"></b></li>
          <li data-row="fee2" hidden><span>Service fee<small>Covers Stripe's card fees (about 2.9% + 30¢)</small></span><b data-sum="fee2"></b></li>
          <li><span>Florida sales tax<small>Collected for the state, you pay it on your tax return</small></span><b data-sum="tax2"></b></li>
        </ul>` : ""}` : ""}
        <p class="dnote">${edit
          ? `${esc(first(q) || "The client")} gets the updated quote by email${q.lang === "es" ? " in Spanish" : ""}, with the same payment link.`
          : accept
          ? `${esc(first(q) || "The client")} gets an email${q.lang === "es" ? " in Spanish" : ""} saying the day is available<span data-paynote hidden>, with a button to pay the total by card</span><span data-quotenote>, and that you'll send the final quote</span>.`
          : `${esc(first(q) || "The client")} gets an email${q.lang === "es" ? " in Spanish" : ""} saying it can't be confirmed, with a link to the yachts free that day.`}</p>
        <button type="submit" class="btn ${accept ? "btn--gold" : "btn--decline"} btn--block">${edit ? "Save and send the updated quote" : addPrice ? "Send payment link" : `Confirm ${accept ? "accept" : "decline"}`}</button>
      </form>
      ${addPrice || edit ? "" : `<p class="dswitch"><a href="?ref=${encodeURIComponent(ref)}&a=${accept ? "decline" : "accept"}&t=${encodeURIComponent(t)}">${accept ? "Decline instead" : "Accept instead"}</a></p>`}
      ${accept ? priceScript() : ""}`);
  }

  if (a === "extok" || a === "extno") {
    const r = await sheet({ type: "lookup", ref }).catch(() => null);
    const q = r && r.ok && r.enquiry;
    if (!q) return page("Not found", `<h1>We couldn't find ${esc(ref)}</h1>`, 404);
    const last = lastExtension(q);
    if (!last.held) return extensionPage(q, a, t);
    const key = Netlify.env.get("STRIPE_SECRET_KEY");
    const ok = a === "extok";
    // Charge or let go of the hold first; the Sheet only changes when Stripe did it
    const pi = key ? await stripe(key, "POST", `payment_intents/${encodeURIComponent(q.extPayment)}/${ok ? "capture" : "cancel"}`).catch((e) => ({ error: e.message })) : { error: "Stripe is not connected" };
    if (!pi || pi.error || pi.status !== (ok ? "succeeded" : "canceled")) {
      return page("Not done", `<h1>That didn't go through</h1><p class="dnote">Stripe said: ${esc((pi && pi.error) || (pi && pi.status) || "no answer")}. Nothing changed in the sheet and no email was sent. Check the payment in Stripe.</p>`, 502);
    }
    const x = await sheet({ type: "extension", ref, state: ok ? "confirmed" : "released", payment: q.extPayment }).catch(() => null);
    return page(ok ? "Confirmed" : "Released", `
      <p class="eyebrow">${esc(ref)} · More time</p>
      <div class="dicon ${ok ? "is-ok" : "is-no"}">${ok ? "✓" : "✕"}</div>
      <h1>${ok ? `${esc(last.what)} confirmed` : "Released"}</h1>
      <p class="dnote">${ok ? `${esc(first(q) || "The client")}'s card was charged ${esc(last.amount)}. Tell the captain.` : `The hold was released, nothing was charged.`}${x && x.ok ? ` ${esc(first(q) || "The client")} has been emailed.` : " The sheet didn't update: set the Extension cell by hand and message the client."}</p>`);
  }

  if (a === "zelle") {
    const z = await sheet({ type: "manualpaid", ref, method: "Zelle", price: price.replace(/[^0-9.]/g, ""), gratuity: gratuity.replace(/[^0-9.]/g, "") }).catch(() => null);
    if (!z || !z.ok) return page("Not saved", `<h1>That didn't go through</h1><p>Nothing was changed and no email was sent.${z && z.error === "no price" ? " Type the charter price first." : z && /^status/.test(z.error || "") ? ` The inquiry is ${esc(z.error.slice(7))}.` : " Try again, or set the Status in the Enquiries sheet."}</p>`, 502);
    return page("Paid", decided(z.enquiry, z.already, true, t));
  }

  const listPrice = Number(price.replace(/[^0-9.]/g, "")) || 0;
  const off = discountDollars(discount, listPrice);
  if (a === "edit") {
    if (!(listPrice > 0)) return page("Not saved", `<h1>Type the price first</h1><p class="dnote">Nothing was changed.</p>`, 400);
    const e = await sheet({ type: "reprice", ref, price: listPrice, gratuity: gratuity.replace(/[^0-9.]/g, ""), discount: off }).catch(() => null);
    if (!e || !e.ok) return page("Not saved", `<h1>That didn't go through</h1><p class="dnote">${e && /^status/.test(e.error || "") ? `The inquiry is ${esc(e.error.slice(7))}, so its price can't change.` : "Nothing was changed. Try again."}</p>`, 502);
    return page("Updated", decided(e.enquiry, false, e.emailed, t, true));
  }
  const r = await sheet({ type: "decide", ref, a, price: a === "accept" ? listPrice || "" : "", gratuity: a === "accept" ? gratuity.replace(/[^0-9.]/g, "") : "", discount: a === "accept" ? off : 0 }).catch(() => null);
  if (!r || !r.ok) return page("Not saved", `<h1>That didn't go through</h1><p>Nothing was sent. Try again, or set the Status in the Enquiries sheet.</p>`, 502);
  return page(r.enquiry.status, decided(r.enquiry, r.already, r.emailed, t));
};

export const config = { path: "/api/decide" };

// The website price for the yacht, duration and marina on the inquiry, and what YCN charges us for it
// (price 0 when there isn't one)
// The discount of the proposal named in the inquiry's message ("From my proposal: yachtique.co/p/catalin")
async function proposalOff(q) {
  const m = /\/p\/([a-z0-9-]+)/i.exec(String(q.message || ""));
  if (!m) return null;
  try {
    const url = `${Netlify.env.get("SHEETS_WEBHOOK_URL")}?action=proposal&id=${encodeURIComponent(m[1].toLowerCase())}&secret=${encodeURIComponent(Netlify.env.get("SHEETS_SECRET"))}`;
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) }).then((x) => x.json());
    const off = r && r.ok && r.proposal ? String(r.proposal.discount || "").trim() : "";
    return off && off !== "0" ? { id: m[1].toLowerCase(), discount: off } : null;
  } catch (e) {
    return null;
  }
}

async function sitePrice(req, q) {
  const p = await priceFor(req.url, q).catch(() => null);
  return p ? p : { price: 0, cost: 0, at: "" };
}

function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return iso || "Flexible";
  return new Date(Date.UTC(+m[1], m[2] - 1, +m[3])).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function summary(q) {
  const facts = [["Date", prettyDate(q.date)], ["Guests", q.guests || "—"], ["Duration", q.duration || "—"], ["Yacht", q.yacht || "Help me choose"]];
  if (q.departure) facts.push(["Departure", q.departure]);
  return `<ul class="yfacts dfacts">${facts.map(([k, v]) => `<li><b>${esc(v)}</b><span>${k}</span></li>`).join("")}</ul>
      <p class="dcontact">${[q.phone, q.email, q.lang === "es" ? "Spanish" : ""].filter(Boolean).map(esc).join(" · ")}</p>`;
}

// "10%" or "300" (dollars) off a price, as dollars
function discountDollars(input, price) {
  const s = String(input || "").trim();
  if (!s || !(price > 0)) return 0;
  const n = Number(s.replace(/[^0-9.]/g, "")) || 0;
  const off = /%/.test(s) ? price * n / 100 : n;
  return Math.min(Math.max(Math.round(off * 100) / 100, 0), price);
}

function decided(q, already, emailed, t, updated) {
  const paid = /paid/i.test(q.status);
  const ok = paid || /accepted/i.test(q.status);
  const name = first(q) || "the client";
  const phone = String(q.phone || "").replace(/\D/g, "");
  const es = q.lang === "es";
  const msg = !ok
    ? (es ? `Hola ${first(q)}, soy Nektarios de Yachtique. Le propongo otras opciones para su fecha.` : `Hi ${first(q)}, this is Nektarios from Yachtique. Let me suggest some other options for your date.`)
    : q.payUrl
      ? (es ? `Hola ${first(q)}, soy Nektarios de Yachtique. Su día está disponible. El total es ${usd(q.total)} con impuestos incluidos. Puede pagar aquí de forma segura: ${q.payUrl}` : `Hi ${first(q)}, this is Nektarios from Yachtique. Your day is available. The total is ${usd(q.total)} including tax. You can pay securely here: ${q.payUrl}`)
      : (es ? `Hola ${first(q)}, soy Nektarios de Yachtique. Su día está disponible. Le envío ahora la cotización final.` : `Hi ${first(q)}, this is Nektarios from Yachtique. Your day is available. Sending you the final quote now.`);
  const money = q.total
    ? `<ul class="dsum"><li><span>Charter</span><b>${usd((q.price || 0) + (q.discount || 0))}</b></li>${q.discount ? `<li><span>Discount</span><b>&minus;${usd(q.discount)}</b></li>` : ""}${q.gratuity ? `<li><span>Gratuity</span><b>${usd(q.gratuity)}</b></li>` : ""}${q.fee ? `<li><span>Service fee</span><b>${usd(q.fee)}</b></li>` : ""}<li><span>Sales tax</span><b>${usd(q.total - q.price - (q.gratuity || 0) - (q.fee || 0))}</b></li><li class="dsum__total"><span>${paid ? "Paid" : "Client pays"}</span><b>${usd(q.total)}</b></li></ul>`
    : "";
  return `
      <p class="eyebrow">${esc(q.ref)}</p>
      <div class="dicon ${ok ? "is-ok" : "is-no"}">${ok ? "✓" : "✕"}</div>
      <h1>${updated ? "Quote updated" : already && !paid ? `Already ${esc(q.status.toLowerCase())}` : esc(q.status)}</h1>
      ${summary(q)}
      ${money}
      <p class="dnote">${paid
        ? `${esc(name)} paid ${usd(q.total)}${/^zelle$/i.test(q.payment || "") ? " by Zelle" : ""}. Next: reserve the yacht with YCN.`
        : already
          ? "Nothing changed and no email was sent again."
          : updated ? `${esc(name)} ${emailed ? "has been emailed the updated quote" : "has no valid email: send the new total on WhatsApp"}. The payment link stays the same and now asks for ${usd(q.total)}.`
          : emailed ? `${esc(name)} has been emailed${es ? " in Spanish" : ""}${q.payUrl ? " with the payment link" : ""}. The Status in the sheet is now ${esc(q.status)}.`
            : `The Status in the sheet is now ${esc(q.status)}. No email was sent (no valid email address on the inquiry).`}</p>
      ${phone && !paid ? `<a class="btn btn--wa btn--block" href="https://wa.me/${phone}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>Message ${esc(name)} on WhatsApp</a>` : ""}
      ${q.payUrl && !paid ? `<p class="dswitch"><a href="${esc(q.payUrl)}" target="_blank" rel="noopener">Open the client's payment page</a></p>` : ""}
      ${ok && !paid && t && q.total ? `<p class="dswitch"><a href="/api/decide?ref=${encodeURIComponent(q.ref)}&a=edit&t=${encodeURIComponent(t)}">Edit price or discount</a></p>` : ""}
      ${ok && !paid && t ? `<p class="dswitch"><a href="${zelleUrl(q.ref, t)}">Paid by Zelle? Mark it paid</a></p>` : ""}`;
}

// The newest request in the Extension cell: "+1 hour · $380.60 · Held"
function lastExtension(q) {
  const [what = "", amount = "", state = ""] = String(q.extension || "").split(" | ").pop().split(" · ");
  return { what, amount, state, held: state === "Held" && /^pi_/.test(String(q.extPayment || "")) };
}

// Confirm or Not possible for more time on board: what is held, and one button
function extensionPage(q, a, t) {
  const last = lastExtension(q);
  if (!last.held) {
    return page("Nothing waiting", `<p class="eyebrow">${esc(q.ref)} · More time</p><h1>Nothing waiting</h1><p class="dnote">${last.state ? `The last request (${esc(last.what)}, ${esc(last.amount)}) is already ${esc(last.state.toLowerCase())}.` : "This charter has no request for more time."}</p>`);
  }
  const ok = a === "extok";
  return page(ok ? "Confirm more time" : "Release the hold", `
      <p class="eyebrow">${esc(q.ref)} · More time</p>
      <h1>${ok ? `Confirm ${esc(last.what)} for ${esc(first(q) || "the client")}?` : `Not possible for ${esc(first(q) || "the client")}?`}</h1>
      ${summary(q)}
      <ul class="dsum"><li><span>Extra time</span><b>${esc(last.what)}</b></li><li class="dsum__total"><span>Held on the card</span><b>${esc(last.amount)}</b></li></ul>
      <form method="POST" action="/api/decide" class="form dform">
        <input type="hidden" name="ref" value="${esc(q.ref)}"><input type="hidden" name="a" value="${a}"><input type="hidden" name="t" value="${esc(t)}">
        <p class="dnote">${ok ? "Only after the captain or YCN said yes. The card is charged now and the client gets a confirmation." : "The hold is released, nothing is charged, and the client is told the yacht isn't free."}</p>
        <button type="submit" class="btn ${ok ? "btn--gold" : "btn--decline"} btn--block">${ok ? `Confirm and charge ${esc(last.amount)}` : "Release the hold"}</button>
      </form>
      <p class="dswitch"><a href="/api/decide?ref=${encodeURIComponent(q.ref)}&a=${ok ? "extno" : "extok"}&t=${encodeURIComponent(t)}">${ok ? "Not possible instead" : "Confirm instead"}</a></p>`);
}

function zelleUrl(ref, t) { return `/api/decide?ref=${encodeURIComponent(ref)}&a=zelle&t=${encodeURIComponent(t)}`; }

// Mark paid by Zelle: shows what the client should have sent, and one confirm button
function zellePage(q, t, rate, taxGratuity, site, fee) {
  if (/^paid$/i.test(q.status)) return page(q.status, decided(q, true, false, t));
  if (/^(declined|lost)$/i.test(q.status)) return page(q.status, `<h1>${esc(q.ref)} is ${esc(q.status.toLowerCase())}</h1><p class="dnote">Set the Status back to Accepted in the sheet first if the client is booking after all.</p>`);
  const hasTotal = q.total > 0;
  const chose = parseInt(String(q.gratuityChoice || ""), 10);
  const tip = GRATUITY_OPTIONS.includes(chose) ? chose : GRATUITY;
  return page("Paid by Zelle", `
      <p class="eyebrow">${esc(q.ref)} · Zelle</p>
      <h1>Did ${esc(first(q) || "the client")} pay by Zelle?</h1>
      ${summary(q)}
      <form method="POST" action="/api/decide" class="form dform">
        <input type="hidden" name="ref" value="${esc(q.ref)}"><input type="hidden" name="a" value="zelle"><input type="hidden" name="t" value="${esc(t)}">
        ${hasTotal
          ? `<ul class="dsum"><li><span>Charter</span><b>${usd((q.price || 0) + (q.discount || 0))}</b></li>${q.discount ? `<li><span>Discount</span><b>&minus;${usd(q.discount)}</b></li>` : ""}${q.gratuity ? `<li><span>Gratuity</span><b>${usd(q.gratuity)}</b></li>` : ""}${q.fee ? `<li><span>Service fee</span><b>${usd(q.fee)}</b></li>` : ""}<li><span>Sales tax</span><b>${usd(q.total - q.price - (q.gratuity || 0) - (q.fee || 0))}</b></li><li class="dsum__total"><span>Should have arrived</span><b>${usd(q.total)}</b></li></ul>`
          : `<label>Charter price before tax
          <input type="text" name="price" inputmode="decimal" autocomplete="off" placeholder="e.g. 2,690" value="${site.price || ""}" data-rate="${rate}" data-fee="${fee}" required>
        </label>
        <label>Gratuity
          <select name="gratuity" data-taxed="${taxGratuity === false ? 0 : 1}">${GRATUITY_OPTIONS.map((p) => `<option value="${p}"${p === tip ? " selected" : ""}>${p ? `${p}%` : "None"}</option>`).join("")}</select>
        </label>
        <ul class="dsum" hidden>
          <li><span>Charter</span><b data-sum="price"></b></li>
          <li data-row="grat"><span data-sum="gratlabel">Gratuity</span><b data-sum="grat"></b></li>
          <li data-row="fee" hidden><span data-sum="feelabel">Service fee</span><b data-sum="fee"></b></li>
          <li><span>Florida sales tax (${+(rate * 100).toFixed(2)}%)</span><b data-sum="tax"></b></li>
          <li class="dsum__total"><span>Should have arrived</span><b data-sum="total"></b></li>
        </ul>`}
        <p class="dnote">Check your Yachtique bank account first: the full amount, with ${esc(q.ref)} in the memo. Confirming sets the sheet to <b>Paid</b> (Payment: Zelle) and emails ${esc(first(q) || "the client")} the payment confirmation with the calendar file, like a card payment. Florida sales tax is due the same as for a card.</p>
        <button type="submit" class="btn btn--gold btn--block">Confirm Zelle payment received</button>
      </form>
      ${hasTotal ? "" : priceScript()}`);
}

// The live summary under the price box (Accept and Zelle pages): charter, gratuity, service fee, tax and total as Nektarios types
function priceScript() {
  return `<script>
        (function () {
          var input = document.querySelector('[name="price"]'), tipSel = document.querySelector('[name="gratuity"]'), sum = document.querySelector(".dsum");
          var offIn = document.querySelector('[name="discount"]');
          var rate = +input.getAttribute("data-rate") || 0, feeRate = +input.getAttribute("data-fee") || 0, taxTip = tipSel.getAttribute("data-taxed") === "1";
          function fmt(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
          function update() {
            var list = Math.round(parseFloat(input.value.replace(/[^0-9.]/g, "")) * 100) / 100;
            // Discount: "10%" or dollars, never more than the price (the same rule as the server)
            var raw = offIn ? offIn.value.trim() : "", n = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
            var off = list > 0 && raw ? Math.min(Math.max(Math.round((/%/.test(raw) ? list * n / 100 : n) * 100) / 100, 0), list) : 0;
            var p = Math.round((list - off) * 100) / 100;
            var ok = p > 0;
            sum.hidden = !ok;
            var y0 = document.querySelector(".dsum--you"); if (y0 && !ok) y0.hidden = true;
            var pn = document.querySelector("[data-paynote]"), qn = document.querySelector("[data-quotenote]");
            if (pn) pn.hidden = !ok;
            if (qn) qn.hidden = ok;
            if (!ok) return;
            var pct = +tipSel.value || 0, g = Math.round(p * pct) / 100;
            // The same math as quoteTotals in Code.gs
            var fee = Math.round((p + g) * feeRate * 100) / 100;
            var tax = Math.round(((taxTip ? p + g : p) + fee) * rate * 100) / 100;
            var total = Math.round((p + g + fee + tax) * 100) / 100;
            var feeRow = sum.querySelector('[data-row="fee"]');
            feeRow.hidden = !fee;
            sum.querySelector('[data-sum="feelabel"]').textContent = "Service fee (" + +(feeRate * 100).toFixed(2) + "%)";
            sum.querySelector('[data-sum="fee"]').textContent = fmt(fee);
            sum.querySelector('[data-row="grat"]').hidden = !g;
            sum.querySelector('[data-sum="gratlabel"]').textContent = "Gratuity (" + pct + "%)";
            sum.querySelector('[data-sum="price"]').textContent = fmt(list);
            var offRow = sum.querySelector('[data-row="off"]');
            if (offRow) {
              offRow.hidden = !off;
              sum.querySelector('[data-sum="offlabel"]').textContent = "Discount (" + Math.round(off / list * 100) + "%)";
              sum.querySelector('[data-sum="off"]').textContent = "\u2212" + fmt(off);
            }
            sum.querySelector('[data-sum="grat"]').textContent = fmt(g);
            sum.querySelector('[data-sum="tax"]').textContent = fmt(tax);
            sum.querySelector('[data-sum="total"]').textContent = fmt(total);
            // For you only: YCN's price and the margin left after it
            var you = document.querySelector(".dsum--you");
            if (you) {
              var c = +you.getAttribute("data-cost") || 0;
              you.hidden = false;
              you.querySelector('[data-sum="margin"]').textContent = fmt(Math.round((p - c) * 100) / 100) + (p ? " (" + Math.round((p - c) / p * 100) + "%)" : "");
              you.querySelector('[data-sum="grat2"]').textContent = fmt(g);
              you.querySelector('[data-row="fee2"]').hidden = !fee;
              you.querySelector('[data-sum="fee2"]').textContent = fmt(fee);
              you.querySelector('[data-sum="tax2"]').textContent = fmt(tax);
            }
          }
          input.addEventListener("input", update); tipSel.addEventListener("change", update);
          if (offIn) offIn.addEventListener("input", update);
          update();
        })();
      </script>`;
}
