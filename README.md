# Yachtique

Website for Yachtique, a yacht broker and concierge in Miami: https://yachtique.co

It's a plain static site (HTML, CSS, JS), with no build step. Netlify publishes it straight from this repo.

## Common edits

| What | Where |
|---|---|
| Markup, hidden yachts, price overrides | `netlify/fleet-config.mjs` |
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
