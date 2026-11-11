/**
 * Yachtique — Google Sheets backend (Apps Script bound to the "Yachtique" Google Sheet)
 *
 * This file is kept in GitHub (apps-script/Code.gs) and contains NO secrets.
 * The shared secret lives in Apps Script > Project Settings > Script Properties
 * as SHEETS_SECRET, and must match the SHEETS_SECRET environment variable in Netlify.
 *
 * After changing this file: push it to Apps Script (clasp push, or paste into the editor),
 * then Deploy > Manage deployments > edit > New version. Never "New deployment".
 */

const SECRET = PropertiesService.getScriptProperties().getProperty("SHEETS_SECRET");

const ENQUIRY_HEADERS = ["Received", "Status", "Name", "Phone / WhatsApp", "Email", "Charter date", "Guests", "Duration", "Yacht", "Also interested in", "Message", "Notes", "Source", "Language", "Ref", "Decided", "Price", "Total", "Paid", "Payment", "Gratuity", "Gratuity choice",
  "Departure", "Start time", "Emails sent", "Extension", "Extension payment", "Discount", "Service fee", "Extras price"];
// Inquiries columns (1-based), used by the Accept / Decline links and payments
const COL = { RECEIVED: 1, STATUS: 2, NAME: 3, PHONE: 4, EMAIL: 5, DATE: 6, GUESTS: 7, DURATION: 8, YACHT: 9, EXTRAS: 10, MESSAGE: 11, NOTES: 12, SOURCE: 13, LANG: 14, REF: 15, DECIDED: 16,
  PRICE: 17, TOTAL: 18, PAID: 19, PAYMENT: 20, GRATUITY: 21, TIP_CHOICE: 22,
  DEPARTURE: 23, START: 24, SENT: 25, EXT: 26, EXT_PAY: 27, DISCOUNT: 28, FEE: 29, XTRA: 30 };
const EVENT_HEADERS = ["Time", "Event", "Page", "Yacht", "Detail", "Language", "Source", "Device", "Site"];
const FLEET_HEADERS = ["Show on site", "Name", "Model", "Guests", "Length", "Cabins", "Description", "Photo", "Rate"];
const STATUSES = ["New", "Accepted", "Declined", "Paid", "Contacted", "Quoted", "Booked", "Lost"];

// Florida sales tax added to the charter price on the client's payment (Miami-Dade: 6% state + 1% county).
// Confirm the rate with the accountant, and change it here if the charter leaves from another county.
const TAX_RATE = 0.07;
// The gratuity (a % of the charter price, picked on the Accept page) is added before tax: in Florida a gratuity
// added to the bill is generally taxable. Confirm with the accountant; if it isn't, set this to false.
const TAX_GRATUITY = true;
// Service fee on every booking (covers card processing), a % of charter + gratuity, shown as its own line.
// Florida sales tax is charged on it too (to confirm with the accountant). 0 turns it off.
const SERVICE_FEE = 0.04;

// Extras the client added (DJ, decorations, security, transport...): Nektarios asks the vendor for a quote, types the
// price on the Accept page and it goes on the client's payment as its own line; Yachtique pays the vendor.
// Sales tax on them too (decorations and rentals are taxable in Florida; DJ, security and transport may not be).
// To confirm with the accountant; false = no tax on extras.
const TAX_EXTRAS = true;

// Fee, tax and total for a charter price (after any discount), its gratuity and the extras
function quoteTotals(price, grat, extras) {
  extras = Number(extras) || 0;
  const fee = cents((price + grat + extras) * SERVICE_FEE) / 100;
  const taxed = (TAX_GRATUITY ? price + grat : price) + (TAX_EXTRAS ? extras : 0) + fee;
  const tax = cents(taxed * TAX_RATE) / 100;
  return { fee: fee, tax: tax, total: cents(price + grat + extras + fee + tax) / 100 };
}

// The Extras price cell: "DJ: 800; Decorations: 450" -> [{ name, amount }]
function parseExtras(text) {
  return String(text || "").split(/[;\n]+/).map(function (part) {
    const m = part.trim().match(/^(.*?)[:\s]+\$?\s*([\d,]+(?:\.\d+)?)\s*$/);
    return m ? { name: m[1].trim(), amount: cents(Number(m[2].replace(/,/g, ""))) / 100 } : null;
  }).filter(function (x) { return x && x.name && x.amount > 0; });
}
function extrasText(items) { return items.map(function (x) { return x.name + ": " + x.amount; }).join("; "); }
function extrasSum(items) { return cents(items.reduce(function (t, x) { return t + x.amount; }, 0)) / 100; }

// Branded emails
const OWNER_EMAIL = "yachtiquemiami@gmail.com";   // where new-enquiry alerts go
const ALERT_CC = "tsirkoudis7@gmail.com";          // copy of every alert ("" = none)
const SEND_CLIENT_CONFIRMATION = true;              // false = don't email the client
const WHATSAPP = "13058124721";
const LOGO = "https://yachtique.co/assets/img/logo-stacked-notag.png";
const SITE = "https://yachtique.co";
// More time on board (extend.mjs): off, YCN doesn't allow extensions on broker bookings (Laurent, Nov 2026).
// true turns the charter-day "add more time" emails back on; set EXTENSIONS_ON in netlify/functions/extend.mjs too.
const EXTENSIONS_ON = false;
// Food on board: Yacht Bites' menu, ordered under Nektarios's partner link (dockside delivery, order by 4pm the day before)
const FOOD_URL = "https://yachtbites.co/order.html?k=TkVLVEFSSU9TLTQ2MR9OZWt0YXJpb3MgUGFwYXN0YXZyb3U.13n2l6#menu";

/** Run once: creates the Enquiries and Fleet tabs, formatting and sample yachts. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone("America/New_York");

  // Inquiries
  const enq = ss.getSheetByName("Enquiries") || ss.insertSheet("Enquiries", 0);
  enq.getRange(1, 1, 1, ENQUIRY_HEADERS.length).setValues([ENQUIRY_HEADERS]);
  {
    styleHeader(enq, ENQUIRY_HEADERS.length);
    enq.setColumnWidths(1, ENQUIRY_HEADERS.length, 150);
    enq.setColumnWidth(11, 320); enq.setColumnWidth(12, 240);
    enq.getRange("A2:A").setNumberFormat("mmm d, yyyy h:mm am/pm");
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
    enq.getRange("B2:B").setDataValidation(rule);
    const range = enq.getRange("B2:B");
    enq.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("New").setBackground("#F6E7C8").setRanges([range]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Quoted").setBackground("#DCE8F2").setRanges([range]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Booked").setBackground("#D6EBD9").setRanges([range]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Lost").setFontColor("#999999").setRanges([range]).build(),
    ]);
  }

  // Fleet
  const fleet = ss.getSheetByName("Fleet") || ss.insertSheet("Fleet", 1);
  if (fleet.getLastRow() === 0) {
    fleet.getRange(1, 1, 1, FLEET_HEADERS.length).setValues([FLEET_HEADERS]);
    styleHeader(fleet, FLEET_HEADERS.length);
    fleet.getRange(2, 1, 4, FLEET_HEADERS.length).setValues([
      [true, "Azimut 60", "60 ft Azimut Flybridge", 13, "60 ft", 3, "Flybridge lounge, swim platform and water toys. A favourite for sandbar days.", "azimut-60.jpg", ""],
      [true, "Sunseeker 75", "75 ft Sunseeker Yacht", 13, "75 ft", 4, "Jacuzzi on the flybridge, full crew and space to host a celebration in style.", "sunseeker-75.jpg", ""],
      [true, "Pershing 50", "50 ft Pershing Sport", 10, "50 ft", 2, "Fast, sleek and sporty. Made for Miami Beach runs and sunset cruises.", "pershing-50.jpg", ""],
      [true, "Princess 40", "40 ft Princess Motor Yacht", 8, "40 ft", 1, "Intimate and elegant, ideal for proposals, anniversaries and small groups.", "princess-40.jpg", ""],
    ]);
    fleet.getRange("A2:A").insertCheckboxes();
    fleet.setColumnWidths(2, 8, 160); fleet.setColumnWidth(7, 380);
  }

  const blank = ss.getSheetByName("Sheet1");
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(blank);
  SpreadsheetApp.getUi().alert("Yachtique sheet is ready. Next: Deploy > New deployment > Web app.");
}

function styleHeader(sheet, n) {
  sheet.getRange(1, 1, 1, n).setFontWeight("bold").setBackground("#071820").setFontColor("#E6D0A4");
  sheet.setFrozenRows(1);
}

/** Netlify sends each new inquiry here. */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!SECRET || body.secret !== SECRET) return json({ ok: false, error: "unauthorized" });
    if (body.type === "event") return json(saveEvent(body.event || {}));
    if (body.type === "lookup") return json(lookupEnquiry(String(body.ref || "")));
    if (body.type === "decide") return json(decideEnquiry(String(body.ref || ""), String(body.a || ""), Number(body.price) || 0, Number(body.gratuity) || 0, Number(body.discount) || 0, String(body.extras || "")));
    if (body.type === "reprice") return json(repriceEnquiry(String(body.ref || ""), Number(body.price) || 0, Number(body.gratuity) || 0, Number(body.discount) || 0, String(body.extras || "")));
    if (body.type === "gratuity") return json(setGratuity(String(body.ref || ""), Number(body.gratuity)));
    if (body.type === "manualpaid") return json(markPaidManual(String(body.ref || ""), String(body.method || ""), Number(body.price) || 0, Number(body.gratuity) || 0));
    if (body.type === "extension") return json(recordExtension(String(body.ref || ""), String(body.state || ""), Number(body.hours) || 0, Number(body.amount) || 0, String(body.payment || "")));
    if (body.type === "paid") return json(markPaid(String(body.ref || ""), Number(body.amount) || 0, String(body.payment || "")));
    if (body.type !== "enquiry") return json({ ok: false, error: "unknown type" });

    const q = body.enquiry || {};
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiries");
      addNewColumns(sheet);
      sheet.appendRow([
        new Date(), "New", safe(q.name), safe(q.phone), safe(q.email), safe(q.date),
        safe(q.guests), safe(q.duration), safe(q.yacht), safe(q.extras), safe(q.message), "",
        safe(q.source), q.lang === "es" ? "Spanish" : "English"
      ]);
      // A short reference for the enquiry: YQ-1002, YQ-1003... (row number + 1000)
      const row = sheet.getLastRow();
      q.ref = "YQ-" + (1000 + row);
      sheet.getRange(row, COL.REF).setValue(q.ref);
      // The gratuity the client picked on the form (15%, 18%, 20% or Included); the amount is set on Accept
      q.gratuityChoice = safe(q.gratuity);
      delete q.gratuity;
      // As text: Sheets would turn "20%" into the number 0.2
      if (q.gratuityChoice) sheet.getRange(row, COL.TIP_CHOICE).setNumberFormat("@").setValue(q.gratuityChoice);
      // The marina the client picked; Nektarios can replace it with the exact address for the day-before email
      q.departure = safe(q.departure);
      if (q.departure) sheet.getRange(row, COL.DEPARTURE).setValue(q.departure);
      // The start time they picked ("2:30 pm"), as text; the day-before email reads it from here
      q.start = startTime(safe(q.start));
      if (q.start) sheet.getRange(row, COL.START).setNumberFormat("@").setValue(niceTime(q.start, "en"));
    } finally {
      lock.releaseLock();
    }
    // Emails never block the sheet: a mail problem is logged, the inquiry is still saved
    try { sendOwnerAlert(q); } catch (err) { console.error("Owner alert failed: " + err); }
    if (SEND_CLIENT_CONFIRMATION) {
      try { sendClientConfirmation(q); } catch (err) { console.error("Client email failed: " + err); }
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* =================== Accept / Decline ===================
   The new-enquiry email has Accept and Decline buttons. They open yachtique.co/api/decide (netlify/functions/decide.mjs),
   which shows the inquiry with ONE confirm button: email scanners open links on their own, so opening never decides.
   The confirm calls this script; the Status becomes Accepted or Declined and the client gets the matching email,
   in their language. The link carries a code made from the ref and the shared secret, so it can't be guessed. */

function decideToken(ref) {
  const sig = Utilities.computeHmacSha256Signature(String(ref), SECRET);
  return sig.map((b) => ("0" + (b & 0xff).toString(16)).slice(-2)).join("").slice(0, 20);
}

function decideUrl(ref, a) {
  return SITE + "/api/decide?ref=" + encodeURIComponent(ref) + "&a=" + a + "&t=" + decideToken(ref);
}

// Older sheets lack the newer columns: add their headers (and the newer statuses) once
function addNewColumns(sheet) {
  if (sheet.getMaxColumns() < ENQUIRY_HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), ENQUIRY_HEADERS.length - sheet.getMaxColumns());
  if (sheet.getRange(1, ENQUIRY_HEADERS.length).getValue() === ENQUIRY_HEADERS[ENQUIRY_HEADERS.length - 1]) return;
  const hadPaid = sheet.getRange(1, COL.PAYMENT).getValue() === "Payment";
  sheet.getRange(1, COL.SOURCE, 1, ENQUIRY_HEADERS.length - COL.SOURCE + 1).setValues([ENQUIRY_HEADERS.slice(COL.SOURCE - 1)])
    .setFontWeight("bold").setBackground("#071820").setFontColor("#E6D0A4");
  sheet.getRange(2, COL.PRICE, sheet.getMaxRows() - 1, 2).setNumberFormat("$#,##0.00");
  sheet.getRange(2, COL.PAID, sheet.getMaxRows() - 1, 1).setNumberFormat("mmm d, yyyy h:mm am/pm");
  sheet.getRange(2, COL.GRATUITY, sheet.getMaxRows() - 1, 1).setNumberFormat("$#,##0.00");
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  sheet.getRange("B2:B").setDataValidation(rule);
  const range = sheet.getRange("B2:B");
  const rules = sheet.getConditionalFormatRules();
  if (!hadPaid) rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Paid").setBackground("#D6EBD9").setBold(true).setRanges([range]).build());
  sheet.setConditionalFormatRules(rules);
}

function payToken(ref) {
  const sig = Utilities.computeHmacSha256Signature("pay:" + String(ref), SECRET);
  return sig.map((b) => ("0" + (b & 0xff).toString(16)).slice(-2)).join("").slice(0, 20);
}

function payUrl(ref) {
  return SITE + "/pay/" + encodeURIComponent(ref) + "?t=" + payToken(ref);
}

// The client's "more time on board" page: its own code, so it can't be used to pay for or decide anything else
function extToken(ref) {
  const sig = Utilities.computeHmacSha256Signature("ext:" + String(ref), SECRET);
  return sig.map((b) => ("0" + (b & 0xff).toString(16)).slice(-2)).join("").slice(0, 20);
}

function extUrl(ref, lang) {
  return SITE + "/extend/" + encodeURIComponent(ref) + "?t=" + extToken(ref) + (lang === "es" ? "&lang=es" : "");
}

function cents(n) { return Math.round(Number(n || 0) * 100); }

function usd(n) {
  const c = cents(n);
  return "$" + String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + ("0" + (c % 100)).slice(-2);
}

function findEnquiry(ref) {
  if (!/^YQ-\d+$/.test(ref)) return null;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiries");
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const refs = sheet.getRange(2, COL.REF, last - 1, 1).getValues();
  for (let i = refs.length - 1; i >= 0; i--) {
    if (String(refs[i][0]).trim() === ref) {
      const row = i + 2;
      const v = sheet.getRange(row, 1, 1, Math.min(COL.XTRA, sheet.getMaxColumns())).getValues()[0];
      const items = parseExtras(v[COL.XTRA - 1]);
      const ymd = (x) => x instanceof Date ? Utilities.formatDate(x, "America/New_York", "yyyy-MM-dd") : String(x || "");
      return { sheet: sheet, row: row, q: {
        ref: ref, status: String(v[COL.STATUS - 1] || "New"), name: String(v[COL.NAME - 1] || ""), phone: String(v[COL.PHONE - 1] || ""),
        email: String(v[COL.EMAIL - 1] || ""), date: ymd(v[COL.DATE - 1]), guests: String(v[COL.GUESTS - 1] || ""),
        duration: String(v[COL.DURATION - 1] || ""), yacht: String(v[COL.YACHT - 1] || ""), extras: String(v[COL.EXTRAS - 1] || ""),
        message: String(v[COL.MESSAGE - 1] || ""), lang: /span/i.test(String(v[COL.LANG - 1])) ? "es" : "en",
        decided: v[COL.DECIDED - 1] ? String(v[COL.DECIDED - 1]) : "",
        price: Number(v[COL.PRICE - 1]) || 0, total: Number(v[COL.TOTAL - 1]) || 0, gratuity: Number(v[COL.GRATUITY - 1]) || 0,
        gratuityChoice: typeof v[COL.TIP_CHOICE - 1] === "number" ? Math.round(v[COL.TIP_CHOICE - 1] * 100) + "%" : String(v[COL.TIP_CHOICE - 1] || ""),
        paid: v[COL.PAID - 1] ? String(v[COL.PAID - 1]) : "",
        departure: String(v[COL.DEPARTURE - 1] || "").trim(), payment: String(v[COL.PAYMENT - 1] || ""), start: startTime(v[COL.START - 1]),
        extension: String(v[COL.EXT - 1] || ""), extPayment: String(v[COL.EXT_PAY - 1] || ""),
        discount: Number(v[COL.DISCOUNT - 1]) || 0, fee: Number(v[COL.FEE - 1]) || 0,
        extraItems: items, extrasTotal: extrasSum(items),
      } };
    }
  }
  return null;
}

function lookupEnquiry(ref) {
  const f = findEnquiry(ref);
  return f ? { ok: true, enquiry: withPayUrl(f.q), taxRate: TAX_RATE, taxGratuity: TAX_GRATUITY, taxExtras: TAX_EXTRAS, serviceFee: SERVICE_FEE } : { ok: false, error: "not found" };
}

function withPayUrl(q) {
  if (q.total > 0) q.payUrl = payUrl(q.ref);
  return q;
}

// price: the charter price before tax typed on the Accept page (0 = Nektarios sends the quote himself).
// gratuityPct: the gratuity picked on the Accept page (18 by default, 0 = none or included with the yacht).
// With a price the client's email gets a Pay button for the total, gratuity and Florida sales tax included.
function decideEnquiry(ref, a, price, gratuityPct, discount, extras) {
  if (a !== "accept" && a !== "decline") return { ok: false, error: "bad action" };
  price = a === "accept" && price > 0 ? cents(price) / 100 : 0;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let f;
  try {
    f = findEnquiry(ref);
    if (!f) return { ok: false, error: "not found" };
    addNewColumns(f.sheet);
    // Accepted earlier without a price: add it now and send the payment link
    const addingPrice = a === "accept" && price && /^accepted$/i.test(f.q.status) && !f.q.total;
    // Decided already (a second tap, or the other button): say so, change nothing, email nobody
    if (!addingPrice && /^(accepted|declined|paid)$/i.test(f.q.status)) return { ok: true, already: true, enquiry: withPayUrl(f.q) };
    const status = a === "accept" ? "Accepted" : "Declined";
    f.sheet.getRange(f.row, COL.STATUS).setValue(status);
    f.sheet.getRange(f.row, COL.DECIDED).setValue(new Date());
    f.q.status = status;
    if (price) setQuote(f, price, gratuityPct, discount, extras);
  } finally {
    lock.releaseLock();
  }
  let emailed = false;
  try {
    emailed = a === "accept" ? sendClientAccepted(f.q) : sendClientDeclined(f.q);
  } catch (err) {
    console.error("Decision email failed: " + err);
  }
  return { ok: true, enquiry: f.q, emailed: emailed };
}

// The client changes the gratuity on the payment page, before paying: the Gratuity, Total and choice in the
// row are updated, so the Stripe payment, the reminders and the Monday summary all use the new amount. No email.
const GRATUITY_CHOICES = [15, 18, 20];
function setGratuity(ref, pct) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const f = findEnquiry(ref);
    if (!f) return { ok: false, error: "not found" };
    if (!/^accepted$/i.test(f.q.status) || !(f.q.price > 0)) return { ok: false, error: "not payable" };
    if (GRATUITY_CHOICES.indexOf(pct) < 0) return { ok: false, error: "bad gratuity" };
    f.q.gratuity = cents(f.q.price * pct / 100) / 100;
    const t = quoteTotals(f.q.price, f.q.gratuity, f.q.extrasTotal);
    f.q.fee = t.fee;
    f.q.total = t.total;
    f.q.gratuityChoice = pct + "%";
    f.sheet.getRange(f.row, COL.TOTAL).setValue(f.q.total);
    f.sheet.getRange(f.row, COL.FEE).setValue(f.q.fee || "");
    f.sheet.getRange(f.row, COL.GRATUITY).setValue(f.q.gratuity);
    f.sheet.getRange(f.row, COL.TIP_CHOICE).setNumberFormat("@").setValue(f.q.gratuityChoice);
    return { ok: true, enquiry: withPayUrl(f.q), taxRate: TAX_RATE, taxGratuity: TAX_GRATUITY, serviceFee: SERVICE_FEE };
  } finally {
    lock.releaseLock();
  }
}

// The quote on a row. listPrice: the charter price before any discount; discount: dollars off (shown to the client).
// Price = the charter after the discount; the gratuity is a % of that, then the service fee, and Florida sales tax on top.
// extras: "DJ: 800; Decorations: 450" (their own lines on the client's payment)
function setQuote(f, listPrice, gratuityPct, discount, extras) {
  listPrice = cents(listPrice) / 100;
  const off = Math.min(Math.max(cents(Number(discount) || 0) / 100, 0), listPrice);
  const pct = Math.min(Math.max(Number(gratuityPct) || 0, 0), 30);
  f.q.price = cents(listPrice - off) / 100;
  f.q.discount = off;
  f.q.gratuity = cents(f.q.price * pct / 100) / 100;
  f.q.extraItems = parseExtras(extras);
  f.q.extrasTotal = extrasSum(f.q.extraItems);
  const t = quoteTotals(f.q.price, f.q.gratuity, f.q.extrasTotal);
  f.q.fee = t.fee;
  f.q.total = t.total;
  f.sheet.getRange(f.row, COL.FEE).setValue(t.fee || "");
  f.sheet.getRange(f.row, COL.XTRA).setNumberFormat("@").setValue(extrasText(f.q.extraItems));
  f.sheet.getRange(f.row, COL.PRICE, 1, 2).setValues([[f.q.price, f.q.total]]);
  f.sheet.getRange(f.row, COL.GRATUITY).setValue(f.q.gratuity);
  f.sheet.getRange(f.row, COL.DISCOUNT).setValue(off || "");
  withPayUrl(f.q);
}

// Edit price or discount: an accepted quote the client hasn't paid yet. The client gets the updated quote with the
// same payment link (the payment page always reads the total from here).
function repriceEnquiry(ref, listPrice, gratuityPct, discount, extras) {
  if (!(listPrice > 0)) return { ok: false, error: "no price" };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let f;
  try {
    f = findEnquiry(ref);
    if (!f) return { ok: false, error: "not found" };
    addNewColumns(f.sheet);
    if (!/^accepted$/i.test(f.q.status)) return { ok: false, error: "status " + f.q.status };
    setQuote(f, listPrice, gratuityPct, discount, extras);
  } finally {
    lock.releaseLock();
  }
  let emailed = false;
  try { emailed = sendClientAccepted(f.q); } catch (err) { console.error("Updated quote email failed: " + err); }
  return { ok: true, enquiry: f.q, emailed: emailed };
}

/* =================== Payments ===================
   The client pays the total on yachtique.co/pay/<ref> (netlify/functions/pay.mjs) through Stripe Checkout.
   Stripe confirms it twice (the client's return to the page and the Stripe webhook); the first one marks the row Paid
   and sends the emails, the second changes nothing. */

function markPaid(ref, amountCents, payment) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let f;
  try {
    f = findEnquiry(ref);
    if (!f) return { ok: false, error: "not found" };
    addNewColumns(f.sheet);
    if (/^paid$/i.test(f.q.status)) return { ok: true, already: true, enquiry: withPayUrl(f.q) };
    f.sheet.getRange(f.row, COL.STATUS).setValue("Paid");
    f.sheet.getRange(f.row, COL.PAID, 1, 2).setValues([[new Date(), payment]]);
    // Should never differ (the amount comes from this sheet), but if it does, say so where Nektarios looks
    if (amountCents && amountCents !== cents(f.q.total)) {
      const note = String(f.sheet.getRange(f.row, COL.NOTES).getValue() || "");
      f.sheet.getRange(f.row, COL.NOTES).setValue((note ? note + "\n" : "") + "Stripe received " + usd(amountCents / 100) + ", the Total says " + usd(f.q.total) + ".");
    }
    f.q.status = "Paid";
    f.q.payment = payment;
    f.q.amountPaid = amountCents ? amountCents / 100 : f.q.total;
  } finally {
    lock.releaseLock();
  }
  try { sendOwnerPaid(f.q); } catch (err) { console.error("Paid alert failed: " + err); }
  try { sendClientPaid(f.q); } catch (err) { console.error("Paid email failed: " + err); }
  return { ok: true, enquiry: withPayUrl(f.q) };
}

// Paid outside Stripe (Zelle): Nektarios confirms it on his /api/decide page. Same result as a card payment:
// Status Paid, Paid date, Payment = "Zelle", and the same emails (client thank-you with the calendar file, owner alert).
// Accepted without a price: the price and gratuity typed on that page are saved first, tax added as usual.
function markPaidManual(ref, method, price, gratuityPct) {
  method = /^zelle$/i.test(method) ? "Zelle" : "";
  if (!method) return { ok: false, error: "bad method" };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let total;
  try {
    const f = findEnquiry(ref);
    if (!f) return { ok: false, error: "not found" };
    addNewColumns(f.sheet);
    if (/^paid$/i.test(f.q.status)) return { ok: true, already: true, enquiry: withPayUrl(f.q) };
    if (/^(declined|lost)$/i.test(f.q.status)) return { ok: false, error: "status " + f.q.status };
    if (!(f.q.total > 0)) {
      price = cents(price) / 100;
      if (!(price > 0)) return { ok: false, error: "no price" };
      const pct = Math.min(Math.max(Number(gratuityPct) || 0, 0), 30);
      const grat = cents(price * pct / 100) / 100;
      const t = quoteTotals(price, grat, f.q.extrasTotal);
      f.q.total = t.total;
      f.q.fee = t.fee;
      f.sheet.getRange(f.row, COL.PRICE, 1, 2).setValues([[price, f.q.total]]);
      f.sheet.getRange(f.row, COL.GRATUITY).setValue(grat);
      f.sheet.getRange(f.row, COL.FEE).setValue(t.fee || "");
    }
    if (!f.sheet.getRange(f.row, COL.DECIDED).getValue()) f.sheet.getRange(f.row, COL.DECIDED).setValue(new Date());
    total = f.q.total;
  } finally {
    lock.releaseLock();
  }
  return markPaid(ref, cents(total), method);
}

/* =================== Extra time on board ===================
   About an hour before the end, the client gets "Want more time?" with a link to yachtique.co/extend/<ref>
   (netlify/functions/extend.mjs). There they pick +1 or +2 hours; Stripe only HOLDS the amount on their card
   (one tap with the card saved at the first payment). Nektarios checks with the captain and taps Confirm
   (the hold is charged) or Not possible (the hold is released, nothing charged) on /api/decide.
   Extension column: "+1 hour · $380.60 · Held" → "Confirmed" or "Released"; Extension payment: Stripe's id. */

function recordExtension(ref, state, hours, amountCents, payment) {
  if (["held", "confirmed", "released"].indexOf(state) < 0 || !/^pi_/.test(payment)) return { ok: false, error: "bad request" };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let f;
  try {
    f = findEnquiry(ref);
    if (!f) return { ok: false, error: "not found" };
    addNewColumns(f.sheet);
    const now = f.q.extension;
    if (state === "held") {
      if (f.q.extPayment === payment) return { ok: true, already: true, enquiry: f.q };
      if (!/^(paid|booked)$/i.test(f.q.status)) return { ok: false, error: "not booked" };
      if (/Held$/.test(now)) return { ok: false, error: "one already waiting" };
      // A second extension is added after the first, so the record of both stays in the cell
      f.q.extension = (now ? now + " | " : "") + "+" + hours + (hours === 1 ? " hour" : " hours") + " · " + usd(amountCents / 100) + " · Held";
      f.q.extPayment = payment;
      f.sheet.getRange(f.row, COL.EXT, 1, 2).setValues([[f.q.extension, payment]]);
    } else {
      if (f.q.extPayment !== payment) return { ok: false, error: "different payment" };
      if (!/Held$/.test(now)) return { ok: true, already: true, enquiry: f.q };
      f.q.extension = now.replace(/Held$/, state === "confirmed" ? "Confirmed" : "Released");
      f.sheet.getRange(f.row, COL.EXT).setValue(f.q.extension);
    }
  } finally {
    lock.releaseLock();
  }
  const q = f.q, L = q.lang === "es" ? "es" : "en", E = EXT_TXT[L], first = firstName(q);
  const what = q.extension.split(" | ").pop().split(" · ").slice(0, 2).join(" · ");
  try {
    if (state === "held") {
      sendOwnerExtension(q, what);
      clientMail(q, E.heldSubject, E.heldPre, eyebrow(E.eyebrow + " &middot; " + esc(q.ref)) + heading(E.heldHead(esc(first))) + para(E.heldP(what)),
        E.heldHead(first) + "\n\n" + E.heldP(what).replace(/<[^>]+>/g, ""));
    } else if (state === "confirmed") {
      clientMail(q, E.okSubject, E.okPre, eyebrow(E.eyebrow + " &middot; " + esc(q.ref)) + heading(E.okHead(esc(first))) + para(E.okP(what)),
        E.okHead(first) + "\n\n" + E.okP(what).replace(/<[^>]+>/g, ""));
    } else {
      clientMail(q, E.noSubject, E.noPre, eyebrow(E.eyebrow + " &middot; " + esc(q.ref)) + heading(E.noHead(esc(first))) + para(E.noP(what)),
        E.noHead(first) + "\n\n" + E.noP(what).replace(/<[^>]+>/g, ""));
    }
  } catch (err) {
    console.error("Extension email failed: " + err);
  }
  return { ok: true, enquiry: q };
}

/** Yachtique: a client asked for more time; the money is held until the captain says yes. */
function sendOwnerExtension(q, what) {
  const phone = String(q.phone || "").replace(/\D/g, "");
  const inner = eyebrow("More time requested &middot; " + esc(q.ref)) + heading(esc(q.name || "Client") + " wants " + esc(what.split(" · ")[0])) +
    para("Stripe is holding <b>" + esc(what.split(" · ")[1]) + "</b> on their card. Nothing is charged until you confirm.", "margin-bottom:22px") + rule() +
    factsBox(q) + eyebrow("Next") +
    steps([["Ask the captain or YCN now.", "Is the yacht free for the extra time?"], ["Yes:", "tap Confirm. The card is charged and the client gets a confirmation."],
      ["No:", "tap Not possible. The hold is released and the client is told, nothing charged."]]) +
    buttons(button(decideUrl(q.ref, "extok"), "Confirm", true) + button(decideUrl(q.ref, "extno"), "Not possible", false) +
      (phone ? button("https://wa.me/" + phone, "WhatsApp " + (firstName(q) || "client"), false) : ""));
  sendAlert({ name: "Yachtique", subject: q.ref + " · MORE TIME " + what + " · " + (q.name || "client") + " · confirm with the captain",
    htmlBody: layout((q.name || "A client") + " wants more time: " + what, inner),
    body: (q.name || "A client") + " asked for " + what + " (" + q.ref + "). Confirm: " + decideUrl(q.ref, "extok") + "\nNot possible: " + decideUrl(q.ref, "extno") });
}

/** The offer, about an hour before the end: a link to add time. Yachtique gets the same link to send on WhatsApp. */
// early: the one about an hour before the start, so they have the link for the whole charter
function sendClientExtendOffer(q, early) {
  const L = q.lang === "es" ? "es" : "en", E = EXT_TXT[L], first = firstName(q), link = extUrl(q.ref, L);
  const head = early ? E.earlyHead(first) : E.offerHead(first), p = early ? E.earlyP(yachtName(q)) : E.offerP(yachtName(q));
  const inner = eyebrow(E.eyebrow + " &middot; " + esc(q.ref)) + heading(esc(head)) + para(p) + buttons(button(link, E.offerBtn, true));
  return clientMail(q, early ? E.earlySubject : E.offerSubject, early ? E.earlyPre : E.offerPre, inner, head + "\n\n" + p.replace(/<[^>]+>/g, "") + "\n\n" + link);
}

const EXT_TXT = {
  en: {
    eyebrow: "On board",
    offerSubject: "Want more time on the water? · Yachtique", offerPre: "Add an hour or two in one tap.",
    offerHead: (n) => "Enjoying the day" + (n ? ", " + n : "") + "?",
    offerP: (y) => "If you'd like more time" + (y ? " on <b>" + y + "</b>" : "") + ", add an hour or two below. Your card is only charged once the captain confirms the yacht is free.",
    offerBtn: "Add more time",
    earlySubject: "Your charter today: add more time anytime · Yachtique", earlyPre: "Keep this link for your day on the water.",
    earlyHead: (n) => "See you on board soon" + (n ? ", " + n : "") + ".",
    earlyP: (y) => "Having too much fun to head back? Add an hour or two anytime during your charter" + (y ? " on <b>" + y + "</b>" : "") + " with the button below. It works until your charter ends, and your card is only charged once the captain confirms.",
    heldSubject: "We're checking with the captain · Yachtique", heldPre: "Nothing is charged until the captain confirms.",
    heldHead: (n) => "Request received" + (n ? ", " + n : "") + ".",
    heldP: (w) => "You asked for <b>" + w + "</b>. We're checking with the captain now. The amount is only held on your card, and it's charged once the extra time is confirmed.",
    okSubject: "Your extra time is confirmed · Yachtique", okPre: "Enjoy the rest of your day.",
    okHead: (n) => "Confirmed" + (n ? ", " + n : "") + ". Enjoy!",
    okP: (w) => "Your extra time is confirmed: <b>" + w + "</b>, charged to your card. The captain knows.",
    noSubject: "About your extra time · Yachtique", noPre: "Nothing was charged.",
    noHead: (n) => "Sorry" + (n ? ", " + n : "") + ".",
    noP: (w) => "The yacht isn't free for the extra time you asked for (<b>" + w + "</b>). The hold on your card has been released, and nothing was charged.",
  },
  es: {
    eyebrow: "A bordo",
    offerSubject: "¿Quiere más tiempo en el agua? · Yachtique", offerPre: "Añada una o dos horas con un toque.",
    offerHead: (n) => "¿Disfrutando del día" + (n ? ", " + n : "") + "?",
    offerP: (y) => "Si desea más tiempo" + (y ? " en <b>" + y + "</b>" : "") + ", añada una o dos horas abajo. Solo se cobra a su tarjeta cuando el capitán confirma que el yate está libre.",
    offerBtn: "Añadir tiempo",
    earlySubject: "Su alquiler de hoy: añada más tiempo cuando quiera · Yachtique", earlyPre: "Guarde este enlace para su día en el agua.",
    earlyHead: (n) => "Nos vemos pronto a bordo" + (n ? ", " + n : "") + ".",
    earlyP: (y) => "¿Lo están pasando tan bien que no quieren volver? Añada una o dos horas cuando quiera durante su alquiler" + (y ? " en <b>" + y + "</b>" : "") + " con el botón de abajo. Funciona hasta que termina su alquiler y solo se cobra a su tarjeta cuando el capitán lo confirma.",
    heldSubject: "Lo estamos consultando con el capitán · Yachtique", heldPre: "No se cobra nada hasta que el capitán confirme.",
    heldHead: (n) => "Solicitud recibida" + (n ? ", " + n : "") + ".",
    heldP: (w) => "Usted pidió <b>" + w + "</b>. Lo estamos consultando ahora con el capitán. El importe solo queda retenido en su tarjeta y se cobra cuando se confirme el tiempo extra.",
    okSubject: "Su tiempo extra está confirmado · Yachtique", okPre: "Disfrute del resto del día.",
    okHead: (n) => "Confirmado" + (n ? ", " + n : "") + ". ¡Disfrute!",
    okP: (w) => "Su tiempo extra está confirmado: <b>" + w + "</b>, cobrado a su tarjeta. El capitán ya lo sabe.",
    noSubject: "Sobre su tiempo extra · Yachtique", noPre: "No se cobró nada.",
    noHead: (n) => "Lo sentimos" + (n ? ", " + n : "") + ".",
    noP: (w) => "El yate no está libre para el tiempo extra que pidió (<b>" + w + "</b>). Se liberó la retención en su tarjeta y no se cobró nada.",
  },
};

/* =================== Website insights ===================
   /api/track sends one anonymous event per page view or click (no names, no IPs).
   Events: one row each. Insights: totals and top lists, counted for the live site (yachtique.co) only. */

function saveEvent(ev) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Events");
  if (!sheet) {
    sheet = ss.insertSheet("Events");
    sheet.getRange(1, 1, 1, EVENT_HEADERS.length).setValues([EVENT_HEADERS]);
    styleHeader(sheet, EVENT_HEADERS.length);
    sheet.getRange("A2:A").setNumberFormat("mmm d, yyyy h:mm am/pm");
    sheet.setColumnWidths(1, EVENT_HEADERS.length, 140);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet.appendRow([new Date(), safe(ev.e), safe(ev.p), safe(ev.y), safe(ev.v), ev.l === "es" ? "Spanish" : "English",
      safe(ev.s), safe(ev.d), safe(ev.h)]);
  } finally {
    lock.releaseLock();
  }
  if (!ss.getSheetByName("Insights")) setupInsights();
  return { ok: true };
}

/** Builds the Insights tab (runs by itself on the first event; run again from the editor to rebuild it). */
function setupInsights() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Insights") || ss.insertSheet("Insights", 1);
  sh.clear();
  const live = 'Events!I:I,"yachtique.co"';
  const since = (days) => '">="&(NOW()-' + days + ")";
  sh.getRange("A1").setValue("Yachtique website insights").setFontSize(16).setFontWeight("bold").setFontColor("#071820");
  sh.getRange("A2").setValue("Live from yachtique.co. Anonymous counts, updated with every visit.").setFontColor("#777777");

  const rows = [["Activity", "Last 7 days", "Last 30 days"],
    ["Page views", "view"], ["WhatsApp taps", "whatsapp"], ["Inquiries sent", "enquiry"], ["Phone calls", "call"],
    ["Emails", "email"], ["Yachts saved", "shortlist_add"], ["Shortlists sent", "shortlist_send"],
    ["Shortlists shared", "shortlist_share"], ["Date searches", "search"], ["Yacht quick views", "yacht_quickview"]];
  sh.getRange(4, 1, 1, 3).setValues([rows[0]]);
  rows.slice(1).forEach((r, i) => {
    const row = 5 + i;
    sh.getRange(row, 1).setValue(r[0]);
    sh.getRange(row, 2).setFormula('=COUNTIFS(Events!B:B,"' + r[1] + '",Events!A:A,' + since(7) + "," + live + ")");
    sh.getRange(row, 3).setFormula('=COUNTIFS(Events!B:B,"' + r[1] + '",Events!A:A,' + since(30) + "," + live + ")");
  });
  styleBlock(sh, 4, 1, 3);

  // Top lists for the last 30 days: [title, column to group, extra condition]
  const lists = [
    ["Most viewed yachts", "D", "B='view' and D<>''", "Yacht", "Views"],
    ["Where WhatsApp is tapped", "E", "B='whatsapp'", "Place", "Taps"],
    ["Most visited pages", "C", "B='view'", "Page", "Views"],
    ["Where visitors come from", "G", "B='view'", "Source", "Visits"],
    ["Language", "F", "B='view'", "Language", "Views"],
    ["Phone or computer", "H", "B='view'", "Device", "Views"],
  ];
  lists.forEach((l, i) => {
    const col = 5 + (i % 3) * 3, row = i < 3 ? 4 : 18;
    sh.getRange(row - 1, col).setValue(l[0]).setFontWeight("bold").setFontColor("#7F5119");
    const q = '"select ' + l[1] + ', count(B) where ' + l[2] + " and I='yachtique.co' and A >= datetime '\"&TEXT(NOW()-30,\"yyyy-mm-dd hh:mm:ss\")&\"' group by " + l[1] +
      " order by count(B) desc limit 10 label " + l[1] + " '" + l[3] + "', count(B) '" + l[4] + "'\"";
    sh.getRange(row, col).setFormula('=IFERROR(QUERY(Events!A:I,' + q + ',1),"No visits yet")');
    styleBlock(sh, row, col, 2);
  });
  sh.setColumnWidth(1, 170);
  [5, 8, 11].forEach((c) => { sh.setColumnWidth(c, 220); sh.setColumnWidth(c + 1, 80); });
  sh.setFrozenRows(2);
}

function styleBlock(sh, row, col, n) {
  sh.getRange(row, col, 1, n).setFontWeight("bold").setBackground("#071820").setFontColor("#E6D0A4");
}

/* =================== Proposals ===================
   Proposals tab: one row per yacht option. Every row with the same ID becomes one page at yachtique.co/p/<ID>.
   The first row of an ID gives the client, date, guests, time, pickup, terms and validity.
   Yacht: its web address (yachtique.co/yachts/kilauea), handle (kilauea) or name (Kilauea).
   Prices: leave blank to use the website rates. Changes show on the page within a minute. */

// Discount (first row of an ID): "10%" or a dollar amount, taken off every price on the page and shown to the client
const PROPOSAL_HEADERS = ["ID", "Client", "Date", "Guests", "Time", "Pickup", "Yacht", "Label", "Note", "4 hours", "6 hours", "8 hours", "Terms", "Valid until", "Language", "Discount"];

function proposalsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("Proposals");
  if (!sh) {
    sh = ss.insertSheet("Proposals");
    sh.getRange(1, 1, 1, PROPOSAL_HEADERS.length).setValues([PROPOSAL_HEADERS]);
    styleHeader(sh, PROPOSAL_HEADERS.length);
    sh.getRange("C2:C").setNumberFormat("yyyy-mm-dd");
    sh.getRange("N2:N").setNumberFormat("yyyy-mm-dd");
    sh.setColumnWidths(1, PROPOSAL_HEADERS.length, 120);
    sh.setColumnWidth(9, 360); sh.setColumnWidth(13, 360);
    sh.getRange(2, 1, 1, 13).setValues([["example-x1", "", "2026-12-12", 10, "Sunset charter", "Miami Beach Marina", "kilauea", "Best value",
      "Example row: copy it, change the ID and the details, and send the client yachtique.co/p/<ID>.", 2690, 3390, 4240,
      "Prices exclude Florida sales tax and gratuity. A deposit holds your yacht and date."]]);
  }
  if (!sh.getRange(1, PROPOSAL_HEADERS.length).getValue()) {
    sh.getRange(1, PROPOSAL_HEADERS.length).setValue(PROPOSAL_HEADERS[PROPOSAL_HEADERS.length - 1]);
    styleHeader(sh, PROPOSAL_HEADERS.length);
  }
  return sh;
}

function getProposal(id) {
  id = id.toLowerCase().trim();
  if (!id) return { ok: false, error: "no id" };
  const rows = proposalsSheet().getDataRange().getValues().slice(1).filter((r) => String(r[0]).toLowerCase().trim() === id);
  if (!rows.length) return { ok: false, error: "not found" };
  const ymd = (v) => v instanceof Date ? Utilities.formatDate(v, "America/New_York", "yyyy-MM-dd") : String(v || "").trim();
  const num = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
  const first = rows[0];
  const valid = ymd(first[13]);
  if (valid && valid < Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd")) return { ok: false, error: "expired" };
  const options = rows.filter((r) => String(r[6]).trim()).map((r) => {
    const prices = {};
    if (num(r[9])) prices["4 hours"] = num(r[9]);
    if (num(r[10])) prices["6 hours"] = num(r[10]);
    if (num(r[11])) prices["8 hours"] = num(r[11]);
    return { yacht: String(r[6]).trim(), label: String(r[7] || "").trim(), note: String(r[8] || "").trim(), prices: prices };
  });
  const terms = String(first[12] || "").split(/\n+/).map((t) => t.trim()).filter(Boolean);
  return { ok: true, proposal: {
    client: String(first[1] || "").trim(), date: ymd(first[2]), guests: num(first[3]) || "",
    time: String(first[4] || "").trim(), pickup: String(first[5] || "").trim(),
    options: options, terms: terms, validUntil: valid, lang: String(first[14] || "").toLowerCase().indexOf("es") === 0 ? "es" : "en",
    discount: typeof first[15] === "number" && first[15] > 0 && first[15] < 1 ? Math.round(first[15] * 100) + "%" : String(first[15] || "").trim(),
  } };
}

/** The website asks here for the yachts to show. */
function doGet(e) {
  const p = e.parameter || {};
  if (!SECRET || p.secret !== SECRET) return json({ ok: false, error: "unauthorized" });
  if (p.action === "proposal") return json(getProposal(String(p.id || "")));
  if (p.action !== "fleet") return json({ ok: false, error: "unknown action" });

  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Fleet").getDataRange().getValues().slice(1);
  const fleet = rows
    .filter((r) => r[0] === true && String(r[1]).trim())
    .map((r) => ({
      name: String(r[1]), model: String(r[2]), guests: String(r[3]), length: String(r[4]),
      cabins: String(r[5]), note: String(r[6]), photo: String(r[7]), rate: String(r[8]),
    }));
  return json({ ok: true, fleet: fleet });
}

// Stops form text like "=IMPORTXML(...)" from being treated as a formula
function safe(v) {
  const s = String(v == null ? "" : v).slice(0, 5000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/* =================== Branded emails ===================
   Same look as yachtique.co: navy and gold, Lora headings, Lato text, pill buttons,
   details in a rounded box with gold labels. Mail apps that block web fonts fall back to Georgia/Helvetica. */

const C = { bg: "#000F16", card: "#04202C", inner: "#000F16", line: "#5E5236", gold: "#C9A564", goldLight: "#EBD7AC",
  text: "#E8E4DA", white: "#FFFFFF", muted: "#9BA8AE" };
const SERIF = "'Lora',Georgia,'Times New Roman',serif";
const SANS = "'Lato','Helvetica Neue',Helvetica,Arial,sans-serif";

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const ES_DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ES_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function prettyDate(iso, lang) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso || (lang === "es" ? "Flexible" : "Flexible");
  const p = iso.split("-").map(Number);
  const d = new Date(p[0], p[1] - 1, p[2], 12);
  if (lang === "es") return ES_DAYS[d.getDay()] + ", " + p[2] + " de " + ES_MONTHS[p[1] - 1] + " de " + p[0];
  return Utilities.formatDate(d, "America/New_York", "EEE, MMM d, yyyy");
}

// Days from today (Miami) to the charter date, or null
function daysUntil(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return null;
  const today = Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd").split("-").map(Number);
  const p = iso.split("-").map(Number);
  return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(today[0], today[1] - 1, today[2])) / 86400000);
}

function eyebrow(text, align) {
  return '<p style="margin:0 0 12px;font-family:' + SANS + ';font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:' + C.gold + ';text-align:' + (align || "center") + '">' + text + "</p>";
}

function heading(text) {
  return '<h1 style="margin:0 0 14px;font-family:' + SERIF + ';font-weight:500;font-size:32px;line-height:1.2;color:' + C.white + ';text-align:center">' + text + "</h1>";
}

function para(html, extra) {
  return '<p style="margin:0 0 24px;font-family:' + SANS + ';font-size:16px;line-height:1.7;color:' + C.text + ';text-align:center;' + (extra || "") + '">' + html + "</p>";
}

// Rounded box, two facts per row, gold label over the value (the site's info bar)
function factsBox(q, lang) {
  const es = lang === "es";
  const dur = (x) => es ? String(x).replace(/(\d+)\s*hours?/i, "$1 horas").replace(/Multi-day \/ week/i, "Varios días / semana").replace(/Not sure yet/i, "Por confirmar") : x;
  const facts = [
    [es ? "Fecha" : "Date", prettyDate(q.date, lang).replace(/^./, (c) => c.toUpperCase())],
    [es ? "Invitados" : "Guests", q.guests ? q.guests + (/^\d+$/.test(q.guests) ? (es ? " invitados" : " guests") : "") : (es ? "Por confirmar" : "To confirm")],
    [es ? "Duración" : "Duration", q.duration ? dur(q.duration) : (es ? "Por confirmar" : "To confirm")],
    [es ? "Yate" : "Yacht", q.yacht && !/help me choose/i.test(q.yacht) ? q.yacht : (es ? "Le ayudamos a elegir" : "Help me choose")],
  ];
  if (q.gratuityChoice && !q.total) facts.push([es ? "Propina" : "Gratuity", /included/i.test(q.gratuityChoice) ? (es ? "Incluida con el yate" : "Included with the yacht") : q.gratuityChoice]);
  if (q.start) facts.push([es ? "Hora de salida" : "Start time", niceTime(q.start, lang)]);
  if (q.departure) facts.push([es ? "Salida" : "Departure", q.departure]);
  if (q.extras) facts.push([es ? "También organizamos" : "Also arranging", q.extras]);
  let rows = "";
  for (let i = 0; i < facts.length; i += 2) {
    const pair = facts.slice(i, i + 2);
    rows += "<tr>" + pair.map((f, j) => {
      const span = pair.length === 1 ? ' colspan="2"' : "";
      const border = "border-top:" + (i ? "1px solid " + C.line : "0") + ";" + (j === 0 && pair.length === 2 ? "border-right:1px solid " + C.line + ";" : "");
      return '<td' + span + ' width="' + (pair.length === 1 ? "100%" : "50%") + '" align="center" valign="top" style="padding:18px 12px;' + border + '">' +
        '<div style="font-family:' + SANS + ';font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:' + C.gold + ';padding-bottom:6px">' + esc(f[0]) + "</div>" +
        '<div style="font-family:' + SERIF + ';font-size:17px;font-weight:600;line-height:1.35;color:' + C.white + '">' + esc(f[1]) + "</div></td>";
    }).join("") + "</tr>";
  }
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid ' + C.line + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '">' + rows + "</table>";
}

function messageBox(label, text) {
  if (!text) return "";
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid ' + C.line + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '"><tr><td style="padding:18px 22px">' +
    '<div style="font-family:' + SANS + ';font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:' + C.gold + ';padding-bottom:8px">' + esc(label) + "</div>" +
    '<div style="font-family:' + SANS + ';font-size:15px;line-height:1.7;color:' + C.text + ';white-space:pre-line">' + esc(text) + "</div></td></tr></table>";
}

function button(href, label, primary) {
  const style = primary
    ? "background:" + C.gold + ";background-image:linear-gradient(100deg,#A87A40 0%,#C9A564 50%,#DDBF86 100%);color:#000F16;border:1px solid " + C.gold
    : "background:transparent;color:" + C.goldLight + ";border:1px solid " + C.gold;
  return '<a href="' + esc(href) + '" style="display:inline-block;margin:0 5px 10px;padding:14px 26px;font-family:' + SANS + ';font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-radius:999px;' + style + '">' + esc(label) + "</a>";
}

function buttons(html) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:4px 0 6px">' + html + "</td></tr></table>";
}

// "What happens next": numbered gold circles, like the site and the QR cards
function steps(list) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 30px">' + list.map((t, i) =>
    '<tr><td width="46" valign="top" style="padding:0 0 16px"><div style="width:32px;height:32px;line-height:32px;border:1px solid ' + C.gold + ';border-radius:50%;text-align:center;font-family:' + SERIF + ';font-size:15px;color:' + C.gold + '">' + (i + 1) + "</div></td>" +
    '<td valign="top" style="padding:5px 0 16px;font-family:' + SANS + ';font-size:15px;line-height:1.6;color:' + C.text + '"><b style="color:' + C.white + ';font-weight:700">' + t[0] + "</b> " + t[1] + "</td></tr>").join("") + "</table>";
}

function rule() {
  return '<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 26px"><tr><td width="44" style="border-top:1px solid ' + C.gold + ';font-size:0;line-height:0">&nbsp;</td></tr></table>';
}

function layout(preheader, inner, lang) {
  return '<!doctype html><html lang="' + (lang === "es" ? "es" : "en") + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">' +
    '<link href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Lato:wght@400;700&display=swap" rel="stylesheet">' +
    '<style>@media (max-width:520px){.yq-pad{padding:30px 22px !important}.yq-h1{font-size:27px !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:' + C.bg + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + C.bg + '">' + esc(preheader) + "</div>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.bg + '"><tr><td align="center" style="padding:28px 12px 36px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:22px;border-collapse:separate">' +
    '<tr><td align="center" style="padding:38px 32px 26px"><a href="' + SITE + '"><img src="' + LOGO + '" width="170" alt="Yachtique" style="display:block;width:170px;height:auto;border:0"></a></td></tr>' +
    '<tr><td class="yq-pad" style="padding:6px 40px 34px">' + inner + "</td></tr>" +
    '<tr><td align="center" style="padding:24px 32px 28px;border-top:1px solid ' + C.line + ';font-family:' + SANS + ';font-size:12px;line-height:1.9;color:' + C.muted + '">' +
    (lang === "es" ? 'Yachtique &middot; Alquiler de yates y concierge &middot; Miami, Florida<br>' : 'Yachtique &middot; Yacht charters &amp; concierge &middot; Miami, Florida<br>') +
    '<a href="' + SITE + '" style="color:' + C.gold + ';text-decoration:none">yachtique.co</a> &nbsp;&middot;&nbsp; ' +
    '<a href="https://wa.me/' + WHATSAPP + '" style="color:' + C.gold + ';text-decoration:none">+1 (305) 812-4721</a> &nbsp;&middot;&nbsp; ' +
    '<a href="https://www.instagram.com/yachtiquemiami/" style="color:' + C.gold + ';text-decoration:none">@yachtiquemiami</a></td></tr>' +
    "</table></td></tr></table></body></html>";
}

function firstName(q) { return String(q.name || "").trim().split(/\s+/)[0] || ""; }

/** Alert to Yachtique: everything needed to reply in one tap. `to`/`cc` are only changed by testEmails(). */
function sendOwnerAlert(q, to, cc) {
  const phone = String(q.phone || "").replace(/\D/g, "");
  const first = firstName(q) || "there";
  const when = q.date ? " on " + prettyDate(q.date) : "";
  // Ready-made first reply, so answering takes one tap
  const waText = "Hi " + first + ", this is Yachtique. Thank you for your charter request" + when + ". I'm checking which yachts are free and will send you the options shortly.";
  const mailBody = "Hi " + first + ",\n\nThank you for your charter request" + when + ". I'm checking which yachts are free and will send you the options shortly.\n\nYachtique\n+1 (305) 812-4721";
  const d = daysUntil(q.date);
  const soon = d !== null && d >= 0 && d <= 7
    ? '<p style="margin:0 0 22px;text-align:center"><span style="display:inline-block;padding:7px 16px;border:1px solid ' + C.gold + ';border-radius:999px;font-family:' + SANS + ';font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + C.goldLight + '">' +
      (d === 0 ? "Charter is today" : d === 1 ? "Charter is tomorrow" : "Charter in " + d + " days") + "</span></p>"
    : "";
  const contact = [q.phone, q.email].filter(Boolean).map(esc).join(" &nbsp;&middot;&nbsp; ");
  // One tap to answer the request: each opens a page with a single confirm button
  const decide = q.ref
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;border:1px solid ' + C.gold + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '"><tr><td align="center" style="padding:20px 14px 12px">' +
      '<div style="font-family:' + SANS + ';font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:' + C.gold + ';padding-bottom:12px">Answer ' + esc(q.ref) + (q.lang === "es" ? " &middot; client wrote in Spanish" : "") + "</div>" +
      button(decideUrl(q.ref, "accept"), "Accept", true) + button(decideUrl(q.ref, "decline"), "Decline", false) +
      '<div style="font-family:' + SANS + ';font-size:12px;line-height:1.6;color:' + C.muted + ';padding-top:4px">The client gets a branded email' + (q.lang === "es" ? " in Spanish" : "") + " the moment you confirm.</div></td></tr></table>"
    : "";
  const inner =
    eyebrow("New charter inquiry" + (q.ref ? " &middot; " + esc(q.ref) : "")) +
    heading(esc(q.name || "New client")) +
    (contact ? para(contact, "margin-bottom:22px") : "") +
    soon + rule() +
    factsBox(q) +
    ownerPriceBox(q) +
    extrasBox(q) +
    messageBox("Their message", q.message) +
    decide +
    buttons(
      (phone ? button("https://wa.me/" + phone + "?text=" + encodeURIComponent(waText), "Reply on WhatsApp", true) : "") +
      (q.email ? button("mailto:" + q.email + "?subject=" + encodeURIComponent("Your Yachtique charter request") + "&body=" + encodeURIComponent(mailBody), "Reply by email", !phone) : "") +
      button(SpreadsheetApp.getActiveSpreadsheet().getUrl(), "Open the sheet", false));
  sendAlert({
    replyTo: q.email || OWNER_EMAIL,
    name: "Yachtique Inquiries",
    subject: (q.ref ? q.ref + " · " : "") + "New inquiry: " + (q.name || "client") + " · " + prettyDate(q.date) + (q.guests ? " · " + q.guests + " guests" : ""),
    htmlBody: layout((q.name || "A client") + " · " + prettyDate(q.date) + (q.guests ? " · " + q.guests + " guests" : ""), inner),
    body: "New inquiry from " + q.name + "\nPhone: " + q.phone + "\nEmail: " + q.email + "\nDate: " + prettyDate(q.date) + (q.start ? " at " + niceTime(q.start, "en") : "") +
      "\nGuests: " + q.guests + "\nDuration: " + q.duration + "\nYacht: " + q.yacht + (q.departure ? "\nDeparture: " + q.departure : "") +
      (Number(q.sitePrice) > 0 ? "\nWebsite price: " + usd(Number(q.sitePrice)) + (Number(q.ycnCost) ? " · YCN charges you " + usd(Number(q.ycnCost)) + " · margin " + usd(cents(Number(q.sitePrice) - Number(q.ycnCost)) / 100) : "") : "") +
      "\nAlso arranging: " + q.extras + "\n\n" + q.message,
  }, to, cc);
}

// For Nektarios only, in the new-inquiry alert: the website price for the client's yacht, duration and marina,
// what YCN charges for it, the margin, and the gratuity and tax the client adds (sitePrice and ycnCost come from
// enquiry-to-sheet.mts). Nothing when the client hasn't picked a yacht and a duration.
function ownerPriceBox(q) {
  const price = Number(q.sitePrice) || 0, cost = Number(q.ycnCost) || 0;
  if (!(price > 0)) return "";
  const pct = parseInt(q.gratuityChoice, 10) || 0;
  const grat = cents(price * pct / 100) / 100;
  const t = quoteTotals(price, grat);
  const tax = t.tax, fee = t.fee, total = t.total;
  const margin = cents(price - cost) / 100;
  const row = (label, note, value, strong) =>
    '<tr><td style="padding:' + (strong ? "14px" : "11px") + ' 18px;border-top:1px solid ' + C.line + ';font-family:' + SANS + ';font-size:14px;color:' + C.text + '">' +
    (strong ? '<b style="color:' + C.white + '">' + label + "</b>" : label) +
    (note ? '<div style="font-size:12px;color:' + C.muted + ';padding-top:2px">' + note + "</div>" : "") + "</td>" +
    '<td align="right" valign="top" style="padding:' + (strong ? "14px" : "11px") + " 18px;border-top:1px solid " + C.line + ";font-family:" + SERIF + ";font-size:" + (strong ? "19px" : "15px") + ";font-weight:600;color:" + C.white + ';white-space:nowrap">' + value + "</td></tr>";
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid ' + C.gold + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '">' +
    '<tr><td colspan="2" style="padding:14px 18px 6px;font-family:' + SANS + ';font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:' + C.gold + '">The numbers &middot; for you only</td></tr>' +
    row("Website price", "YCN's public price + our 20%, for " + esc(q.duration) + (q.departure ? " from " + esc(q.departure) : ""), usd(price)) +
    (cost ? row("YCN charges you", "Broker price: $500 deposit to reserve, the rest 72 hours before", usd(cost)) : "") +
    (cost ? row("Your margin", Math.round(margin / price * 100) + "% of the charter price", usd(margin), true) : "") +
    (pct ? row("Gratuity " + pct + "%", "The client's choice; passed to YCN for the crew", usd(grat)) : "") +
    (fee ? row("Service fee " + +(SERVICE_FEE * 100).toFixed(2) + "%", (grat ? "Of charter + gratuity" : "Of the charter") + "; covers Stripe's card fees", usd(fee)) : "") +
    row("Florida sales tax " + +(TAX_RATE * 100).toFixed(2) + "%", "Collected for the state", usd(tax)) +
    row("Client pays", "If you accept at the website price", usd(total), true) +
    "</table>";
}

// Sends an alert to Yachtique, and the copy for ALERT_CC as its own email: a cc copy never arrived (checked 30 Oct 2026)
function sendAlert(msg, to, cc) {
  MailApp.sendEmail(Object.assign({}, msg, { to: to || OWNER_EMAIL }));
  const copy = cc === undefined ? ALERT_CC : cc;
  if (copy) MailApp.sendEmail(Object.assign({}, msg, { to: copy }));
}

// Client email copy in English and Spanish (formal "usted", like the website)
const TXT = {
  en: {
    gotEyebrow: "Charter request received", thanks: "Thank you", gotP: "We're checking which yachts are free for your day. You'll receive your options with clear pricing, usually within the hour.",
    note: "Your note", next: "What happens next",
    gotSteps: [["We check availability.", "Live calendars for every yacht that fits your group."], ["You receive your options.", "Photos, prices and what's included, on WhatsApp or by email."], ["Confirm and sail.", "Captain, crew and any extras arranged. You just arrive."]],
    sooner: "Want to talk it through sooner? Message us directly.", chat: "Chat on WhatsApp", fleet: "Browse the fleet",
    gotSubject: (d) => "Your charter request" + (d ? " for " + d : "") + " · Yachtique", gotPre: "Your options are on the way, usually within the hour.",
    waGot: (d) => "Hi Yachtique, I just sent a charter request" + (d ? " for " + d : "") + ".",
    accEyebrow: "Good news", accHead: (n) => "Your day is available" + (n ? ", " + n : "") + ".",
    accP: (y, d) => (y ? "<b>" + y + "</b> is available" : "We have the right yacht for you") + (d ? " on " + d : "") + ". Nektarios will message you shortly with your final quote and a secure link to pay.",
    accSteps: [["Your final quote.", "Everything included, with tax and gratuity shown, before you pay anything."], ["Pay securely online.", "Your yacht is reserved for you as soon as it's paid."], ["Step aboard.", "Captain and crew ready at the marina. We handle the rest."]],
    accSubject: (d) => "Good news: your charter" + (d ? " on " + d : "") + " is available · Yachtique", accPre: "Your yacht is available. Your final quote is on its way.",
    waAcc: (r) => "Hi Nektarios, I'd like to confirm my charter (" + r + ").",
    accPPay: (y, d) => (y ? "<b>" + y + "</b> is available" : "Your yacht is available") + (d ? " on " + d : "") + ". Secure your date with the payment below: we reserve your yacht with the captain as soon as it's received.",
    accStepsPay: [["Pay securely.", "Card, Apple Pay or Google Pay through Stripe. Service fee and Florida sales tax included."], ["We reserve your yacht.", "Confirmed with the captain right after your payment."], ["Step aboard.", "Captain and crew ready at the marina. We handle the rest."]],
    accSubjectPay: (d) => "Your charter" + (d ? " on " + d : "") + " is available: secure your date · Yachtique", accPrePay: "Your yacht is available. Pay securely to reserve it.",
    charter: "Charter", fee: (p) => "Service fee (" + p + "%)", discount: (p) => "Discount" + (p ? " (" + p + "%)" : ""), gratuity: (p) => "Gratuity (" + p + "%)", tax: (r) => "Florida sales tax (" + r + "%)", total: "Total", payBtn: (a) => "Pay " + a + " securely", question: "Questions first? Message Nektarios.",
    paidEyebrow: "Payment received", paidHead: (n) => "Thank you" + (n ? ", " + n : "") + ".",
    paidP: (a) => "We received <b>" + a + "</b> for your charter. We're reserving your yacht with the captain now, and you'll receive the final confirmation shortly.",
    paidSteps: [["We reserve your yacht.", "Confirmed with the captain, usually within a few hours."], ["Your boarding details.", "Marina, time and what to bring, the day before you sail."], ["Step aboard.", "Captain and crew ready at the marina. We handle the rest."]],
    paidSubject: (d) => "Payment received for your charter" + (d ? " on " + d : "") + " · Yachtique", paidPre: "Thank you. We're reserving your yacht now.",
    decEyebrow: "About your request", decHead: (n) => "Thank you" + (n ? ", " + n : "") + ".",
    decP: (y, d) => "Unfortunately we can't confirm " + (y ? "<b>" + y + "</b>" : "a yacht") + (d ? " on " + d : "") + ". We would love to find you another option: see which yachts are free that day, or message us and we'll suggest the best alternatives.",
    decFree: "See yachts free that day", decSubject: (d) => "About your charter request" + (d ? " for " + d : "") + " · Yachtique", decPre: "Let us find you another option.",
    waDec: (d) => "Hi Yachtique, could you suggest another yacht" + (d ? " for " + d : "") + "?",
  },
  es: {
    gotEyebrow: "Solicitud recibida", thanks: "Gracias", gotP: "Estamos revisando qué yates están libres para su día. Recibirá sus opciones con precios claros, normalmente en menos de una hora.",
    note: "Su nota", next: "Próximos pasos",
    gotSteps: [["Revisamos la disponibilidad.", "Calendarios en vivo de cada yate que se ajusta a su grupo."], ["Recibe sus opciones.", "Fotos, precios y lo que incluye, por WhatsApp o por correo."], ["Confirme y navegue.", "Capitán, tripulación y extras organizados. Usted solo llega."]],
    sooner: "¿Prefiere hablarlo antes? Escríbanos directamente.", chat: "Chatear por WhatsApp", fleet: "Ver la flota",
    gotSubject: (d) => "Su solicitud de alquiler" + (d ? " para el " + d : "") + " · Yachtique", gotPre: "Sus opciones están en camino, normalmente en menos de una hora.",
    waGot: (d) => "Hola Yachtique, acabo de enviar una solicitud de alquiler" + (d ? " para el " + d : "") + ".",
    accEyebrow: "Buenas noticias", accHead: (n) => "Su día está disponible" + (n ? ", " + n : "") + ".",
    accP: (y, d) => (y ? "<b>" + y + "</b> está disponible" : "Tenemos el yate ideal para usted") + (d ? " el " + d : "") + ". Nektarios le escribirá en breve con su cotización final y un enlace seguro para pagar.",
    accSteps: [["Su cotización final.", "Todo incluido, con impuestos y propina indicados, antes de pagar nada."], ["Pague en línea de forma segura.", "Su yate queda reservado en cuanto se paga."], ["Suba a bordo.", "Capitán y tripulación listos en la marina. Nosotros nos ocupamos del resto."]],
    accSubject: (d) => "Buenas noticias: su alquiler" + (d ? " del " + d : "") + " está disponible · Yachtique", accPre: "Su yate está disponible. Su cotización final está en camino.",
    waAcc: (r) => "Hola Nektarios, me gustaría confirmar mi alquiler (" + r + ").",
    accPPay: (y, d) => (y ? "<b>" + y + "</b> está disponible" : "Su yate está disponible") + (d ? " el " + d : "") + ". Reserve su fecha con el pago a continuación: reservamos su yate con el capitán en cuanto lo recibamos.",
    accStepsPay: [["Pague de forma segura.", "Tarjeta, Apple Pay o Google Pay a través de Stripe. Cargo por servicio e impuesto de ventas de Florida incluidos."], ["Reservamos su yate.", "Confirmado con el capitán justo después de su pago."], ["Suba a bordo.", "Capitán y tripulación listos en la marina. Nosotros nos ocupamos del resto."]],
    accSubjectPay: (d) => "Su alquiler" + (d ? " del " + d : "") + " está disponible: reserve su fecha · Yachtique", accPrePay: "Su yate está disponible. Pague de forma segura para reservarlo.",
    charter: "Alquiler", fee: (p) => "Cargo por servicio (" + p + "%)", discount: (p) => "Descuento" + (p ? " (" + p + "%)" : ""), gratuity: (p) => "Propina (" + p + "%)", tax: (r) => "Impuesto de ventas de Florida (" + r + "%)", total: "Total", payBtn: (a) => "Pagar " + a + " de forma segura", question: "¿Tiene preguntas? Escriba a Nektarios.",
    paidEyebrow: "Pago recibido", paidHead: (n) => "Gracias" + (n ? ", " + n : "") + ".",
    paidP: (a) => "Recibimos <b>" + a + "</b> por su alquiler. Ahora estamos reservando su yate con el capitán y en breve recibirá la confirmación final.",
    paidSteps: [["Reservamos su yate.", "Confirmado con el capitán, normalmente en pocas horas."], ["Sus detalles de embarque.", "Marina, hora y qué llevar, el día antes de navegar."], ["Suba a bordo.", "Capitán y tripulación listos en la marina. Nosotros nos ocupamos del resto."]],
    paidSubject: (d) => "Pago recibido por su alquiler" + (d ? " del " + d : "") + " · Yachtique", paidPre: "Gracias. Estamos reservando su yate ahora.",
    decEyebrow: "Sobre su solicitud", decHead: (n) => "Gracias" + (n ? ", " + n : "") + ".",
    decP: (y, d) => "Lamentablemente no podemos confirmar " + (y ? "<b>" + y + "</b>" : "un yate") + (d ? " el " + d : "") + ". Nos encantaría ofrecerle otra opción: vea qué yates están libres ese día o escríbanos y le sugerimos las mejores alternativas.",
    decFree: "Ver yates libres ese día", decSubject: (d) => "Sobre su solicitud de alquiler" + (d ? " del " + d : "") + " · Yachtique", decPre: "Permítanos encontrarle otra opción.",
    waDec: (d) => "Hola Yachtique, ¿podrían sugerirme otro yate" + (d ? " para el " + d : "") + "?",
  },
};
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "")); }
function yachtName(q) { return q.yacht && !/help me choose/i.test(q.yacht) ? esc(q.yacht) : ""; }

/** Confirmation to the client, in the Yachtique look and their language. */
function sendClientConfirmation(q) {
  if (!validEmail(q.email)) return false;
  const L = q.lang === "es" ? "es" : "en", T = TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  const inner =
    eyebrow(T.gotEyebrow) +
    heading(T.thanks + (first ? ", " + esc(first) : "") + ".") +
    para(T.gotP) + rule() + factsBox(q, L) + messageBox(T.note, q.message) +
    eyebrow(T.next) + steps(T.gotSteps) +
    extrasClientNote(q, L) + (wantsFood(q) ? foodBox(L) : "") +
    para(T.sooner, "margin-bottom:18px;font-size:15px") +
    buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waGot(d)), T.chat, true) + button(SITE + "/#fleet", T.fleet, false));
  MailApp.sendEmail({ to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: T.gotSubject(d), htmlBody: layout(T.gotPre, inner, L),
    body: T.thanks + (first ? ", " + first : "") + ".\n\n" + T.gotP + "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co" });
  return true;
}

/** Accepted: the yacht is available. With a price, the client pays the total from the email;
    without one, Nektarios follows up with the final quote. */
function sendClientAccepted(q) {
  if (!validEmail(q.email)) return false;
  const L = q.lang === "es" ? "es" : "en", T = TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  if (q.total > 0) {
    const pay = payUrl(q.ref) + (L === "es" ? "&lang=es" : "");
    const innerPay =
      eyebrow(T.accEyebrow) + heading(T.accHead(esc(first))) +
      para(T.accPPay(yachtName(q), d)) + rule() + factsBox(q, L) + priceBox(q, L) +
      buttons(button(pay, T.payBtn(usd(q.total)), true)) +
      eyebrow(T.next) + steps(T.accStepsPay) +
      para(T.question, "margin-bottom:18px;font-size:15px") +
      buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waAcc(q.ref)), T.chat, false));
    MailApp.sendEmail({ to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: T.accSubjectPay(d), htmlBody: layout(T.accPrePay, innerPay, L),
      body: T.accHead(first) + "\n\n" + T.accPPay(yachtName(q), d).replace(/<[^>]+>/g, "") + "\n\n" + T.total + ": " + usd(q.total) + "\n" + pay +
        "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co" });
    return true;
  }
  const inner =
    eyebrow(T.accEyebrow) + heading(T.accHead(esc(first))) +
    para(T.accP(yachtName(q), d)) + rule() + factsBox(q, L) +
    eyebrow(T.next) + steps(T.accSteps) +
    buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waAcc(q.ref)), T.chat, true));
  MailApp.sendEmail({ to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: T.accSubject(d), htmlBody: layout(T.accPre, inner, L),
    body: T.accHead(first) + "\n\n" + T.accP(yachtName(q), d).replace(/<[^>]+>/g, "") + "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co" });
  return true;
}

// Charter, sales tax and total, in the same rounded box as the facts
function priceBox(q, lang) {
  const T = TXT[lang === "es" ? "es" : "en"];
  const off = Number(q.discount) || 0;
  const rows = off > 0
    ? [[T.charter, usd(q.price + off), false], [T.discount(Math.round(off / (q.price + off) * 100)), "&minus;" + usd(off), false]]
    : [[T.charter, usd(q.price), false]];
  const grat = q.gratuity || 0;
  if (cents(grat) > 0) rows.push([T.gratuity(Math.round(grat / q.price * 100)), usd(grat), false]);
  (q.extraItems || []).forEach(function (x) { rows.push([extraName(x.name, lang), usd(x.amount), false]); });
  const xt = Number(q.extrasTotal) || 0;
  const fee = Number(q.fee) || 0;
  if (cents(fee) > 0) rows.push([T.fee(+(fee / (q.price + grat + xt) * 100).toFixed(1).replace(/\.0$/, "")), usd(fee), false]);
  if (cents(q.total) > cents(q.price + grat + xt + fee)) rows.push([T.tax(+(TAX_RATE * 100).toFixed(2)), usd(q.total - q.price - grat - xt - fee), false]);
  rows.push([T.total, usd(q.total), true]);
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;border:1px solid ' + C.gold + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '">' +
    rows.map((r, i) => '<tr><td style="padding:' + (r[2] ? "16px" : "12px") + ' 20px;border-top:' + (i ? "1px solid " + C.line : "0") + ';font-family:' + SANS + ';font-size:' + (r[2] ? "12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:" + C.gold : "15px;color:" + C.text) + '">' + esc(r[0]) + "</td>" +
      '<td align="right" style="padding:' + (r[2] ? "16px" : "12px") + ' 20px;border-top:' + (i ? "1px solid " + C.line : "0") + ';font-family:' + SERIF + ';font-size:' + (r[2] ? "22px" : "16px") + ';font-weight:600;color:' + C.white + ';white-space:nowrap">' + r[1] + "</td></tr>").join("") +
    "</table>";
}

/** Paid: thank the client; the final confirmation follows once YCN confirms the yacht. */
function sendClientPaid(q) {
  if (!validEmail(q.email)) return false;
  const L = q.lang === "es" ? "es" : "en", T = TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  const amount = usd(q.amountPaid || q.total);
  const inner =
    eyebrow(T.paidEyebrow + " &middot; " + esc(q.ref)) + heading(T.paidHead(esc(first))) +
    para(T.paidP(amount)) + rule() + factsBox(q, L) + priceBox(q, L) +
    eyebrow(T.next) + steps(T.paidSteps) + foodBox(L) +
    buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waAcc(q.ref)), T.chat, true));
  MailApp.sendEmail({ to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: T.paidSubject(d), htmlBody: layout(T.paidPre, inner, L),
    body: T.paidHead(first) + "\n\n" + T.paidP(amount).replace(/<[^>]+>/g, "") + "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co",
    attachments: calendarFile(q) });
  return true;
}

/** Alert to Yachtique: the client paid, so reserve the yacht with YCN now. `to`/`cc` are only changed by testEmails(). */
function sendOwnerPaid(q, to, cc) {
  const phone = String(q.phone || "").replace(/\D/g, "");
  const stripePaid = /^(pi|cs|py|ch)_/.test(String(q.payment || ""));
  const amount = usd(q.amountPaid || q.total);
  const inner =
    eyebrow("Payment received &middot; " + esc(q.ref)) +
    heading(esc(q.name || "Client") + " paid " + amount) +
    para((stripePaid ? "Paid by card through Stripe." : "Paid by " + esc(q.payment) + ", marked on the Accept page.") + " The Status in the sheet is now <b>Paid</b>.", "margin-bottom:22px") + rule() +
    factsBox(q) + priceBox(q, "en") +
    eyebrow("Next") +
    steps([["Reserve with YCN now.", "Message Laurent and pay the $500 broker deposit."], ["Confirm to the client.", "Only after YCN confirms the yacht. Then set the Status to Booked."],
      ["72 hours before.", "Pay YCN the balance. The day before, send the client the marina, time and rules."]]) +
    buttons(
      (phone ? button("https://wa.me/" + phone, "WhatsApp " + (firstName(q) || "client"), true) : "") +
      (stripePaid ? button("https://dashboard.stripe.com/payments/" + encodeURIComponent(q.payment || ""), "See it in Stripe", !phone) : "") +
      button(SpreadsheetApp.getActiveSpreadsheet().getUrl(), "Open the sheet", false));
  sendAlert({
    name: "Yachtique Payments",
    subject: q.ref + " · PAID " + amount + " · " + (q.name || "client") + " · " + prettyDate(q.date),
    htmlBody: layout((q.name || "A client") + " paid " + amount + ". Reserve with YCN now.", inner),
    body: (q.name || "A client") + " paid " + amount + " for " + q.ref + " (" + prettyDate(q.date) + ", " + q.yacht + ").\nNext: reserve with YCN, then confirm to the client.",
  }, to, cc);
}

/** Declined: not available; point them to the yachts that are free that day. */
function sendClientDeclined(q) {
  if (!validEmail(q.email)) return false;
  const L = q.lang === "es" ? "es" : "en", T = TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  const freeLink = SITE + "/?" + (q.date ? "date=" + q.date + "&" : "") + (/^\d+$/.test(q.guests) ? "guests=" + q.guests + "&" : "") + "lang=" + L + "#fleet";
  const inner =
    eyebrow(T.decEyebrow) + heading(T.decHead(esc(first))) +
    para(T.decP(yachtName(q), d)) + rule() + factsBox(q, L) +
    buttons(button(freeLink, T.decFree, true) + button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waDec(d)), T.chat, false));
  MailApp.sendEmail({ to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: T.decSubject(d), htmlBody: layout(T.decPre, inner, L),
    body: T.decHead(first) + "\n\n" + T.decP(yachtName(q), d).replace(/<[^>]+>/g, "") + "\n\n" + freeLink + "\n\nYachtique · Miami, Florida · yachtique.co" });
  return true;
}

/* =================== Automations ===================
   Run by two timers that Nektarios turns on once (select installTriggers, press Run, while signed in as yachtiquemiami@gmail.com):
   - hourly(): unpaid reminders, the trip emails, YCN reminders and review requests. Client emails only go out 9am to 8pm Miami time.
   - weeklySummary(): Monday 8am, the week in numbers to Yachtique (and ALERT_CC).
   Each email is sent once per enquiry: the "Emails sent" column remembers which ones went out.
   Rows whose name starts with TEST are left out of the summary. */

const TZ = "America/New_York";
const REVIEW_URL = "";   // Google review link for Yachtique. Review requests start the day after a charter once this is filled in.
const RULES = {
  en: [["Arrive 15 minutes early.", "Your time starts at the booked departure time."], ["No red wine or glass on board.", "Spirits, beer and white wine are welcome; guests must be 21 or older to drink."],
    ["No smoking.", "Vapes only if the captain allows it."], ["Children under 13", "wear a life jacket while the yacht is moving."]],
  es: [["Llegue 15 minutos antes.", "Su tiempo empieza a la hora de salida reservada."], ["Sin vino tinto ni vidrio a bordo.", "Licores, cerveza y vino blanco son bienvenidos; para beber alcohol hay que tener 21 años o más."],
    ["No se permite fumar.", "Vapeadores solo si el capitán lo permite."], ["Los niños menores de 13 años", "llevan chaleco salvavidas mientras el yate navega."]],
};
const AUTO_TXT = {
  en: {
    unpaidEyebrow: "Your charter", unpaidHead: (n) => "Still planning your day" + (n ? ", " + n : "") + "?",
    unpaidP: (y, d) => (y ? "<b>" + y + "</b> is" : "Your yacht is") + " still available" + (d ? " on " + d : "") + ", but it isn't reserved until payment is received. Secure your date below, or message Nektarios with any questions.",
    unpaidSubject: (d) => "Your charter" + (d ? " on " + d : "") + " is not reserved yet · Yachtique", unpaidPre: "Secure your date with the payment link.",
    trip3Eyebrow: "3 days to go", trip3Head: (n) => "Almost time" + (n ? ", " + n : "") + ".",
    trip3P: (y, d) => "Your charter" + (y ? " on <b>" + y + "</b>" : "") + (d ? " is on " + d : "") + ". The day before, you'll receive the marina, the departure time and the captain's contact. A few things to plan for:",
    trip3Subject: (d) => "3 days to your charter" + (d ? " on " + d : "") + " · Yachtique", trip3Pre: "A few things to plan for.",
    dayEyebrow: "Tomorrow", dayHead: (n) => "See you on board" + (n ? ", " + n : "") + ".",
    dayP: "Here's everything for tomorrow. The calendar file attached has the time and the marina.",
    departure: "Departure", start: "Time", dayRules: "Before you go",
    daySubject: (d) => "Tomorrow: your charter details" + (d ? " for " + d : "") + " · Yachtique", dayPre: "Marina, time and what to know.",
    reviewEyebrow: "Thank you", reviewHead: (n) => "We hope you loved it" + (n ? ", " + n : "") + ".",
    reviewP: "Thank you for sailing with Yachtique. If you have a minute, a short Google review helps other guests find us, and it means a lot to our small team.",
    reviewBtn: "Leave a review", reviewSubject: "How was your day on the water? · Yachtique", reviewPre: "A minute of your time means a lot.",
    calTitle: (y) => "Yacht charter" + (y ? " · " + y : "") + " · Yachtique",
  },
  es: {
    unpaidEyebrow: "Su alquiler", unpaidHead: (n) => "¿Sigue planeando su día" + (n ? ", " + n : "") + "?",
    unpaidP: (y, d) => (y ? "<b>" + y + "</b> sigue" : "Su yate sigue") + " disponible" + (d ? " el " + d : "") + ", pero no queda reservado hasta recibir el pago. Reserve su fecha a continuación o escriba a Nektarios si tiene preguntas.",
    unpaidSubject: (d) => "Su alquiler" + (d ? " del " + d : "") + " aún no está reservado · Yachtique", unpaidPre: "Reserve su fecha con el enlace de pago.",
    trip3Eyebrow: "Faltan 3 días", trip3Head: (n) => "Ya casi" + (n ? ", " + n : "") + ".",
    trip3P: (y, d) => "Su alquiler" + (y ? " en <b>" + y + "</b>" : "") + (d ? " es el " + d : "") + ". El día antes recibirá la marina, la hora de salida y el contacto del capitán. Algunas cosas a tener en cuenta:",
    trip3Subject: (d) => "Faltan 3 días para su alquiler" + (d ? " del " + d : "") + " · Yachtique", trip3Pre: "Algunas cosas a tener en cuenta.",
    dayEyebrow: "Mañana", dayHead: (n) => "Nos vemos a bordo" + (n ? ", " + n : "") + ".",
    dayP: "Aquí tiene todo para mañana. El archivo de calendario adjunto incluye la hora y la marina.",
    departure: "Salida", start: "Hora", dayRules: "Antes de ir",
    daySubject: (d) => "Mañana: los detalles de su alquiler" + (d ? " del " + d : "") + " · Yachtique", dayPre: "Marina, hora y lo que debe saber.",
    reviewEyebrow: "Gracias", reviewHead: (n) => "Esperamos que lo haya disfrutado" + (n ? ", " + n : "") + ".",
    reviewP: "Gracias por navegar con Yachtique. Si tiene un minuto, una breve reseña en Google ayuda a otros huéspedes a encontrarnos y significa mucho para nuestro pequeño equipo.",
    reviewBtn: "Dejar una reseña", reviewSubject: "¿Qué tal su día en el agua? · Yachtique", reviewPre: "Un minuto de su tiempo significa mucho.",
    calTitle: (y) => "Alquiler de yate" + (y ? " · " + y : "") + " · Yachtique",
  },
};

/** Run once, signed in as yachtiquemiami@gmail.com, so the emails go out from Yachtique's account. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (["hourly", "weeklySummary"].indexOf(t.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("hourly").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("weeklySummary").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).inTimezone(TZ).create();
}

// Every inquiry row as an object, with the dates the automations need
// Test rows: "test" in the name, or one of our own addresses as the client's (Sotiris, Yachtique, Nektarios's personal;
// typos like gmal.com included).
// They get no reminders and stay out of the weekly summary.
function isTest(q) {
  const email = String(q.email || "").toLowerCase();
  return /\btest\b/i.test(q.name) || /^(tsirkoudis7|yachtiquemiami|nektariospapa)@/.test(email);
}

function allEnquiries() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiries");
  addNewColumns(sheet);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const ymd = (x) => x instanceof Date ? Utilities.formatDate(x, TZ, "yyyy-MM-dd") : String(x || "");
  return sheet.getRange(2, 1, last - 1, COL.SENT).getValues().map((v, i) => ({
    sheet: sheet, row: i + 2,
    ref: String(v[COL.REF - 1] || ""), status: String(v[COL.STATUS - 1] || ""), name: String(v[COL.NAME - 1] || ""),
    phone: String(v[COL.PHONE - 1] || ""), email: String(v[COL.EMAIL - 1] || ""), date: ymd(v[COL.DATE - 1]),
    guests: String(v[COL.GUESTS - 1] || ""), duration: String(v[COL.DURATION - 1] || ""), yacht: String(v[COL.YACHT - 1] || ""),
    lang: /span/i.test(String(v[COL.LANG - 1])) ? "es" : "en",
    received: v[COL.RECEIVED - 1] instanceof Date ? v[COL.RECEIVED - 1] : null,
    decidedAt: v[COL.DECIDED - 1] instanceof Date ? v[COL.DECIDED - 1] : null,
    paidAt: v[COL.PAID - 1] instanceof Date ? v[COL.PAID - 1] : null,
    price: Number(v[COL.PRICE - 1]) || 0, total: Number(v[COL.TOTAL - 1]) || 0, gratuity: Number(v[COL.GRATUITY - 1]) || 0,
    departure: String(v[COL.DEPARTURE - 1] || "").trim(), start: startTime(v[COL.START - 1]),
    sent: String(v[COL.SENT - 1] || "").split(/\s*,\s*/).filter(Boolean),
  })).filter((q) => q.ref);
}

// "14:00" from a time cell or text like "2pm", "2:30 PM", "14:30"; "" when there isn't one
function startTime(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, "HH:mm");
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(String(v || "").trim().replace(/\./g, ""));
  if (!m) return "";
  let h = +m[1];
  if (m[3] && /pm/i.test(m[3]) && h < 12) h += 12;
  if (m[3] && /am/i.test(m[3]) && h === 12) h = 0;
  return h > 23 ? "" : ("0" + h).slice(-2) + ":" + (m[2] || "00");
}

function niceTime(hhmm, lang) {
  const p = hhmm.split(":").map(Number);
  if (lang === "es") return hhmm;
  return ((p[0] + 11) % 12 + 1) + (p[1] ? ":" + ("0" + p[1]).slice(-2) : "") + (p[0] < 12 ? " am" : " pm");
}

function markSent(q, key) {
  q.sent.push(key);
  q.sheet.getRange(q.row, COL.SENT).setValue(q.sent.join(", "));
}

/** Every hour: the emails that depend on time. */
function hourly() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const now = new Date();
    const hour = Number(Utilities.formatDate(now, TZ, "H"));
    const daytime = hour >= 9 && hour < 20;
    allEnquiries().filter((q) => !isTest(q)).forEach((q) => {
      try { runAutomations(q, now, daytime); } catch (err) { console.error(q.ref + ": " + err); }
    });
  } finally {
    lock.releaseLock();
  }
}

function runAutomations(q, now, daytime) {
  const d = daysUntil(q.date);
  const has = (k) => q.sent.indexOf(k) > -1;
  const hoursSince = (t) => t ? (now - t) / 3600000 : 0;

  // Accepted with a price but not paid: one reminder to the client, then a note to Yachtique
  if (/^accepted$/i.test(q.status) && q.total > 0 && q.decidedAt && (d === null || d >= 0)) {
    const h = hoursSince(q.decidedAt), soon = d !== null && d <= 3;
    if (!has("unpaid") && daytime && (h >= 24 || (soon && h >= 3))) {
      const emailed = sendClientUnpaid(q);
      sendOwnerNote(q, "Payment reminder sent", esc(q.name || "The client") + " hasn't paid " + usd(q.total) + " yet" +
        (emailed ? ", so they got a reminder with the payment link." : ". They have no valid email, so send the payment link on WhatsApp."),
        [["Follow up on WhatsApp", "if they don't pay today."], ["Not going ahead?", "Set the Status to Lost."]]);
      markSent(q, "unpaid");
    } else if (has("unpaid") && !has("unpaid2") && (h >= 72 || (soon && h >= 24))) {
      sendOwnerNote(q, "Still unpaid", esc(q.name || "The client") + " still hasn't paid " + usd(q.total) + ". The yacht isn't reserved with YCN.",
        [["Call or WhatsApp them.", "Ask if they still want the date."], ["No answer?", "Set the Status to Lost."]]);
      markSent(q, "unpaid2");
    }
  }

  if (!/^(paid|booked)$/i.test(q.status) || d === null) return;

  // 3 days before: what to plan for (client) and the YCN balance (Yachtique)
  if (d <= 3 && d >= 2 && !has("trip3") && daytime) {
    sendClientTrip3(q);
    markSent(q, "trip3");
  }
  if (d <= 3 && d >= 0 && !has("ycn")) {
    sendOwnerNote(q, "Pay YCN the balance", "The charter is " + (d === 0 ? "today" : d === 1 ? "tomorrow" : "in " + d + " days") + ". YCN's balance is due 72 hours before departure.",
      [["Pay YCN the balance.", "Through the broker page or with Laurent."], ["Fill in Departure and Start time", "in the sheet, so the client gets the details the day before."]]);
    markSent(q, "ycn");
  }

  // The day before: marina, time, captain (needs Departure and Start time in the sheet)
  if (d === 1 && !has("day1") && daytime) {
    if (q.departure && q.start) {
      sendClientDayBefore(q);
      markSent(q, "day1");
    } else if (!has("day1missing")) {
      sendOwnerNote(q, "Add the departure details", "The charter is tomorrow, but the sheet has no " + (!q.departure && !q.start ? "Departure or Start time" : !q.departure ? "Departure" : "Start time") +
        ". Fill " + (!q.departure && !q.start ? "them" : "it") + " in and the client gets the details within the hour.", [["Departure:", "the marina or address (from YCN)."], ["Start time:", "for example 2pm."]]);
      markSent(q, "day1missing");
    }
  }

  // More time on board: the link about an hour before the start (it works until the charter ends), and
  // "Want more time?" about an hour before the end (any hour: they are on board). Needs Start time and a duration in hours.
  const hrs = parseInt(q.duration, 10);
  const startAt = q.start ? q.start.split(":").map(Number) : null;
  const mins = Number(Utilities.formatDate(now, TZ, "H")) * 60 + Number(Utilities.formatDate(now, TZ, "m"));
  if (EXTENSIONS_ON && d === 0 && startAt && hrs > 0 && !has("ext0")) {
    const toStart = startAt[0] * 60 + startAt[1] - mins;
    if (toStart <= 90 && toStart >= 20) {
      sendClientExtendOffer(q, true);
      markSent(q, "ext0");
    }
  }
  if (EXTENSIONS_ON && d === 0 && startAt && hrs > 0 && !has("ext")) {
    const p = startAt;
    const left = p[0] * 60 + p[1] + hrs * 60 - mins;
    if (left <= 90 && left >= 20) {
      const emailed = sendClientExtendOffer(q);
      const phone = String(q.phone || "").replace(/\D/g, "");
      const wa = (q.lang === "es" ? "¿Quiere más tiempo en el yate? Añádalo aquí: " : "Want more time on the yacht? Add it here: ") + extUrl(q.ref, q.lang);
      sendOwnerNote(q, "More time offer sent", (emailed ? esc(q.name || "The client") + " got the \u201cWant more time?\u201d email." : "No valid email for the client.") +
        " The charter ends in about " + Math.round(left / 10) * 10 + " minutes. Send the link on WhatsApp too, so they see it on board." +
        (phone ? ' <a href="https://wa.me/' + phone + "?text=" + encodeURIComponent(wa) + '" style="color:' + C.gold + '">Send it on WhatsApp</a>' : ""),
        [["If they ask for more time,", "you get an email with Confirm and Not possible."]]);
      markSent(q, "ext");
    }
  }

  // The day after: review request (only once REVIEW_URL is set)
  if (REVIEW_URL && d <= -1 && d >= -3 && !has("review") && daytime) {
    sendClientReview(q);
    markSent(q, "review");
  }
}

function clientMail(q, subject, pre, inner, text, attachments) {
  if (!validEmail(q.email)) return false;
  const msg = { to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: subject, htmlBody: layout(pre, inner, q.lang),
    body: text + "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co" };
  if (attachments) msg.attachments = attachments;
  MailApp.sendEmail(msg);
  return true;
}

function sendClientUnpaid(q) {
  const L = q.lang, T = TXT[L], A = AUTO_TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  const pay = payUrl(q.ref) + (L === "es" ? "&lang=es" : "");
  const inner = eyebrow(A.unpaidEyebrow + " &middot; " + esc(q.ref)) + heading(A.unpaidHead(esc(first))) + para(A.unpaidP(yachtName(q), d)) + rule() +
    factsBox(q, L) + priceBox(q, L) + buttons(button(pay, T.payBtn(usd(q.total)), true)) +
    buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waAcc(q.ref)), T.chat, false));
  return clientMail(q, A.unpaidSubject(d), A.unpaidPre, inner, A.unpaidHead(first) + "\n\n" + A.unpaidP(yachtName(q), d).replace(/<[^>]+>/g, "") + "\n\n" + pay);
}

// "Food on board": Yacht Bites boards delivered to the yacht, with the menu button
function foodBox(lang) {
  const es = lang === "es";
  return eyebrow(es ? "Comida a bordo" : "Food on board") +
    para(es ? "Tablas de chef, sliders y sushi de <b>Yacht Bites</b>, entregados en el muelle antes de zarpar. Pida antes de las 4 p. m. del día anterior."
      : "Chef-made boards, sliders and sushi from <b>Yacht Bites</b>, delivered to the dock before you sail. Order by 4pm the day before.", "margin-bottom:16px") +
    buttons(button(FOOD_URL, es ? "Ver el menú" : "See the menu", false));
}

function sendClientTrip3(q) {
  const L = q.lang, T = TXT[L], A = AUTO_TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  const inner = eyebrow(A.trip3Eyebrow + " &middot; " + esc(q.ref)) + heading(A.trip3Head(esc(first))) + para(A.trip3P(yachtName(q), d)) + rule() +
    factsBox(q, L) + steps(RULES[L]) + foodBox(L) + buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waAcc(q.ref)), T.chat, true));
  return clientMail(q, A.trip3Subject(d), A.trip3Pre, inner, A.trip3Head(first) + "\n\n" + A.trip3P(yachtName(q), d).replace(/<[^>]+>/g, "") + "\n\n" +
    RULES[L].map((r) => "- " + r[0] + " " + r[1]).join("\n"));
}

function sendClientDayBefore(q) {
  const L = q.lang, T = TXT[L], A = AUTO_TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  const map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q.departure);
  const where = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;border:1px solid ' + C.gold + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '">' +
    [[A.start, niceTime(q.start, L)], [A.departure, q.departure]].map((r, i) =>
      '<tr><td align="center" style="padding:16px 14px;border-top:' + (i ? "1px solid " + C.line : "0") + '"><div style="font-family:' + SANS + ';font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:' + C.gold + ';padding-bottom:6px">' + esc(r[0]) + '</div>' +
      '<div style="font-family:' + SERIF + ';font-size:19px;font-weight:600;line-height:1.35;color:' + C.white + '">' + esc(r[1]) + "</div></td></tr>").join("") + "</table>";
  const inner = eyebrow(A.dayEyebrow + " &middot; " + esc(q.ref)) + heading(A.dayHead(esc(first))) + para(A.dayP) + rule() + where +
    buttons(button(map, L === "es" ? "Abrir en Maps" : "Open in Maps", true) + button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waAcc(q.ref)), T.chat, false)) +
    eyebrow(A.dayRules) + steps(RULES[L]);
  return clientMail(q, A.daySubject(d), A.dayPre, inner, A.dayHead(first) + "\n\n" + A.start + ": " + niceTime(q.start, L) + "\n" + A.departure + ": " + q.departure + "\n" + map, calendarFile(q));
}

function sendClientReview(q) {
  const L = q.lang, A = AUTO_TXT[L], first = firstName(q);
  const inner = eyebrow(A.reviewEyebrow) + heading(A.reviewHead(esc(first))) + para(A.reviewP) + buttons(button(REVIEW_URL, A.reviewBtn, true));
  return clientMail(q, A.reviewSubject, A.reviewPre, inner, A.reviewHead(first) + "\n\n" + A.reviewP + "\n\n" + REVIEW_URL);
}

/** Short alert to Yachtique about one inquiry. */
function sendOwnerNote(q, title, text, todo, to, cc) {
  const phone = String(q.phone || "").replace(/\D/g, "");
  const inner = eyebrow(esc(title) + " &middot; " + esc(q.ref)) + heading(esc(q.name || "Client")) + para(text, "margin-bottom:22px") + rule() +
    factsBox(q) + (q.total ? priceBox(q, "en") : "") + (todo ? eyebrow("Next") + steps(todo) : "") +
    buttons((phone ? button("https://wa.me/" + phone, "WhatsApp " + (firstName(q) || "client"), true) : "") +
      // Waiting for payment: one tap if the client paid by Zelle instead
      (/^accepted$/i.test(q.status) && q.ref ? button(decideUrl(q.ref, "zelle"), "Paid by Zelle?", false) : "") +
      button(SpreadsheetApp.getActiveSpreadsheet().getUrl(), "Open the sheet", !phone));
  sendAlert({ name: "Yachtique", subject: q.ref + " · " + title + " · " + (q.name || "client") + " · " + prettyDate(q.date),
    htmlBody: layout(title + ": " + (q.name || "client"), inner), body: title + " (" + q.ref + "): " + text.replace(/<[^>]+>/g, "") }, to, cc);
}

/** Calendar file (.ics) for the charter: with the time and marina once known, otherwise an all-day event. */
function calendarFile(q) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(q.date))) return undefined;
  const A = AUTO_TXT[q.lang === "es" ? "es" : "en"];
  const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  const day = q.date.replace(/-/g, "");
  const yacht = String(q.yacht || "").replace(/\s*\(.*$/, "").replace(/help me choose/i, "").trim();
  let when;
  if (q.start) {
    const p = q.start.split(":").map(Number), hours = parseInt(q.duration, 10) || 4;
    const end = p[0] * 60 + p[1] + hours * 60;
    const endDay = end >= 1440 ? Utilities.formatDate(new Date(Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6) + 1)), "UTC", "yyyyMMdd") : day;
    const hm = (m) => ("0" + Math.floor((m % 1440) / 60)).slice(-2) + ("0" + (m % 60)).slice(-2) + "00";
    when = "DTSTART;TZID=" + TZ + ":" + day + "T" + hm(p[0] * 60 + p[1]) + "\r\nDTEND;TZID=" + TZ + ":" + endDay + "T" + hm(end);
  } else {
    const next = Utilities.formatDate(new Date(Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6) + 1)), "UTC", "yyyyMMdd");
    when = "DTSTART;VALUE=DATE:" + day + "\r\nDTEND;VALUE=DATE:" + next;
  }
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Yachtique//Charter//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    "UID:" + q.ref + "@yachtique.co", "DTSTAMP:" + Utilities.formatDate(new Date(), "UTC", "yyyyMMdd'T'HHmmss'Z'"), when,
    "SUMMARY:" + icsText(A.calTitle(yacht)), q.departure ? "LOCATION:" + icsText(q.departure) : "",
    "DESCRIPTION:" + icsText(q.ref + " · " + [q.duration, q.guests ? q.guests + (q.lang === "es" ? " invitados" : " guests") : ""].filter(Boolean).join(" · ") + "\nWhatsApp +1 (305) 812-4721 · yachtique.co"),
    "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  return [Utilities.newBlob(ics, "text/calendar", "yachtique-charter.ics")];
}

/** Monday 8am (timer): the last 7 days in numbers, plus what's coming up. */
function weeklySummary() { sendWeeklySummary(); }

// `to`/`cc` are only changed by testAutomations()
function sendWeeklySummary(to, cc) {
  const now = new Date(), weekAgo = new Date(now.getTime() - 7 * 86400000);
  const rows = allEnquiries().filter((q) => !isTest(q) && !/^lost$/i.test(q.status));
  const inWeek = (t) => t && t >= weekAgo && t <= now;
  const got = rows.filter((q) => inWeek(q.received));
  const decided = rows.filter((q) => inWeek(q.decidedAt));
  const paid = rows.filter((q) => inWeek(q.paidAt));
  const revenue = paid.reduce((s, q) => s + q.total, 0), tips = paid.reduce((s, q) => s + q.gratuity, 0);
  const upcoming = rows.filter((q) => /^(paid|booked)$/i.test(q.status) && daysUntil(q.date) !== null && daysUntil(q.date) >= 0 && daysUntil(q.date) <= 14)
    .sort((a, b) => a.date < b.date ? -1 : 1);
  const unpaid = rows.filter((q) => /^accepted$/i.test(q.status) && q.total > 0 && (daysUntil(q.date) === null || daysUntil(q.date) >= 0));
  const fresh = rows.filter((q) => /^new$/i.test(q.status));

  // Website: views, WhatsApp taps and the most viewed yachts (live site only)
  const ev = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Events");
  let views = 0, taps = 0; const yachts = {};
  if (ev && ev.getLastRow() > 1) {
    ev.getRange(2, 1, ev.getLastRow() - 1, 9).getValues().forEach((e) => {
      if (!(e[0] instanceof Date) || e[0] < weekAgo || e[8] !== "yachtique.co") return;
      if (e[1] === "view") { views++; if (e[3]) yachts[e[3]] = (yachts[e[3]] || 0) + 1; }
      if (e[1] === "whatsapp") taps++;
    });
  }
  const top = Object.keys(yachts).sort((a, b) => yachts[b] - yachts[a]).slice(0, 5);

  const stat = (label, value) => '<td width="33%" align="center" valign="top" style="padding:16px 8px"><div style="font-family:' + SERIF + ';font-size:26px;font-weight:600;color:' + C.white + '">' + value + '</div>' +
    '<div style="font-family:' + SANS + ';font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + C.gold + ';padding-top:6px">' + label + "</div></td>";
  const box = (cells) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid ' + C.line + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '"><tr>' + cells + "</tr></table>";
  const list = (title, items) => items.length ? eyebrow(title, "left") +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ' + C.line + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '">' +
    items.map((t, i) => '<tr><td style="padding:12px 18px;border-top:' + (i ? "1px solid " + C.line : "0") + ';font-family:' + SANS + ';font-size:14px;line-height:1.5;color:' + C.text + '">' + t + "</td></tr>").join("") + "</table>" : "";
  const line = (q) => "<b style=\"color:" + C.white + "\">" + esc(prettyDate(q.date)) + "</b> &middot; " + esc(String(q.yacht).replace(/\s*\(.*$/, "") || "Yacht to choose") + " &middot; " + esc(q.name) + (q.total ? " &middot; " + usd(q.total) : "") + " &middot; " + esc(q.ref);

  const inner = eyebrow("Weekly summary") + heading("Your week at Yachtique") +
    para(Utilities.formatDate(weekAgo, TZ, "MMM d") + " to " + Utilities.formatDate(now, TZ, "MMM d, yyyy"), "margin-bottom:22px") + rule() +
    box(stat("Enquiries", got.length) + stat("Accepted", decided.filter((q) => !/^declined$/i.test(q.status)).length) + stat("Paid", paid.length)) +
    box(stat("Revenue", usd(revenue).replace(/\.00$/, "")) + stat("Gratuity for crews", usd(tips).replace(/\.00$/, "")) + stat("Site views", views)) +
    box(stat("WhatsApp taps", taps) + stat("Waiting to pay", unpaid.length) + stat("Not answered", fresh.length)) +
    list("Coming up (next 14 days)", upcoming.map(line)) +
    list("Accepted, not paid", unpaid.map(line)) +
    list("Not answered yet", fresh.map((q) => esc(q.name) + " &middot; " + esc(prettyDate(q.date)) + " &middot; " + esc(q.ref))) +
    list("Most viewed yachts", top.map((y) => esc(y) + " &middot; " + yachts[y] + (yachts[y] === 1 ? " view" : " views"))) +
    buttons(button(SpreadsheetApp.getActiveSpreadsheet().getUrl(), "Open the sheet", true));
  sendAlert({ name: "Yachtique", subject: "Your week at Yachtique · " + got.length + " inquiries · " + paid.length + " paid · " + usd(revenue).replace(/\.00$/, ""),
    htmlBody: layout("Inquiries, payments and what's coming up.", inner),
    body: "Inquiries " + got.length + ", paid " + paid.length + ", revenue " + usd(revenue) + ". Coming up: " + upcoming.length + ". Waiting to pay: " + unpaid.length + "." }, to, cc);
}

/**
 * TEST: run from the Apps Script editor (select testEmails, press Run).
 * Sends every email to TEST_TO only: the alerts (new inquiry, paid), then the client confirmation, accepted
 * (without and with the Pay button), paid and declined emails in English and in Spanish. Nothing is added to the sheet and no client is emailed.
 */
const TEST_TO = "yachtiquemiami@gmail.com";
function testEmails() {
  const inThreeDays = Utilities.formatDate(new Date(Date.now() + 3 * 86400000), "America/New_York", "yyyy-MM-dd");
  const sample = { ref: "YQ-TEST", name: "Alex Morgan", phone: "+1 305 555 0123", email: TEST_TO, date: inThreeDays, guests: "8",
    duration: "4 hours", yacht: "Four Keeps (38ft Axopar)", extras: "Catering, Transport", gratuityChoice: "18%", message: "Birthday on board for my wife. Sunset if possible!", lang: "en" };
  sendOwnerAlert(sample, TEST_TO, "");
  const priced = { price: 2690, gratuity: 484.2, total: cents((2690 + 484.2) * (1 + TAX_RATE)) / 100 };
  sendOwnerPaid(Object.assign({}, sample, priced, { payment: "pi_test" }), TEST_TO, "");
  ["en", "es"].forEach((L) => {
    const q = Object.assign({}, sample, { lang: L, name: L === "es" ? "Sofía Martínez" : sample.name });
    sendClientConfirmation(q);
    sendClientAccepted(q);
    sendClientAccepted(Object.assign({}, q, priced));
    sendClientPaid(Object.assign({}, q, priced));
    sendClientDeclined(q);
  });
}

/** TEST: the automatic emails (unpaid, 3 days, day before with calendar file, review) in both languages, plus the owner notes
    and this week's real summary, all to TEST_TO. Nothing in the sheet changes. */
function testAutomations() {
  const sample = { ref: "YQ-TEST", name: "Alex Morgan", phone: "+1 305 555 0123", email: TEST_TO, date: Utilities.formatDate(new Date(Date.now() + 86400000), TZ, "yyyy-MM-dd"),
    guests: "8", duration: "4 hours", yacht: "Four Keeps (38ft Axopar)", price: 2690, gratuity: 484.2, total: cents((2690 + 484.2) * (1 + TAX_RATE)) / 100,
    departure: "Miami Beach Marina, 300 Alton Rd, Miami Beach", start: "14:00", lang: "en" };
  ["en", "es"].forEach((L) => {
    const q = Object.assign({}, sample, { lang: L, name: L === "es" ? "Sofía Martínez" : sample.name });
    sendClientUnpaid(q);
    sendClientTrip3(q);
    sendClientDayBefore(q);
    if (REVIEW_URL) sendClientReview(q);
  });
  sendOwnerNote(sample, "Pay YCN the balance", "The charter is in 3 days. YCN's balance is due 72 hours before departure.",
    [["Pay YCN the balance.", "Through the broker page or with Laurent."]], TEST_TO, "");
  sendWeeklySummary(TEST_TO, "");
}


/* =================== Extras: DJ, decorations, security, transport... ===================
   The client ticks them on the form ("Add to your day"). Food on board is Yacht Bites, ordered by the client on
   Nektarios's partner link (the menu button is in their first email). Everything else Nektarios quotes:
   the new-inquiry alert has a "Ask for a quote" button per extra, to the vendor in the Vendors tab, with the
   date, time, guests and marina written. He types each vendor's price on the Accept page; it goes on the
   client's payment as its own line (column Extras price: "DJ: 800; Decorations: 450") and Yachtique pays the vendor. */

const VENDOR_HEADERS = ["Extra", "Company", "Contact name", "WhatsApp", "Email", "Notes"];
const VENDOR_EXTRAS = ["DJ", "Decorations", "Security", "Transport", "Photographer", "Water toys"];
const EXTRA_ES = { "Food on board": "Comida a bordo", "Transport": "Transporte", "Decorations": "Decoración", "DJ": "DJ",
  "Water toys": "Juguetes acuáticos", "Photographer": "Fotógrafo", "Security": "Seguridad" };

function extraName(name, lang) { return lang === "es" && EXTRA_ES[name] ? EXTRA_ES[name] : name; }
function tickedExtras(q) { return String(q.extras || "").split(/\s*,\s*/).filter(Boolean); }
function wantsFood(q) { return tickedExtras(q).some(function (x) { return /food|catering/i.test(x); }); }
function quoteExtras(q) { return tickedExtras(q).filter(function (x) { return !/food|catering/i.test(x); }); }

/** The Vendors tab (created with one empty row per extra the first time it's needed). */
function vendorsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("Vendors");
  if (sh) return sh;
  sh = ss.insertSheet("Vendors");
  sh.getRange(1, 1, 1, VENDOR_HEADERS.length).setValues([VENDOR_HEADERS]);
  styleHeader(sh, VENDOR_HEADERS.length);
  sh.getRange(2, 1, VENDOR_EXTRAS.length, 1).setValues(VENDOR_EXTRAS.map(function (x) { return [x]; }));
  sh.setColumnWidths(1, VENDOR_HEADERS.length, 170);
  sh.setColumnWidth(6, 320);
  sh.getRange(2, 4, VENDOR_EXTRAS.length + 50, 1).setNumberFormat("@");
  sh.setFrozenRows(1);
  return sh;
}

/** { "dj": { company, contact, whatsapp, email } } from the Vendors tab (first row per extra wins). */
function vendors() {
  const out = {};
  try {
    const rows = vendorsSheet().getDataRange().getValues().slice(1);
    rows.forEach(function (r) {
      const key = String(r[0] || "").trim().toLowerCase();
      if (!key || out[key] || !(r[1] || r[3] || r[4])) return;
      out[key] = { company: String(r[1] || "").trim(), contact: String(r[2] || "").trim(), whatsapp: String(r[3] || "").replace(/\D/g, ""), email: String(r[4] || "").trim() };
    });
  } catch (err) { console.error("Vendors tab: " + err); }
  return out;
}

// The quote request Nektarios sends a vendor: no client name or contact, only what the vendor needs
function vendorRequest(q, extra, v) {
  const hi = v && v.contact ? "Hi " + v.contact.split(/\s+/)[0] : "Hi";
  return hi + ", this is Nektarios from Yachtique. Could you send me a quote for " + extra + " on a yacht charter?\n\n" +
    "Date: " + (q.date ? prettyDate(q.date) : "to confirm") + (q.start ? " at " + niceTime(q.start, "en") : "") + "\n" +
    "Guests: " + (q.guests || "to confirm") + "\n" +
    "Duration: " + (q.duration || "to confirm") + "\n" +
    "Marina: " + (q.departure || "to confirm") + "\n" +
    "Ref: " + (q.ref || "") + "\n\nThank you!";
}

// In Nektarios's new-inquiry alert: one "Ask for a quote" button per extra, and the Yacht Bites note
function extrasBox(q) {
  const list = quoteExtras(q), food = wantsFood(q);
  if (!list.length && !food) return "";
  const vs = vendors();
  let html = "";
  list.forEach(function (x) {
    const v = vs[x.toLowerCase()];
    const text = vendorRequest(q, x, v);
    const who = v ? esc(v.company || v.contact) : "";
    const btn = v && v.whatsapp ? button("https://wa.me/" + v.whatsapp + "?text=" + encodeURIComponent(text), "Ask " + who + " for a quote", false)
      : v && v.email ? button("mailto:" + v.email + "?subject=" + encodeURIComponent("Quote request · " + x + " · " + prettyDate(q.date)) + "&body=" + encodeURIComponent(text), "Email " + who + " for a quote", false)
      : "";
    html += '<tr><td style="padding:14px 18px;border-top:1px solid ' + C.line + ';font-family:' + SANS + ';font-size:14px;color:' + C.text + '"><b style="color:' + C.white + '">' + esc(x) + "</b>" +
      '<div style="font-size:12px;color:' + C.muted + ';padding:2px 0 8px">' + (btn ? "Request with the date, guests and marina written, ready to send." : "No " + esc(x) + " vendor in the Vendors tab yet: add one and the next inquiry gets a one-tap request.") + "</div>" +
      (btn || "") + "</td></tr>";
  });
  if (food) html += '<tr><td style="padding:14px 18px;border-top:1px solid ' + C.line + ';font-family:' + SANS + ';font-size:14px;color:' + C.text + '"><b style="color:' + C.white + '">Food on board</b>' +
    '<div style="font-size:12px;color:' + C.muted + ';padding-top:2px">The client got the Yacht Bites menu with your partner link in their email. They order themselves, by 4pm the day before.</div></td></tr>';
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border:1px solid ' + C.gold + ';border-radius:16px;border-collapse:separate;background:' + C.inner + '">' +
    '<tr><td style="padding:14px 18px 6px;font-family:' + SANS + ';font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:' + C.gold + '">Extras to arrange</td></tr>' + html +
    (list.length ? '<tr><td style="padding:12px 18px 16px;border-top:1px solid ' + C.line + ';font-family:' + SANS + ';font-size:12px;line-height:1.6;color:' + C.muted + '">Type each vendor\'s price on the Accept page (your markup included): it goes on the client\'s payment as its own line.</td></tr>' : "") +
    "</table>";
}

// In the client's first email: we're getting quotes for their extras
function extrasClientNote(q, L) {
  const list = quoteExtras(q);
  if (!list.length) return "";
  const names = list.map(function (x) { return extraName(x, L); });
  const joined = names.length > 1 ? names.slice(0, -1).join(", ") + (L === "es" ? " y " : " and ") + names[names.length - 1] : names[0];
  return para(L === "es"
    ? "También pedimos presupuesto para <b>" + esc(joined) + "</b>. Lo verá en su cotización, en un solo pago con el yate."
    : "We're also getting quotes for <b>" + esc(joined) + "</b>. You'll see them on your quote, in one payment with the yacht.", "font-size:15px");
}

/** Run once from the editor to create the Vendors tab (it is also created the first time an alert needs it). */
function setupVendors() { vendorsSheet(); }
