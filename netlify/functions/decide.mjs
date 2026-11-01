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
//
// t is an HMAC of the ref with SHEETS_SECRET (the Apps Script builds the same code for the email buttons).
import { esc, loadFleet } from "../lib/site.mjs";
import { RX_REF, tokenOk, sheet, first, usd, cardPage as page } from "../lib/card.mjs";

const GRATUITY = 18;                         // % preselected on the Accept page
const GRATUITY_OPTIONS = [0, 15, 18, 20];

export default async (req) => {
  if (!Netlify.env.get("SHEETS_WEBHOOK_URL") || !Netlify.env.get("SHEETS_SECRET")) {
    return page("Not available", `<h1>Not available</h1><p>The inquiries sheet is not connected.</p>`, 503);
  }
  const secret = Netlify.env.get("SHEETS_SECRET");

  let ref, a, t, price = "", gratuity = "";
  if (req.method === "POST") {
    const f = await req.formData();
    ref = String(f.get("ref") || ""); a = String(f.get("a") || ""); t = String(f.get("t") || "");
    price = String(f.get("price") || ""); gratuity = String(f.get("gratuity") || "");
  } else {
    const q = new URL(req.url).searchParams;
    ref = String(q.get("ref") || ""); a = String(q.get("a") || ""); t = String(q.get("t") || "");
  }
  if (!RX_REF.test(ref) || !["accept", "decline", "zelle"].includes(a) || !tokenOk(ref, t, secret)) {
    return page("Link not valid", `<h1>This link is not valid</h1><p>Open the inquiry from the email again, or change its Status in the Enquiries sheet.</p>`, 403);
  }

  if (req.method !== "POST") {
    const r = await sheet({ type: "lookup", ref }).catch(() => null);
    if (!r || !r.ok) return page("Not found", `<h1>We couldn't find ${esc(ref)}</h1><p>Check the Enquiries sheet: the row may have been moved or deleted.</p>`, 404);
    const q = r.enquiry;
    if (a === "zelle") return zellePage(q, t, Number(r.taxRate) || 0, r.taxGratuity, await sitePrice(req, q));
    // Accepted earlier without a price: Accept again to send the payment link
    const addPrice = a === "accept" && /^accepted$/i.test(q.status) && !q.total;
    if (!addPrice && /^(accepted|declined|paid)$/i.test(q.status)) return page(q.status, decided(q, true, false, t));
    const accept = a === "accept";
    const rate = Number(r.taxRate) || 0;
    const site = accept ? await sitePrice(req, q) : { price: 0 };
    const suggested = site.price;
    // The client's pick on the form wins, otherwise the default
    const chose = String(q.gratuityChoice || "");
    const picked = parseInt(chose, 10);
    const tip = GRATUITY_OPTIONS.includes(picked) ? picked : GRATUITY;
    return page(accept ? "Accept inquiry" : "Decline inquiry", `
      <p class="eyebrow">${esc(ref)} · ${addPrice ? "Payment link" : accept ? "Accept" : "Decline"}</p>
      <h1>${addPrice ? `Send ${esc(first(q) || "the client")} the payment link?` : `${accept ? "Accept" : "Decline"} ${esc(q.name || "this inquiry")}?`}</h1>
      ${summary(q)}
      <form method="POST" action="/api/decide" class="form dform">
        <input type="hidden" name="ref" value="${esc(ref)}"><input type="hidden" name="a" value="${a}"><input type="hidden" name="t" value="${esc(t)}">
        ${accept ? `
        <label>Charter price before tax
          <input type="text" name="price" inputmode="decimal" autocomplete="off" placeholder="e.g. 2,690" value="${suggested || ""}" data-rate="${rate}">
        </label>
        <p class="dhint">${suggested ? `Website price for ${esc(q.duration)}${site.at ? ` from ${esc(site.at)}` : ""}. ` : ""}Include anything extra you agreed (catering, transport).${addPrice ? "" : " Leave it empty to send the quote yourself."}</p>
        <label>Gratuity${chose ? ` <em class="dchose">· client chose ${esc(/included/i.test(chose) ? "included" : chose)}</em>` : ""}
          <select name="gratuity" data-taxed="${r.taxGratuity === false ? 0 : 1}">${GRATUITY_OPTIONS.map((p) => `<option value="${p}"${p === tip ? " selected" : ""}>${p ? `${p}%` : "None"}</option>`).join("")}</select>
        </label>
        <ul class="dsum" hidden>
          <li><span>Charter</span><b data-sum="price"></b></li>
          <li data-row="grat"><span data-sum="gratlabel">Gratuity</span><b data-sum="grat"></b></li>
          <li><span>Florida sales tax (${+(rate * 100).toFixed(2)}%)</span><b data-sum="tax"></b></li>
          <li class="dsum__total"><span>Client pays</span><b data-sum="total"></b></li>
        </ul>` : ""}
        <p class="dnote">${accept
          ? `${esc(first(q) || "The client")} gets an email${q.lang === "es" ? " in Spanish" : ""} saying the day is available<span data-paynote hidden>, with a button to pay the total by card</span><span data-quotenote>, and that you'll send the final quote</span>.`
          : `${esc(first(q) || "The client")} gets an email${q.lang === "es" ? " in Spanish" : ""} saying it can't be confirmed, with a link to the yachts free that day.`}</p>
        <button type="submit" class="btn ${accept ? "btn--gold" : "btn--decline"} btn--block">${addPrice ? "Send payment link" : `Confirm ${accept ? "accept" : "decline"}`}</button>
      </form>
      ${addPrice ? "" : `<p class="dswitch"><a href="?ref=${encodeURIComponent(ref)}&a=${accept ? "decline" : "accept"}&t=${encodeURIComponent(t)}">${accept ? "Decline instead" : "Accept instead"}</a></p>`}
      ${accept ? priceScript() : ""}`);
  }

  if (a === "zelle") {
    const z = await sheet({ type: "manualpaid", ref, method: "Zelle", price: price.replace(/[^0-9.]/g, ""), gratuity: gratuity.replace(/[^0-9.]/g, "") }).catch(() => null);
    if (!z || !z.ok) return page("Not saved", `<h1>That didn't go through</h1><p>Nothing was changed and no email was sent.${z && z.error === "no price" ? " Type the charter price first." : z && /^status/.test(z.error || "") ? ` The inquiry is ${esc(z.error.slice(7))}.` : " Try again, or set the Status in the Enquiries sheet."}</p>`, 502);
    return page("Paid", decided(z.enquiry, z.already, true, t));
  }

  const r = await sheet({ type: "decide", ref, a, price: a === "accept" ? price.replace(/[^0-9.]/g, "") : "", gratuity: a === "accept" ? gratuity.replace(/[^0-9.]/g, "") : "" }).catch(() => null);
  if (!r || !r.ok) return page("Not saved", `<h1>That didn't go through</h1><p>Nothing was sent. Try again, or set the Status in the Enquiries sheet.</p>`, 502);
  return page(r.enquiry.status, decided(r.enquiry, r.already, r.emailed, t));
};

export const config = { path: "/api/decide" };

// The website price for the yacht and duration on the inquiry (0 when there isn't one)
async function sitePrice(req, q) {
  const name = String(q.yacht || "").replace(/\s*\(.*$/, "").trim().toLowerCase();
  if (!name || /help me choose/.test(name)) return { price: 0 };
  const fleet = await loadFleet(req).catch(() => null);
  const y = (fleet || []).find((x) => String(x.name).trim().toLowerCase() === name);
  const dur = String(q.duration || "").trim().toLowerCase();
  const d = y && y.durations.find((x) => x.label.toLowerCase() === dur);
  // The client's marina, when they picked one and it has its own price
  const at = y && (y.departures || []).find((p) => p.name === q.departure);
  const key = at && Object.keys(at.prices).find((k) => k.toLowerCase() === dur);
  return { price: key ? at.prices[key] : d ? d.price : 0, at: key ? at.name : "" };
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

function decided(q, already, emailed, t) {
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
    ? `<ul class="dsum"><li><span>Charter</span><b>${usd(q.price)}</b></li>${q.gratuity ? `<li><span>Gratuity</span><b>${usd(q.gratuity)}</b></li>` : ""}<li><span>Sales tax</span><b>${usd(q.total - q.price - (q.gratuity || 0))}</b></li><li class="dsum__total"><span>${paid ? "Paid" : "Client pays"}</span><b>${usd(q.total)}</b></li></ul>`
    : "";
  return `
      <p class="eyebrow">${esc(q.ref)}</p>
      <div class="dicon ${ok ? "is-ok" : "is-no"}">${ok ? "✓" : "✕"}</div>
      <h1>${already && !paid ? `Already ${esc(q.status.toLowerCase())}` : esc(q.status)}</h1>
      ${summary(q)}
      ${money}
      <p class="dnote">${paid
        ? `${esc(name)} paid ${usd(q.total)}${/^zelle$/i.test(q.payment || "") ? " by Zelle" : ""}. Next: reserve the yacht with YCN.`
        : already
          ? "Nothing changed and no email was sent again."
          : emailed ? `${esc(name)} has been emailed${es ? " in Spanish" : ""}${q.payUrl ? " with the payment link" : ""}. The Status in the sheet is now ${esc(q.status)}.`
            : `The Status in the sheet is now ${esc(q.status)}. No email was sent (no valid email address on the inquiry).`}</p>
      ${phone && !paid ? `<a class="btn btn--wa btn--block" href="https://wa.me/${phone}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>Message ${esc(name)} on WhatsApp</a>` : ""}
      ${q.payUrl && !paid ? `<p class="dswitch"><a href="${esc(q.payUrl)}" target="_blank" rel="noopener">Open the client's payment page</a></p>` : ""}
      ${ok && !paid && t ? `<p class="dswitch"><a href="${zelleUrl(q.ref, t)}">Paid by Zelle? Mark it paid</a></p>` : ""}`;
}

function zelleUrl(ref, t) { return `/api/decide?ref=${encodeURIComponent(ref)}&a=zelle&t=${encodeURIComponent(t)}`; }

// Mark paid by Zelle: shows what the client should have sent, and one confirm button
function zellePage(q, t, rate, taxGratuity, site) {
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
          ? `<ul class="dsum"><li><span>Charter</span><b>${usd(q.price)}</b></li>${q.gratuity ? `<li><span>Gratuity</span><b>${usd(q.gratuity)}</b></li>` : ""}<li><span>Sales tax</span><b>${usd(q.total - q.price - (q.gratuity || 0))}</b></li><li class="dsum__total"><span>Should have arrived</span><b>${usd(q.total)}</b></li></ul>`
          : `<label>Charter price before tax
          <input type="text" name="price" inputmode="decimal" autocomplete="off" placeholder="e.g. 2,690" value="${site.price || ""}" data-rate="${rate}" required>
        </label>
        <label>Gratuity
          <select name="gratuity" data-taxed="${taxGratuity === false ? 0 : 1}">${GRATUITY_OPTIONS.map((p) => `<option value="${p}"${p === tip ? " selected" : ""}>${p ? `${p}%` : "None"}</option>`).join("")}</select>
        </label>
        <ul class="dsum" hidden>
          <li><span>Charter</span><b data-sum="price"></b></li>
          <li data-row="grat"><span data-sum="gratlabel">Gratuity</span><b data-sum="grat"></b></li>
          <li><span>Florida sales tax (${+(rate * 100).toFixed(2)}%)</span><b data-sum="tax"></b></li>
          <li class="dsum__total"><span>Should have arrived</span><b data-sum="total"></b></li>
        </ul>`}
        <p class="dnote">Check your Yachtique bank account first: the full amount, with ${esc(q.ref)} in the memo. Confirming sets the sheet to <b>Paid</b> (Payment: Zelle) and emails ${esc(first(q) || "the client")} the payment confirmation with the calendar file, like a card payment. Florida sales tax is due the same as for a card.</p>
        <button type="submit" class="btn btn--gold btn--block">Confirm Zelle payment received</button>
      </form>
      ${hasTotal ? "" : priceScript()}`);
}

// The live summary under the price box (Accept and Zelle pages): charter, gratuity, tax and total as Nektarios types
function priceScript() {
  return `<script>
        (function () {
          var input = document.querySelector('[name="price"]'), tipSel = document.querySelector('[name="gratuity"]'), sum = document.querySelector(".dsum");
          var rate = +input.getAttribute("data-rate") || 0, taxTip = tipSel.getAttribute("data-taxed") === "1";
          function fmt(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
          function update() {
            var p = Math.round(parseFloat(input.value.replace(/[^0-9.]/g, "")) * 100) / 100;
            var ok = p > 0;
            sum.hidden = !ok;
            var pn = document.querySelector("[data-paynote]"), qn = document.querySelector("[data-quotenote]");
            if (pn) pn.hidden = !ok;
            if (qn) qn.hidden = ok;
            if (!ok) return;
            var pct = +tipSel.value || 0, g = Math.round(p * pct) / 100;
            var total = Math.round((p + g + (taxTip ? p + g : p) * rate) * 100) / 100;
            sum.querySelector('[data-row="grat"]').hidden = !g;
            sum.querySelector('[data-sum="gratlabel"]').textContent = "Gratuity (" + pct + "%)";
            sum.querySelector('[data-sum="price"]').textContent = fmt(p);
            sum.querySelector('[data-sum="grat"]').textContent = fmt(g);
            sum.querySelector('[data-sum="tax"]').textContent = fmt(Math.round((total - p - g) * 100) / 100);
            sum.querySelector('[data-sum="total"]').textContent = fmt(total);
          }
          input.addEventListener("input", update); tipSel.addEventListener("change", update); update();
        })();
      </script>`;
}
