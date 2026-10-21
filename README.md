# Yachtique

Website for Yachtique, a yacht broker and concierge in Miami: https://yachtique.co

It's a plain static site (HTML, CSS, JS), with no build step. Netlify publishes it straight from this repo.

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

Enquiries come in through Netlify Forms. You'll find them under the Forms tab of the Netlify project, where you can also turn on email notifications.

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
| `/yachts/<handle>` | `netlify/functions/yacht-page.mjs` | One page per yacht: gallery, rates, calendar, enquiry form |
| `/yacht-charter/<area>` | `netlify/functions/area-page.mjs` | One page per charter area with the yachts that depart there |
| `/sitemap.xml` | `netlify/functions/sitemap.mjs` | Every page, yacht and area, for Google |

Shared header, footer and helpers: `netlify/lib/site.mjs`. After changing CSS or JS, bump the `?v=` on every `<link>`/`<script>` (all `.html` files and `netlify/lib/site.mjs`, `yacht-page.mjs`, `area-page.mjs`).

## Run locally

    python3 -m http.server 8000

Then open http://localhost:8000

## Enquiries backend (Netlify + Google Sheet)

Website form → Netlify Forms → `netlify/functions/enquiry-to-sheet.mts` → Google Apps Script → "Yachtique" Google Sheet (Enquiries tab) + branded emails (alert to yachtiquemiami@gmail.com, confirmation to the client).

| Piece | Where |
|---|---|
| Netlify function | `netlify/functions/enquiry-to-sheet.mts` |
| Apps Script code | `apps-script/Code.gs` (linked to the live script by `apps-script/.clasp.json`) |
| Web app URL | Netlify env var `SHEETS_WEBHOOK_URL` (Functions scope) |
| Shared secret | Netlify env var `SHEETS_SECRET` **and** Apps Script → Project Settings → Script Properties `SHEETS_SECRET`. Never in this repo. |

`/netlify/*`, `/apps-script/*` and `/README.md` are blocked from the public site in `netlify.toml`.

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
5. Test: send an enquiry on yachtique.co. You should get a new row in the Sheet and both emails within seconds.

## Client proposals (yachtique.co/p/ID)

A private page per client request, instead of a PDF. Not in Google, not in the sitemap: only people with the link see it.

1. Open the **Proposals** tab in the Yachtique Google Sheet (it appears after the first proposal is opened; the example row shows the format).
2. Add **one row per yacht option**, all with the same **ID** (short and hard to guess, e.g. `oct24-k9m4`).
   - First row: client name (optional), date (YYYY-MM-DD), guests, time, pickup, terms (one per line), valid until, language (`es` opens it in Spanish).
   - Every row: yacht (`kilauea`, `Kilauea` or its yachtique.co link), label (e.g. "Best value"), a short note, and prices for 4, 6 and 8 hours (blank = website rates).
3. Send the client **yachtique.co/p/ID**. Photos, specs and live availability come from the fleet automatically; edits show within a minute.

Each "Choose" button opens WhatsApp with the yacht, length and price written. Opens and choices are counted in the Insights tab.
