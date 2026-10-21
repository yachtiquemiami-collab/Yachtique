// GET /sitemap.xml
// Built from the live fleet so every yacht page and area page is listed for Google.
// Add any new static page to PAGES below.
import { SITE, AREAS, loadFleet } from "../lib/site.mjs";

const PAGES = ["/", "/faq.html", "/terms.html", "/privacy.html"];

export default async (req) => {
  const fleet = (await loadFleet(req)) || [];
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...PAGES.map((p) => ({ loc: SITE + p, priority: p === "/" ? "1.0" : "0.4" })),
    ...AREAS.map((a) => ({ loc: `${SITE}/yacht-charter/${a.slug}`, priority: "0.8" })),
    ...fleet.map((y) => ({ loc: `${SITE}/yachts/${y.handle}`, priority: "0.7" })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Netlify-CDN-Cache-Control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};

export const config = { path: "/sitemap.xml", preferStatic: false };
