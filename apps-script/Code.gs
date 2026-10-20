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

const ENQUIRY_HEADERS = ["Received", "Status", "Name", "Phone / WhatsApp", "Email", "Charter date", "Guests", "Duration", "Yacht", "Also interested in", "Message", "Notes"];
const FLEET_HEADERS = ["Show on site", "Name", "Model", "Guests", "Length", "Cabins", "Description", "Photo", "Rate"];
const STATUSES = ["New", "Contacted", "Quoted", "Booked", "Lost"];

// Branded emails
const OWNER_EMAIL = "yachtiquemiami@gmail.com";   // where new-enquiry alerts go
const SEND_CLIENT_CONFIRMATION = true;              // false = don't email the client
const WHATSAPP = "13058124721";
const LOGO = "https://yachtique.co/assets/img/logo-stacked-notag.png";

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
    if (body.type !== "enquiry") return json({ ok: false, error: "unknown type" });

    const q = body.enquiry || {};
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiries");
      sheet.appendRow([
        new Date(), "New", safe(q.name), safe(q.phone), safe(q.email), safe(q.date),
        safe(q.guests), safe(q.duration), safe(q.yacht), safe(q.extras), safe(q.message), ""
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


/* =================== Branded emails =================== */

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function prettyDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso || "Flexible";
  const p = iso.split("-").map(Number);
  return Utilities.formatDate(new Date(p[0], p[1] - 1, p[2], 12), "America/New_York", "EEEE, MMMM d, yyyy");
}

function detailRows(q) {
  const rows = [
    ["Date", prettyDate(q.date)],
    ["Guests", q.guests || "Not given"],
    ["Duration", q.duration],
    ["Yacht", q.yacht],
    ["Also interested in", q.extras],
  ].filter((r) => r[1]);
  return rows.map((r) =>
    '<tr><td style="padding:10px 0;border-bottom:1px solid #1d3a47;color:#9BA8AE;font-size:13px;width:150px;vertical-align:top">' + esc(r[0]) +
    '</td><td style="padding:10px 0;border-bottom:1px solid #1d3a47;color:#F6F1E7;font-size:15px">' + esc(r[1]) + "</td></tr>").join("");
}

function button(href, label, primary) {
  const style = primary
    ? "background:#C9A564;color:#000F16;border:1px solid #C9A564"
    : "background:transparent;color:#EBD7AC;border:1px solid #7F5119";
  return '<a href="' + href + '" style="display:inline-block;margin:0 8px 10px 0;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;letter-spacing:.5px;text-decoration:none;border-radius:3px;' + style + '">' + esc(label) + "</a>";
}

function layout(preheader, inner) {
  return '<!doctype html><html><body style="margin:0;padding:0;background:#000F16">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + esc(preheader) + "</div>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000F16"><tr><td align="center" style="padding:32px 16px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#04202C;border:1px solid #2a3f33">' +
    '<tr><td align="center" style="padding:36px 32px 24px;border-bottom:1px solid #2a3f33">' +
    '<img src="' + LOGO + '" width="200" alt="Yachtique" style="display:block;width:200px;height:auto;border:0"></td></tr>' +
    '<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#E8E4DA">' + inner + "</td></tr>" +
    '<tr><td align="center" style="padding:22px 32px;border-top:1px solid #2a3f33;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9BA8AE;line-height:1.7">' +
    'Yachtique &middot; Miami, Florida<br><a href="https://yachtique.co" style="color:#C9A564;text-decoration:none">yachtique.co</a> &middot; ' +
    '<a href="https://www.instagram.com/yachtiquemiami/" style="color:#C9A564;text-decoration:none">@yachtiquemiami</a></td></tr>' +
    "</table></td></tr></table></body></html>";
}

function heading(text) {
  return '<h1 style="margin:0 0 14px;font-family:Georgia,\'Times New Roman\',serif;font-weight:normal;font-size:30px;line-height:1.2;color:#F6F1E7">' + text + "</h1>";
}

/** Alert to Yachtique: everything needed to reply in one tap. */
function sendOwnerAlert(q) {
  const phone = String(q.phone || "").replace(/\D/g, "");
  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const buttons =
    (phone ? button("https://wa.me/" + phone, "WhatsApp " + (String(q.name || "").trim().split(/\s+/)[0] || "client"), true) : "") +
    (q.email ? button("mailto:" + encodeURIComponent(q.email), "Reply by email", !phone) : "") +
    button(sheetUrl, "Open enquiries sheet", false);
  const inner =
    '<p style="margin:0 0 8px;color:#C9A564;font-size:13px;letter-spacing:1px">New enquiry</p>' +
    heading(esc(q.name || "New client")) +
    '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#E8E4DA">' +
    (q.phone ? esc(q.phone) : "") + (q.phone && q.email ? " &middot; " : "") + (q.email ? esc(q.email) : "") + "</p>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">' + detailRows(q) + "</table>" +
    (q.message ? '<p style="margin:0 0 6px;color:#9BA8AE;font-size:13px">Their message</p><p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#F6F1E7;white-space:pre-line">' + esc(q.message) + "</p>" : "") +
    buttons;
  MailApp.sendEmail({
    to: OWNER_EMAIL,
    replyTo: q.email || OWNER_EMAIL,
    name: "Yachtique Enquiries",
    subject: "New enquiry: " + (q.name || "client") + " · " + prettyDate(q.date) + (q.guests ? " · " + q.guests + " guests" : ""),
    htmlBody: layout("New enquiry from " + (q.name || "a client"), inner),
    body: "New enquiry from " + q.name + "\nPhone: " + q.phone + "\nEmail: " + q.email + "\nDate: " + q.date +
      "\nGuests: " + q.guests + "\nDuration: " + q.duration + "\nYacht: " + q.yacht + "\nExtras: " + q.extras + "\n\n" + q.message,
  });
}

/** Confirmation to the client, in the Yachtique look. */
function sendClientConfirmation(q) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(q.email || ""))) return;
  const first = String(q.name || "").trim().split(/\s+/)[0] || "there";
  const inner =
    heading("Thank you, " + esc(first) + ".") +
    '<p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#E8E4DA">We have your request and Nektarios is already looking at which yachts are free for you. ' +
    "You'll receive your options with clear pricing, usually within the hour.</p>" +
    '<p style="margin:0 0 6px;color:#C9A564;font-size:13px;letter-spacing:1px">Your request</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">' + detailRows(q) + "</table>" +
    '<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#E8E4DA">Want to talk it through sooner? Message us directly.</p>' +
    button("https://wa.me/" + WHATSAPP, "WhatsApp Nektarios", true) +
    button("https://yachtique.co/faq.html", "Read the FAQ", false);
  MailApp.sendEmail({
    to: q.email,
    replyTo: OWNER_EMAIL,
    name: "Yachtique",
    subject: "We've received your charter request",
    htmlBody: layout("Your options are on the way, usually within the hour.", inner),
    body: "Thank you, " + first + ".\n\nWe have your request and will reply with options and clear pricing, usually within the hour.\n\n" +
      "Date: " + q.date + "\nGuests: " + q.guests + "\nDuration: " + q.duration + "\nYacht: " + q.yacht +
      "\n\nWhatsApp: https://wa.me/" + WHATSAPP + "\n\nYachtique · Miami, Florida · yachtique.co",
  });
}

/** Run from the editor to see both emails in your own inbox. */
function testEmails() {
  const sample = { name: "Alex Morgan", phone: "+1 305 555 0123", email: OWNER_EMAIL, date: "2026-11-15", guests: "8",
    duration: "4 hours", yacht: "Help me choose", extras: "Catering, Transport", message: "Birthday on board for my wife. Sunset if possible!" };
  sendOwnerAlert(sample);
  sendClientConfirmation(sample);
}
