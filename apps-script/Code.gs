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

const ENQUIRY_HEADERS = ["Received", "Status", "Name", "Phone / WhatsApp", "Email", "Charter date", "Guests", "Duration", "Yacht", "Also interested in", "Message", "Notes", "Source", "Language", "Ref", "Decided"];
// Enquiries columns (1-based), used by the Accept / Decline links
const COL = { RECEIVED: 1, STATUS: 2, NAME: 3, PHONE: 4, EMAIL: 5, DATE: 6, GUESTS: 7, DURATION: 8, YACHT: 9, EXTRAS: 10, MESSAGE: 11, NOTES: 12, SOURCE: 13, LANG: 14, REF: 15, DECIDED: 16 };
const EVENT_HEADERS = ["Time", "Event", "Page", "Yacht", "Detail", "Language", "Source", "Device", "Site"];
const FLEET_HEADERS = ["Show on site", "Name", "Model", "Guests", "Length", "Cabins", "Description", "Photo", "Rate"];
const STATUSES = ["New", "Accepted", "Declined", "Contacted", "Quoted", "Booked", "Lost"];

// Branded emails
const OWNER_EMAIL = "yachtiquemiami@gmail.com";   // where new-enquiry alerts go
const ALERT_CC = "tsirkoudis7@gmail.com";          // copy of every alert ("" = none)
const SEND_CLIENT_CONFIRMATION = true;              // false = don't email the client
const WHATSAPP = "13058124721";
const LOGO = "https://yachtique.co/assets/img/logo-stacked-notag.png";
const SITE = "https://yachtique.co";

/** Run once: creates the Enquiries and Fleet tabs, formatting and sample yachts. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone("America/New_York");

  // Enquiries
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

/** Netlify sends each new enquiry here. */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!SECRET || body.secret !== SECRET) return json({ ok: false, error: "unauthorized" });
    if (body.type === "event") return json(saveEvent(body.event || {}));
    if (body.type === "lookup") return json(lookupEnquiry(String(body.ref || "")));
    if (body.type === "decide") return json(decideEnquiry(String(body.ref || ""), String(body.a || "")));
    if (body.type !== "enquiry") return json({ ok: false, error: "unknown type" });

    const q = body.enquiry || {};
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiries");
      // Older sheets lack the newer columns: add their headers once
      if (sheet.getRange(1, COL.DECIDED).getValue() !== "Decided") {
        sheet.getRange(1, COL.SOURCE, 1, 4).setValues([["Source", "Language", "Ref", "Decided"]])
          .setFontWeight("bold").setBackground("#071820").setFontColor("#E6D0A4");
        const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
        sheet.getRange("B2:B").setDataValidation(rule);
      }
      sheet.appendRow([
        new Date(), "New", safe(q.name), safe(q.phone), safe(q.email), safe(q.date),
        safe(q.guests), safe(q.duration), safe(q.yacht), safe(q.extras), safe(q.message), "",
        safe(q.source), q.lang === "es" ? "Spanish" : "English"
      ]);
      // A short reference for the enquiry: YQ-1002, YQ-1003... (row number + 1000)
      const row = sheet.getLastRow();
      q.ref = "YQ-" + (1000 + row);
      sheet.getRange(row, COL.REF).setValue(q.ref);
    } finally {
      lock.releaseLock();
    }
    // Emails never block the sheet: a mail problem is logged, the enquiry is still saved
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
   which shows the enquiry with ONE confirm button: email scanners open links on their own, so opening never decides.
   The confirm calls this script; the Status becomes Accepted or Declined and the client gets the matching email,
   in their language. The link carries a code made from the ref and the shared secret, so it can't be guessed. */

function decideToken(ref) {
  const sig = Utilities.computeHmacSha256Signature(String(ref), SECRET);
  return sig.map((b) => ("0" + (b & 0xff).toString(16)).slice(-2)).join("").slice(0, 20);
}

function decideUrl(ref, a) {
  return SITE + "/api/decide?ref=" + encodeURIComponent(ref) + "&a=" + a + "&t=" + decideToken(ref);
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
      const v = sheet.getRange(row, 1, 1, COL.DECIDED).getValues()[0];
      const ymd = (x) => x instanceof Date ? Utilities.formatDate(x, "America/New_York", "yyyy-MM-dd") : String(x || "");
      return { sheet: sheet, row: row, q: {
        ref: ref, status: String(v[COL.STATUS - 1] || "New"), name: String(v[COL.NAME - 1] || ""), phone: String(v[COL.PHONE - 1] || ""),
        email: String(v[COL.EMAIL - 1] || ""), date: ymd(v[COL.DATE - 1]), guests: String(v[COL.GUESTS - 1] || ""),
        duration: String(v[COL.DURATION - 1] || ""), yacht: String(v[COL.YACHT - 1] || ""), extras: String(v[COL.EXTRAS - 1] || ""),
        message: String(v[COL.MESSAGE - 1] || ""), lang: /span/i.test(String(v[COL.LANG - 1])) ? "es" : "en",
        decided: v[COL.DECIDED - 1] ? String(v[COL.DECIDED - 1]) : "",
      } };
    }
  }
  return null;
}

function lookupEnquiry(ref) {
  const f = findEnquiry(ref);
  return f ? { ok: true, enquiry: f.q } : { ok: false, error: "not found" };
}

function decideEnquiry(ref, a) {
  if (a !== "accept" && a !== "decline") return { ok: false, error: "bad action" };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let f;
  try {
    f = findEnquiry(ref);
    if (!f) return { ok: false, error: "not found" };
    // Decided already (a second tap, or the other button): say so, change nothing, email nobody
    if (/^(accepted|declined)$/i.test(f.q.status)) return { ok: true, already: true, enquiry: f.q };
    const status = a === "accept" ? "Accepted" : "Declined";
    f.sheet.getRange(f.row, COL.STATUS).setValue(status);
    f.sheet.getRange(f.row, COL.DECIDED).setValue(new Date());
    f.q.status = status;
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
    ["Page views", "view"], ["WhatsApp taps", "whatsapp"], ["Enquiries sent", "enquiry"], ["Phone calls", "call"],
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

const PROPOSAL_HEADERS = ["ID", "Client", "Date", "Guests", "Time", "Pickup", "Yacht", "Label", "Note", "4 hours", "6 hours", "8 hours", "Terms", "Valid until", "Language"];

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
      "Prices exclude Florida sales tax and crew gratuity. A deposit holds your yacht and date."]]);
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
    eyebrow("New charter enquiry" + (q.ref ? " &middot; " + esc(q.ref) : "")) +
    heading(esc(q.name || "New client")) +
    (contact ? para(contact, "margin-bottom:22px") : "") +
    soon + rule() +
    factsBox(q) +
    messageBox("Their message", q.message) +
    decide +
    buttons(
      (phone ? button("https://wa.me/" + phone + "?text=" + encodeURIComponent(waText), "Reply on WhatsApp", true) : "") +
      (q.email ? button("mailto:" + q.email + "?subject=" + encodeURIComponent("Your Yachtique charter request") + "&body=" + encodeURIComponent(mailBody), "Reply by email", !phone) : "") +
      button(SpreadsheetApp.getActiveSpreadsheet().getUrl(), "Open the sheet", false));
  MailApp.sendEmail({
    to: to || OWNER_EMAIL,
    cc: (cc === undefined ? ALERT_CC : cc) || undefined,
    replyTo: q.email || OWNER_EMAIL,
    name: "Yachtique Enquiries",
    subject: (q.ref ? q.ref + " · " : "") + "New enquiry: " + (q.name || "client") + " · " + prettyDate(q.date) + (q.guests ? " · " + q.guests + " guests" : ""),
    htmlBody: layout((q.name || "A client") + " · " + prettyDate(q.date) + (q.guests ? " · " + q.guests + " guests" : ""), inner),
    body: "New enquiry from " + q.name + "\nPhone: " + q.phone + "\nEmail: " + q.email + "\nDate: " + prettyDate(q.date) +
      "\nGuests: " + q.guests + "\nDuration: " + q.duration + "\nYacht: " + q.yacht + "\nAlso arranging: " + q.extras + "\n\n" + q.message,
  });
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
    accP: (y, d) => (y ? "<b>" + y + "</b> is available" : "We have the right yacht for you") + (d ? " on " + d : "") + ". Nektarios will message you shortly with your final quote and how to secure the date with a deposit.",
    accSteps: [["Your final quote.", "Everything included, with tax and gratuity shown, before you pay anything."], ["A deposit holds the date.", "Your yacht is reserved for you as soon as it's paid."], ["Step aboard.", "Captain and crew ready at the marina. We handle the rest."]],
    accSubject: (d) => "Good news: your charter" + (d ? " on " + d : "") + " is available · Yachtique", accPre: "Your yacht is available. Your final quote is on its way.",
    waAcc: (r) => "Hi Nektarios, I'd like to confirm my charter (" + r + ").",
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
    accP: (y, d) => (y ? "<b>" + y + "</b> está disponible" : "Tenemos el yate ideal para usted") + (d ? " el " + d : "") + ". Nektarios le escribirá en breve con su cotización final y cómo reservar la fecha con un depósito.",
    accSteps: [["Su cotización final.", "Todo incluido, con impuestos y propina indicados, antes de pagar nada."], ["Un depósito reserva la fecha.", "Su yate queda reservado en cuanto se paga."], ["Suba a bordo.", "Capitán y tripulación listos en la marina. Nosotros nos ocupamos del resto."]],
    accSubject: (d) => "Buenas noticias: su alquiler" + (d ? " del " + d : "") + " está disponible · Yachtique", accPre: "Su yate está disponible. Su cotización final está en camino.",
    waAcc: (r) => "Hola Nektarios, me gustaría confirmar mi alquiler (" + r + ").",
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
    para(T.sooner, "margin-bottom:18px;font-size:15px") +
    buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waGot(d)), T.chat, true) + button(SITE + "/#fleet", T.fleet, false));
  MailApp.sendEmail({ to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: T.gotSubject(d), htmlBody: layout(T.gotPre, inner, L),
    body: T.thanks + (first ? ", " + first : "") + ".\n\n" + T.gotP + "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co" });
  return true;
}

/** Accepted: the yacht is available; Nektarios follows up with the final quote and deposit. */
function sendClientAccepted(q) {
  if (!validEmail(q.email)) return false;
  const L = q.lang === "es" ? "es" : "en", T = TXT[L], first = firstName(q), d = q.date ? prettyDate(q.date, L) : "";
  const inner =
    eyebrow(T.accEyebrow) + heading(T.accHead(esc(first))) +
    para(T.accP(yachtName(q), d)) + rule() + factsBox(q, L) +
    eyebrow(T.next) + steps(T.accSteps) +
    buttons(button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.waAcc(q.ref)), T.chat, true));
  MailApp.sendEmail({ to: q.email, replyTo: OWNER_EMAIL, name: "Yachtique", subject: T.accSubject(d), htmlBody: layout(T.accPre, inner, L),
    body: T.accHead(first) + "\n\n" + T.accP(yachtName(q), d).replace(/<[^>]+>/g, "") + "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co" });
  return true;
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

/**
 * TEST: run from the Apps Script editor (select testEmails, press Run).
 * Sends every email to TEST_TO only: the alert, then the client confirmation, accepted and declined emails
 * in English and in Spanish. Nothing is added to the sheet and no client is emailed.
 */
const TEST_TO = "yachtiquemiami@gmail.com";
function testEmails() {
  const inThreeDays = Utilities.formatDate(new Date(Date.now() + 3 * 86400000), "America/New_York", "yyyy-MM-dd");
  const sample = { ref: "YQ-TEST", name: "Alex Morgan", phone: "+1 305 555 0123", email: TEST_TO, date: inThreeDays, guests: "8",
    duration: "4 hours", yacht: "Four Keeps (38ft Axopar)", extras: "Catering, Transport", message: "Birthday on board for my wife. Sunset if possible!", lang: "en" };
  sendOwnerAlert(sample, TEST_TO, "");
  ["en", "es"].forEach((L) => {
    const q = Object.assign({}, sample, { lang: L, name: L === "es" ? "Sofía Martínez" : sample.name });
    sendClientConfirmation(q);
    sendClientAccepted(q);
    sendClientDeclined(q);
  });
}
