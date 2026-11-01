# Yachtique

Website for Yachtique, a yacht broker and concierge in Miami: https://yachtique.co

It's a plain static site (HTML, CSS, JS), with no build step. Netlify publishes it straight from this repo.

## Booking checklist (from inquiry to charter)

Every yacht on the site is in the YCN network. **Never contact a boat or captain directly: everything goes through YCN (Laurent, YCN Broker Support, WhatsApp).**

1. **Reply within the hour.** The alert email (subject starts with `YQ-####`) has a "Reply on WhatsApp" button with the first message already written.
2. **Check with YCN.** Look at the yacht's live calendar on [ycn.yachts/pages/brokers](https://ycn.yachts/pages/brokers), then WhatsApp Laurent to confirm yacht, date, start time, guests and pickup point. The calendar is a guide; YCN's confirmation is final. Prices change with the pickup point.
3. **Answer the inquiry** with the buttons in the alert email:
   - **Accept**: type the charter price (it starts with the website price for that yacht and duration) and pick the gratuity (18% is preselected; None when the yacht includes it). Gratuity and Florida sales tax are added, and the client gets "your day is available" with a **Pay** button for the total. Leave the price empty to send the quote yourself; tap Accept again later to add it and send the payment link.
   - **Decline**: the client gets a link to the yachts free that day.
   - Yacht taken but others free: send a proposal page with 2 to 4 options instead (see Client proposals below).
4. **The price you type** (before gratuity and tax):
   - our website price (YCN net + 20%) for that duration and pickup point
   - + catering, transport and other extras you agreed
   - + 35% APA for charters of 24 hours or more (fuel, docking, food and drinks; unused APA is returned)
5. **The client pays the full amount to Yachtique** by card, Apple Pay or Google Pay (Stripe). Yachtique always invoices the client; YCN never invoices our clients directly. When the payment lands, the Sheet Status turns **Paid** and you get a "PAID" email.
6. **Reserve with YCN** straight away: on the broker page, *Reserve with $500 Deposit* for that yacht with the date, start time, guest count and the client's details. Tell the client "confirmed" only after YCN confirms.
7. **Sheet**: set the inquiry's Status to **Booked**.
8. **72 hours before**: pay YCN their balance.
9. **The day before**: fill in **Departure** and **Start time** in the sheet once YCN confirms them; the client gets the marina, time, rules and a calendar file automatically (see Automatic emails). Send the captain's contact on WhatsApp.
10. **After the charter**: thank-you message and ask for a Google review.

Rules to remember (YCN terms, read 30 Oct 2026): max 13 guests; 4-hour minimum, 9am to 10pm; late arrival doesn't extend the charter; private-dock pickup costs extra; pets need a $500 (up to 50 ft) or $1,000 (51 ft+) refundable deposit; jet ski drivers born 1988 or later need a Florida boating license.

## Common edits

| What | Where |
|---|---|
| Markup (+20%), hidden yachts, price overrides | `netlify/fleet-config.mjs` |
| The 6 featured yachts on the home page | `featured` in `netlify/fleet-config.mjs` (yacht handles, in order) |
| Charter area pages (names, intro text, which marinas) | `AREAS` in `netlify/lib/site.mjs` |
| Pages listed in the sitemap | `PAGES` in `netlify/functions/sitemap.mjs` (yachts and areas are added automatically) |
| WhatsApp number | `WHATSAPP_NUMBER` at the top of `assets/js/main.js` |
| Text and sections | `index.html` |
| Colours and fonts | top of `assets/css/styles.css` |

Inquiries come in through Netlify Forms. You'll find them under the Forms tab of the Netlify project, where you can also turn on email notifications.

## Live fleet (YCN Miami)

The yachts are not typed in by hand. `netlify/functions/fleet.mjs` (served at `/api/fleet`) reads them live from YCN Miami:

- yachts, photos and prices from the YCN Shopify store (`ycn.yachts/products.json`)
- crew, toys, cabins and each yacht's Google Calendar from the YCN broker page (`ycn.yachts/pages/brokers`)
- booked dates from those calendars (dates only; event details are never read or shown)

It adds the markup from `netlify/fleet-config.mjs` (+20% by default) and Netlify caches the result for an hour, so YCN changes show up on the site within the hour.

### Changing the fleet settings

All in `netlify/fleet-config.mjs`:

- **Markup:** `markup: 0.20` means YCN price + 20%, rounded up to the nearest $5 (`roundTo`).
- **Featured yachts:** `featured: ["bimini-blue", "sea-suite", ...]`. The handle is the last part of the yacht's address, e.g. yachtique.co/yachts/**bimini-blue**. Up to 6, shown in that order.
- **Hide a yacht:** add its handle to `hide: [...]`.
- **Fixed price for one yacht:** `priceOverrides: { "bimini-blue": { "4 hours": 2400 } }`.

Changes go live about a minute after they are merged into `main`; the fleet itself refreshes from YCN every hour.

## Server-rendered pages

| Address | File | What it shows |
|---|---|---|
| `/yachts/<handle>` | `netlify/functions/yacht-page.mjs` | One page per yacht: gallery, rates, calendar, inquiry form |
| `/yacht-charter/<area>` | `netlify/functions/area-page.mjs` | One page per charter area with the yachts that depart there |
| `/sitemap.xml` | `netlify/functions/sitemap.mjs` | Every page, yacht and area, for Google |

Shared header, footer and helpers: `netlify/lib/site.mjs`. After changing CSS or JS, bump the `?v=` on every `<link>`/`<script>` (all `.html` files and `netlify/lib/site.mjs`, `yacht-page.mjs`, `area-page.mjs`).

## Run locally

    python3 -m http.server 8000

Then open http://localhost:8000

## Inquiries backend (Netlify + Google Sheet)

Website form → Netlify Forms → `netlify/functions/enquiry-to-sheet.mts` → Google Apps Script → "Yachtique" Google Sheet (Enquiries tab) + branded emails (alert to yachtiquemiami@gmail.com, confirmation to the client).

| Piece | Where |
|---|---|
| Netlify function | `netlify/functions/enquiry-to-sheet.mts` |
| Apps Script code | `apps-script/Code.gs` (linked to the live script by `apps-script/.clasp.json`) |
| Web app URL | Netlify env var `SHEETS_WEBHOOK_URL` (Functions scope) |
| Shared secret | Netlify env var `SHEETS_SECRET` **and** Apps Script → Project Settings → Script Properties `SHEETS_SECRET`. Never in this repo. |

`/netlify/*`, `/apps-script/*` and `/README.md` are blocked from the public site in `netlify.toml`.

## Payments (Stripe)

Clients pay on **yachtique.co/pay/YQ-####**, linked from the "Accepted" email. The page shows the charter, Florida sales tax and the total saved in the Sheet, then opens Stripe Checkout. The amount always comes from the Sheet, never from the browser.

On the pay page the client can still switch the gratuity to 15, 18 or 20%. The Sheet works out the new Gratuity and Total (`setGratuity` in `apps-script/Code.gs`) before Stripe opens, and the Gratuity choice column shows what they picked.

| Part | Where |
|---|---|
| Accept page with the price box | `netlify/functions/decide.mjs` |
| Pay page (EN/ES) | `netlify/functions/pay.mjs` |
| Stripe webhook: marks the row Paid even if the client closes the tab | `netlify/functions/stripe-webhook.mjs` |
| Gratuity choices and the 18% default | `GRATUITY`, `GRATUITY_OPTIONS` in `netlify/functions/decide.mjs` |
| Tax rate (7%, Miami-Dade), tax on the gratuity, Paid emails | `TAX_RATE`, `TAX_GRATUITY`, `markPaid`, `sendClientPaid`, `sendOwnerPaid` in `apps-script/Code.gs` |
| Sheet columns | Price (charter), Total, Paid, Payment (Stripe payment ID), Gratuity, Gratuity choice (from the form), Departure, Start time, Emails sent; added by themselves on first use. Pass the Gratuity on to YCN for the crew. |

Setup (once, from the Stripe account; keys never go in this repo):

1. Netlify env var `STRIPE_SECRET_KEY` (Functions scope): Stripe → Developers → API keys → Secret key. Start with the **test** key (`sk_test_…`), switch to the live key when the test payment works.
2. Stripe → Developers → Webhooks → Add endpoint `https://yachtique.co/api/stripe-webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its signing secret into the Netlify env var `STRIPE_WEBHOOK_SECRET`.
3. Stripe → Settings → Customer emails: turn on receipts for successful payments.
4. Paste `apps-script/Code.gs` into Apps Script and deploy a new version (Deploy → Manage deployments → edit → New version).

Test cards in test mode: `4242 4242 4242 4242`, any future date, any CVC. Test-mode payments mark the Sheet Paid too, so set test rows to Lost afterwards.

## Automatic emails (Apps Script timers)

Two timers run `apps-script/Code.gs` by themselves. **Turn them on once:** in Apps Script, signed in as yachtiquemiami@gmail.com, select `installTriggers` and press Run (so the emails go out from Yachtique's account).

| When | Who gets it | What |
|---|---|---|
| Accepted, not paid after 24h (3h if the charter is within 3 days) | Client + Yachtique | Reminder with the payment link; a note to Yachtique |
| Still unpaid after 72h (24h if close) | Yachtique | Follow up or set Lost |
| 3 days before (Paid or Booked) | Client | What to plan for and the rules |
| 3 days before | Yachtique | Pay YCN the balance; fill in Departure and Start time |
| Day before | Client | Marina, time, map link, rules and a calendar file. Needs **Departure** and **Start time** in the sheet; if they're empty, Yachtique gets a reminder instead |
| Day after | Client | Google review request, once `REVIEW_URL` is filled in |
| Mondays 8am | Yachtique | Weekly summary: inquiries, accepted, paid, revenue, gratuity, coming up, unpaid, most viewed yachts |

Client emails go out between 9am and 8pm Miami time only, in the client's language, and each one only once (the **Emails sent** column remembers). The "Payment received" email has a calendar file. TEST rows are left out of the weekly summary; set test rows to Lost so no automatic emails go to them. To preview everything, run `testAutomations` (sends to TEST_TO only).

## Working from another laptop

1. `git pull` before you start, push when you finish.
2. Website and Netlify function: edit, commit, push to `main`. Netlify deploys automatically.
3. Apps Script (needs Node.js and access to the Google Sheet):
   ```
   npm install -g @google/clasp
   clasp login
   cd apps-script
   clasp pull     # get the live version first
   # edit Code.gs
   clasp push     # upload to Apps Script
   ```
   Then in the Apps Script editor: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
   Never "New deployment" (it creates a new URL and breaks Netlify). Commit `Code.gs` to GitHub too.
4. Changed the secret? Update it in both places at the same time (Script Properties and Netlify), then trigger a Netlify deploy.
5. Test: send an inquiry on yachtique.co. You should get a new row in the Sheet and both emails within seconds.

## Client proposals (yachtique.co/p/ID)

A private page per client request, instead of a PDF. Not in Google, not in the sitemap: only people with the link see it.

1. Open the **Proposals** tab in the Yachtique Google Sheet (it appears after the first proposal is opened; the example row shows the format).
2. Add **one row per yacht option**, all with the same **ID** (short and hard to guess, e.g. `oct24-k9m4`).
   - First row: client name (optional), date (YYYY-MM-DD), guests, time, pickup, terms (one per line), valid until, language (`es` opens it in Spanish).
   - Every row: yacht (`kilauea`, `Kilauea` or its yachtique.co link), label (e.g. "Best value"), a short note, and prices for 4, 6 and 8 hours (blank = website rates).
3. Send the client **yachtique.co/p/ID**. Photos, specs and live availability come from the fleet automatically; edits show within a minute.

Each "Choose" button opens WhatsApp with the yacht, length and price written. Opens and choices are counted in the Insights tab.
