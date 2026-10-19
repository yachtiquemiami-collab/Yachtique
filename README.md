# Yachtique

Website for Yachtique, a yacht broker and concierge in Miami: https://yachtique.co

It's a plain static site (HTML, CSS, JS), with no build step. Netlify publishes it straight from this repo.

## Common edits

| What | Where |
|---|---|
| Yachts (name, model, guests, price, photo) | `assets/js/fleet.js` |
| WhatsApp number | `WHATSAPP_NUMBER` at the top of `assets/js/main.js` |
| Text and sections | `index.html` |
| Colours and fonts | top of `assets/css/styles.css` |
| Yacht photos | `assets/img/fleet/` |

Enquiries come in through Netlify Forms. You'll find them under the Forms tab of the Netlify project, where you can also turn on email notifications.

## Run locally

    python3 -m http.server 8000

Then open http://localhost:8000
