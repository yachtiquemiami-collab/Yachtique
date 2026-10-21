// GET /shortlist
// The visitor's saved yachts side by side. The list lives in their browser (assets/js/core.js);
// /shortlist?y=handle1,handle2 opens a list someone shared, so a group can decide together.
import { SITE, V, page, html } from "../lib/site.mjs";

export default async () => html(page({
  title: "Your shortlist | Yachtique",
  description: "Compare the yachts you saved: size, guests, rates, departure points and availability.",
  canonical: `${SITE}/shortlist`,
  robots: "noindex",
  es: {
    _title: "Mi selección | Yachtique",
    "sl.eyebrow": "Mi selección", "sl.title": "Compare sus yates",
    "sl.intro": "Los yates que guardó, uno al lado del otro. Elija una fecha para ver cuáles están libres y envíe la lista a su grupo o a nosotros.",
  },
  body: `
<main class="ypage slpage">
  <div class="container">
    <header class="avhead">
      <p class="eyebrow" data-i18n="sl.eyebrow">Your shortlist</p>
      <h1 class="ypage__title" data-i18n="sl.title">Compare your yachts</h1>
      <p class="lead" data-i18n="sl.intro">The yachts you saved, side by side. Pick a date to see which are free, then send the list to your group or to us.</p>
    </header>
    <div id="slApp"><p class="fleet__status">…</p></div>
  </div>
</main>
<script src="/assets/js/datepicker.js?v=${V}" defer></script>
<script src="/assets/js/shortlist.js?v=${V}" defer></script>`,
}), 200);

export const config = { path: ["/shortlist", "/shortlist/"] };
