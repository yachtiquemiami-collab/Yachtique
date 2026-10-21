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

const ENQUIRY_HEADERS = ["Received", "Status", "Name", "Phone / WhatsApp", "Email", "Charter date", "Guests", "Duration", "Yacht", "Also interested in", "Message", "Notes", "Source", "Language"];
const EVENT_HEADERS = ["Time", "Event", "Page", "Yacht", "Detail", "Language", "Source", "Device", "Site"];
const FLEET_HEADERS = ["Show on site", "Name", "Model", "Guests", "Length", "Cabins", "Description", "Photo", "Rate"];
const STATUSES = ["New", "Contacted", "Quoted", "Booked", "Lost"];

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
    if (body.type !== "enquiry") return json({ ok: false, error: "unknown type" });

    const q = body.enquiry || {};
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiries");
      // Sheets made before 22 Oct 2026 lack the Source and Language columns: add their headers once
      if (sheet.getRange(1, 13).getValue() !== "Source") {
        sheet.getRange(1, 13, 1, 2).setValues([["Source", "Language"]]).setFontWeight("bold").setBackground("#071820").setFontColor("#E6D0A4");
      }
      sheet.appendRow([
        new Date(), "New", safe(q.name), safe(q.phone), safe(q.email), safe(q.date),
        safe(q.guests), safe(q.duration), safe(q.yacht), safe(q.extras), safe(q.message), "",
        safe(q.source), q.lang === "es" ? "Spanish" : "English"
      ]);
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

/** The website asks here for the yachts to show. */
function doGet(e) {
  const p = e.parameter || {};
  if (!SECRET || p.secret !== SECRET) return json({ ok: false, error: "unauthorized" });
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

function prettyDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso || "Flexible";
  const p = iso.split("-").map(Number);
  return Utilities.formatDate(new Date(p[0], p[1] - 1, p[2], 12), "America/New_York", "EEE, MMM d, yyyy");
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
function factsBox(q) {
  const facts = [
    ["Date", prettyDate(q.date)],
    ["Guests", q.guests ? q.guests + (/^\d+$/.test(q.guests) ? " guests" : "") : "To confirm"],
    ["Duration", q.duration || "To confirm"],
    ["Yacht", q.yacht || "Help me choose"],
  ];
  if (q.extras) facts.push(["Also arranging", q.extras]);
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

function layout(preheader, inner) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
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
    'Yachtique &middot; Yacht charters &amp; concierge &middot; Miami, Florida<br>' +
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
  const inner =
    eyebrow("New charter enquiry") +
    heading(esc(q.name || "New client")) +
    (contact ? para(contact, "margin-bottom:22px") : "") +
    soon + rule() +
    factsBox(q) +
    messageBox("Their message", q.message) +
    buttons(
      (phone ? button("https://wa.me/" + phone + "?text=" + encodeURIComponent(waText), "Reply on WhatsApp", true) : "") +
      (q.email ? button("mailto:" + q.email + "?subject=" + encodeURIComponent("Your Yachtique charter request") + "&body=" + encodeURIComponent(mailBody), "Reply by email", !phone) : "") +
      button(SpreadsheetApp.getActiveSpreadsheet().getUrl(), "Open the sheet", false));
  MailApp.sendEmail({
    to: to || OWNER_EMAIL,
    cc: (cc === undefined ? ALERT_CC : cc) || undefined,
    replyTo: q.email || OWNER_EMAIL,
    name: "Yachtique Enquiries",
    subject: "New enquiry: " + (q.name || "client") + " · " + prettyDate(q.date) + (q.guests ? " · " + q.guests + " guests" : ""),
    htmlBody: layout((q.name || "A client") + " · " + prettyDate(q.date) + (q.guests ? " · " + q.guests + " guests" : ""), inner),
    body: "New enquiry from " + q.name + "\nPhone: " + q.phone + "\nEmail: " + q.email + "\nDate: " + prettyDate(q.date) +
      "\nGuests: " + q.guests + "\nDuration: " + q.duration + "\nYacht: " + q.yacht + "\nAlso arranging: " + q.extras + "\n\n" + q.message,
  });
}

/** Confirmation to the client, in the Yachtique look. */
function sendClientConfirmation(q) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(q.email || ""))) return;
  const first = firstName(q);
  const inner =
    eyebrow("Charter request received") +
    heading("Thank you" + (first ? ", " + esc(first) : "") + ".") +
    para("We're checking which yachts are free for your day. You'll receive your options with clear pricing, usually within the hour.") +
    rule() +
    factsBox(q) +
    messageBox("Your note", q.message) +
    eyebrow("What happens next") +
    steps([
      ["We check availability.", "Live calendars for every yacht that fits your group."],
      ["You receive your options.", "Photos, prices and what's included, on WhatsApp or by email."],
      ["Confirm and sail.", "Captain, crew and any extras arranged. You just arrive."],
    ]) +
    para("Want to talk it through sooner? Message us directly.", "margin-bottom:18px;font-size:15px") +
    buttons(
      button("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Hi Yachtique, I just sent a charter request" + (q.date ? " for " + prettyDate(q.date) : "") + "."), "Chat on WhatsApp", true) +
      button(SITE + "/#fleet", "Browse the fleet", false));
  MailApp.sendEmail({
    to: q.email,
    replyTo: OWNER_EMAIL,
    name: "Yachtique",
    subject: "Your charter request" + (q.date ? " for " + prettyDate(q.date) : "") + " · Yachtique",
    htmlBody: layout("Your options are on the way, usually within the hour.", inner),
    body: "Thank you" + (first ? ", " + first : "") + ".\n\nWe're checking which yachts are free for your day. You'll receive your options with clear pricing, usually within the hour.\n\n" +
      "Date: " + prettyDate(q.date) + "\nGuests: " + q.guests + "\nDuration: " + q.duration + "\nYacht: " + q.yacht +
      "\n\nWhat happens next\n1. We check availability.\n2. You receive your options.\n3. Confirm and sail.\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co",
  });
}

/**
 * TEST: run from the Apps Script editor (select testEmails, press Run).
 * Sends both emails with sample details to TEST_TO only. Nothing is added to the sheet and no client is emailed.
 */
const TEST_TO = "tsirkoudis7@gmail.com";
function testEmails() {
  const inThreeDays = Utilities.formatDate(new Date(Date.now() + 3 * 86400000), "America/New_York", "yyyy-MM-dd");
  const sample = { name: "Alex Morgan", phone: "+1 305 555 0123", email: TEST_TO, date: inThreeDays, guests: "8",
    duration: "4 hours", yacht: "Four Keeps (38ft Axopar)", extras: "Catering, Transport", message: "Birthday on board for my wife. Sunset if possible!" };
  sendOwnerAlert(sample, TEST_TO, "");
  sendClientConfirmation(sample);
}
