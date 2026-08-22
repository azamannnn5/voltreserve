// GET /.netlify/functions/sitemap  ->  public, returns sitemap.xml
//
// Wired up via netlify.toml as a rewrite from /sitemap.xml, so the public
// URL never changes (robots.txt keeps pointing at /sitemap.xml).
//
// WHY THIS EXISTS: individual product/accessory/solar-panel pages
// (product.html?id=...) previously weren't listed in sitemap.xml at all,
// and hand-maintaining that list would immediately go stale, since
// products/accessories/solar panels are added and removed through
// admin.html without a redeploy. This function queries the same Supabase
// tables admin.html writes to, so the sitemap always reflects what's
// actually live, no redeploy required.
//
// Static marketing pages (home, series pages, blog, etc.) are still
// listed directly below, they only change on a code deploy, so a static
// list for those is fine.
//
// Read-only, no admin key required, mirrors the public GET behavior of
// products.js / accessories.js / solar.js.
//
// Env vars required (same as products.js):
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

const { createClient } = require("@supabase/supabase-js");

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const DOMAIN = "https://voltreservepower.com";

// Static pages that don't come from the database. [path, priority, changefreq]
// The homepage's path is "" rather than "index.html" so its <loc> below
// resolves to the bare domain (https://voltreservepower.com/) - the
// canonical address for the homepage, matching the canonical tag in
// index.html and the "/" links used site-wide instead of "index.html".
const STATIC_PAGES = [
  ["", "1.0", "weekly"],
  ["products.html", "0.9", "weekly"],
  ["river.html", "0.8", "weekly"],
  ["delta.html", "0.8", "weekly"],
  ["delta-pro.html", "0.8", "weekly"],
  ["trail.html", "0.8", "weekly"],
  ["solar.html", "0.7", "weekly"],
  ["accessories.html", "0.7", "weekly"],
  ["kits.html", "0.7", "weekly"],
  ["compare.html", "0.6", "monthly"],
  ["guide.html", "0.6", "monthly"],
  ["blog-watt-hours.html", "0.6", "monthly"],
  ["blog-solar-basics.html", "0.6", "monthly"],
  ["blog-blackout-prep.html", "0.6", "monthly"],
  ["about.html", "0.5", "monthly"],
  ["contact.html", "0.5", "monthly"],
  ["faq.html", "0.5", "monthly"],
  ["shipping.html", "0.4", "monthly"],
  ["privacy.html", "0.3", "monthly"],
  ["terms.html", "0.3", "monthly"]
];

// Power Kits are now admin-editable too (see bundles.js), so they're
// queried live from Supabase below just like products/accessories/solar.
// This list is only a fallback for sites that haven't set up Supabase
// yet at all (see the `if (supabase)` check below), matching the 14
// kits that ship as the static BUNDLES fallback in products-data.js.
const FALLBACK_BUNDLE_IDS = [
  "kit-weekend-camper", "kit-home-office-ups", "river-3-max",
  "river-3-max-plus", "kit-everyday-backup", "kit-expandable-starter",
  "kit-serious-backup", "kit-off-grid", "kit-trail-ultralight",
  "kit-solar-starter", "kit-home-office-advanced", "kit-delta-home-backup",
  "kit-delta-pro-portable", "kit-budget-camper"
];

function urlEntry(loc, priority, changefreq, lastmod) {
  const lastmodTag = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : "";
  return `  <url><loc>${loc}</loc>${lastmodTag}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

// Clean, permanent address for any item id - mirrors prettyProductUrl()
// in js/main.js and the equivalent in netlify/edge-functions/
// bot-prerender.js and netlify/functions/product-page.js (duplicated
// here for the same reason the id-prefix scheme itself is duplicated
// across all of them - separate JS runtimes that can't share this file).
function prettyPath(rawId) {
  if (rawId.startsWith("accessory:")) return `/accessories/${encodeURIComponent(rawId.slice("accessory:".length))}`;
  if (rawId.startsWith("solar:")) return `/solar/${encodeURIComponent(rawId.slice("solar:".length))}`;
  if (rawId.startsWith("bundle:")) return `/kits/${encodeURIComponent(rawId.slice("bundle:".length))}`;
  return `/products/${encodeURIComponent(rawId)}`;
}

exports.handler = async () => {
  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600"
  };

  const entries = STATIC_PAGES.map(([p, priority, freq]) => urlEntry(`${DOMAIN}/${p}`, priority, freq));

  if (supabase) {
    // Each table queried independently and tolerantly, a failure on one
    // (e.g. table doesn't exist yet) should never take down the whole
    // sitemap, the static pages above always need to keep working.
    const [products, accessories, solarPanels, bundles] = await Promise.all([
      supabase.from("products").select("id, updated_at").then(r => r.data || [], () => []),
      supabase.from("accessories").select("id, updated_at").then(r => r.data || [], () => []),
      supabase.from("solar_panels").select("id, updated_at").then(r => r.data || [], () => []),
      supabase.from("bundles").select("id, updated_at").then(r => r.data || [], () => [])
    ]);

    products.forEach(row => {
      entries.push(urlEntry(`${DOMAIN}${prettyPath(row.id)}`, "0.7", "weekly", row.updated_at));
    });
    accessories.forEach(row => {
      entries.push(urlEntry(`${DOMAIN}${prettyPath("accessory:" + row.id)}`, "0.5", "weekly", row.updated_at));
    });
    solarPanels.forEach(row => {
      entries.push(urlEntry(`${DOMAIN}${prettyPath("solar:" + row.id)}`, "0.5", "weekly", row.updated_at));
    });
    // Bundles table starts empty until "Load starting kits" is run in
    // admin.html, so fall back to the known static kit list if it's
    // empty, rather than silently dropping all 14 kits from the sitemap.
    (bundles.length ? bundles : FALLBACK_BUNDLE_IDS.map(id => ({ id, updated_at: null }))).forEach(row => {
      entries.push(urlEntry(`${DOMAIN}${prettyPath("bundle:" + row.id)}`, "0.6", "monthly", row.updated_at));
    });
  } else {
    // Supabase isn't configured at all yet, the sitemap still returns
    // successfully with the static pages plus the known static kit list,
    // matching how products.js degrades.
    FALLBACK_BUNDLE_IDS.forEach(id => {
      entries.push(urlEntry(`${DOMAIN}${prettyPath("bundle:" + id)}`, "0.6", "monthly"));
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  return { statusCode: 200, headers, body: xml };
};
