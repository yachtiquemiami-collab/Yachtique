// Runs automatically every time a verified (non-spam) Netlify Form submission arrives.
// Sends the enquiry to the Google Sheet through the Apps Script web app.
//
// Netlify environment variables (scope must include Functions):
//   SHEETS_WEBHOOK_URL  the Apps Script web app URL (ends in /exec)
//   SHEETS_SECRET       shared secret, identical to SECRET in the Apps Script

import type { FormSubmittedEvent } from "@netlify/functions"

const FIELDS = ["name", "phone", "email", "date", "guests", "duration", "yacht", "extras", "message"] as const

const asText = (v: unknown): string => {
  if (v == null) return ""
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(", ")
  return String(v).trim()
}

export default {
  async formSubmitted(event: FormSubmittedEvent) {
    const url = Netlify.env.get("SHEETS_WEBHOOK_URL")
    const secret = Netlify.env.get("SHEETS_SECRET")
    if (!url || !secret) {
      console.error("Sheets sync skipped: SHEETS_WEBHOOK_URL or SHEETS_SECRET is not set")
      return
    }

    const data = (event.data ?? {}) as Record<string, unknown>
    const enquiry: Record<string, string> = {}
    for (const key of FIELDS) enquiry[key] = asText(data[key])

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, type: "enquiry", enquiry }),
      redirect: "follow",
    })

    const text = await res.text()
    if (!res.ok || !text.includes('"ok":true')) {
      // Throwing marks the run as failed so it shows up in the Functions logs
      throw new Error(`Sheets sync failed (${res.status}): ${text.slice(0, 300)}`)
    }
    console.log(`Enquiry from ${enquiry.name || "unknown"} added to the sheet`)
  },
}
