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
9. **The day before**: check **Departure** (the client picks a marina on the form; some yachts cost more from some marinas, and the Accept page prefills the price for theirs) and **Start time** (the client picks one on the form, or Flexible) once YCN confirms them; the client gets the marina, time, rules and a calendar file automatically (see Automatic emails). Send the captain's contact on WhatsApp.
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

**Service fee (3%).** Every booking adds a service fee of 3% of the charter (after any discount) plus gratuity, whatever the payment method (card or Zelle). It covers Stripe's card fees and shows as its own line on the Accept page, the client emails, the pay page and the Stripe receipt; Florida sales tax is charged on it too. The Sheet keeps it in **Service fee**. Change or switch it off with `SERVICE_FEE` in `apps-script/Code.gs` (and the wording on the yacht pages, FAQ and terms).

**Marina choice on a proposal.** Put several marinas in the Pickup cell, separated by `;` (for example `Venetian Marina (Downtown Miami); Miami Beach Marina (South Beach)`): the page shows them as buttons and every yacht shows its own price from the chosen marina, live from the fleet (the 4/6/8 hours columns then only choose which lengths of day show). A yacht that doesn't leave from that marina says where it boards instead. **Choose** opens that yacht's request form with the date, guests, length of day, marina and the proposal already filled in; the client adds name, phone and email and sends a normal inquiry. Its Accept page then starts with the proposal's Discount.

**Discounts and price changes.** On the Accept page, type a Discount (`10%` or dollars): the client's email, payment page and Stripe receipt show the price, the discount as its own line, and the new total (gratuity and tax on the discounted price). After accepting, **Edit price or discount** (on the Accept page link, before the client pays) changes the quote and emails the client the update; the payment link stays the same. The Sheet keeps Price = after the discount and Discount = dollars off.

Clients pay on **yachtique.co/pay/YQ-####**, linked from the "Accepted" email. The page shows the charter, Florida sales tax and the total saved in the Sheet, then opens Stripe Checkout. The amount always comes from the Sheet, never from the browser.

Paid by Zelle instead? Nektarios taps **Paid by Zelle?** (on his Accept page, or in the unpaid reminder emails), checks the amount arrived in the Yachtique account and confirms: the row turns Paid (Payment: Zelle) and the client gets the same confirmation and calendar file as a card payment (`markPaidManual` in `apps-script/Code.gs`). Sales tax is owed the same as for a card.

**More time on board (switched off, Nov 2026: YCN doesn't allow extensions on broker bookings; `EXTENSIONS_ON` in Code.gs and extend.mjs).** About an hour before a paid charter ends (it needs a Start time and a duration in hours), the hourly timer emails the client "Want more time?" and sends Yachtique the same link to forward on WhatsApp. The link opens **yachtique.co/extend/YQ-####** (`netlify/functions/extend.mjs`): +1 or +2 hours, priced from the yacht's own rates (the step from the booked duration to the next one, from the client's marina), plus the booking's gratuity % and sales tax. Stripe only **holds** the amount: one tap with the card kept at the first payment, or Stripe Checkout. Nektarios gets an email with **Confirm** (charges the hold) and **Not possible** (releases it); the client is emailed either way. The Sheet keeps it in **Extension** ("+1 hour · $417.92 · Held / Confirmed / Released") and **Extension payment** (Stripe's id). A hold Stripe doesn't charge within 7 days is released by itself.

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
   - **Discount** (first row, column P): `10%` or a dollar amount like `300`. The page shows each price crossed out next to the new one, with a "Special price" badge. Clear the cell to remove it.
3. Send the client **yachtique.co/p/ID**. Photos, specs and live availability come from the fleet automatically; edits show within a minute.

Each "Choose" button opens WhatsApp with the yacht, length and price written. Opens and choices are counted in the Insights tab.

## Photo credits

The area photos on the Locations page (`assets/img/locations/`) are from Unsplash, under the Unsplash License (free for commercial use, no credit required): Miami Beach `photo-1589083130544`, Key Biscayne `photo-1648319573718`, Fort Lauderdale `photo-1766373165231`, Palm Beach County `photo-1712026258060`, Key West `photo-1617202830798`, the Bahamas `photo-1615839901889` (unsplash.com/photos/...). Replace them with your own photos any time; keep the file names.
