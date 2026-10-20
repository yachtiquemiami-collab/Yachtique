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
