// GET /.netlify/functions/product-page?id=...
//
// Server-rendered version of product.html, used ONLY by the bot-prerender
// edge function (netlify/edge-functions/bot-prerender.js) for requests
// from known search-engine/crawler/link-preview user agents. Real
// visitors never hit this function directly - they keep getting the
// exact same product.html + client-side JS experience as before, byte
// for byte unchanged.
//
// WHY THIS EXISTS: product.html builds its entire visible content with
// JavaScript after the page loads (see js/main.js renderProductDetail()).
// That's fine for real visitors, but it means a crawler that doesn't run
// JavaScript (most link-preview bots, some search crawlers on their
// first pass) sees an almost-empty page. This function returns the same
// page with the real product/accessory/solar-panel/kit content already
// in the HTML, so those crawlers see the actual title, description,
// price, and photo immediately - no JavaScript required. A crawler that
// DOES run JavaScript (Googlebot eventually does) still loads the same
// js/main.js afterward, which harmlessly re-renders the identical data
// into the same container.
//
// This is "dynamic rendering", a long-established, Google-endorsed
// pattern (serving pre-rendered HTML to crawlers while real users get the
// normal client-rendered page) - not cloaking, because the content shown
// to the crawler matches what a real visitor's browser ends up showing
// once js/main.js runs. Nothing about product.html itself, or any other
// page, changes because this function exists.
//
// The page shell (header/nav/footer) below is a deliberate COPY of
// product.html's markup, kept inline here rather than read from disk at
// runtime - Netlify Functions only reliably bundle files that live
// inside their own netlify/functions/ directory (like the JSON files in
// ./data/), and product.html lives at the site root outside that
// directory. If product.html's shared header/nav/footer ever changes,
// this copy should be updated to match (see the "KEEP IN SYNC" markers
// below).
//
// Env vars used (all optional, same as products.js/accessories.js/etc.
// - this function degrades to the bundled fallback catalogs, same as the
// live site does, if none of these are set):
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

const { createClient } = require("@supabase/supabase-js");

const fallbackProducts = require("./data/fallback-products.json");
const fallbackAccessories = require("./data/fallback-accessories.json");
const fallbackSolar = require("./data/fallback-solar.json");
const fallbackBundles = require("./data/fallback-bundles.json");

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const DOMAIN = "https://voltreservepower.com";

const SERIES_INFO = {
  RIVER: { label: "RIVER Series", slug: "river.html" },
  DELTA: { label: "DELTA Series", slug: "delta.html" },
  DELTA_PRO: { label: "DELTA Pro Series", slug: "delta-pro.html" },
  TRAIL: { label: "TRAIL Series", slug: "trail.html" }
};

// Clean, permanent address for any item id - mirrors prettyProductUrl()
// in js/main.js and rawIdToPrettyPath() in netlify/edge-functions/
// bot-prerender.js (duplicated here for the same reason the id-prefix
// scheme itself is duplicated across all three - separate JS runtimes
// that can't share this file).
function prettyPath(rawId) {
  if (rawId.startsWith("accessory:")) return `/accessories/${encodeURIComponent(rawId.slice("accessory:".length))}`;
  if (rawId.startsWith("solar:")) return `/solar/${encodeURIComponent(rawId.slice("solar:".length))}`;
  if (rawId.startsWith("bundle:")) return `/kits/${encodeURIComponent(rawId.slice("bundle:".length))}`;
  return `/products/${encodeURIComponent(rawId)}`;
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// JSON.stringify() does NOT escape "<" - if an admin-entered product/
// accessory/solar-panel/kit name or description ever contained a literal
// "</script>", embedding raw JSON.stringify() output inside a <script>
// tag would let that string prematurely close the script element and
// have the HTML parser treat whatever comes after as real markup - a
// classic JSON-in-<script> injection. Escaping "<" to its JSON-safe
// < form (still valid JSON, and JSON.parse() reads it back
// identically) closes that off, same escaping policy this codebase
// already applies everywhere else admin-editable text reaches HTML.
function safeJsonForScriptTag(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// ---------- Data lookup (live Supabase table, falling back to the
// bundled JSON catalogs) - mirrors js/main.js's cartItemLookup() prefix
// scheme: bare id = product, "accessory:x", "solar:x", "bundle:x". ----------
async function fetchTable(table, fallbackRows) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(rowMappers[table]);
      }
    } catch (err) {
      console.warn(`product-page: live ${table} unavailable, using bundled fallback.`, err);
    }
  }
  return fallbackRows;
}

const rowMappers = {
  products: (row) => ({
    id: row.id, series: row.series, capacityTier: row.capacity_tier, name: row.name,
    tagline: row.tagline, capacityWh: row.capacity_wh, capacityLabel: row.capacity_label,
    outputW: row.output_w, outputLabel: row.output_label, chargeTime: row.charge_time,
    weight: row.weight, price: row.price, ecoflowPrice: row.ecoflow_price, useCase: row.use_case,
    badge: row.badge, description: row.description, hook: row.hook, bullets: row.bullets || [],
    whoFor: row.who_for || [], whatsInBox: row.whats_in_box, inStock: row.in_stock !== false,
    images: row.images || [], sortOrder: row.sort_order
  }),
  accessories: (row) => ({
    id: row.id, category: row.category, name: row.name, tagline: row.tagline, price: row.price,
    compatibleWith: row.compatible_with || [], description: row.description, images: row.images || [],
    sortOrder: row.sort_order
  }),
  solar_panels: (row) => ({
    id: row.id, name: row.name, tagline: row.tagline, watts: row.watts, price: row.price,
    compatibleWith: row.compatible_with || [], description: row.description, images: row.images || [],
    sortOrder: row.sort_order
  }),
  bundles: (row) => ({
    id: row.id, name: row.name, tagline: row.tagline, productId: row.product_id,
    accessories: row.accessories || [], price: row.price, compareAt: row.compare_at,
    badge: row.badge, useCase: row.use_case, description: row.description, image: row.image,
    sortOrder: row.sort_order
  })
};

async function lookupItem(rawId) {
  if (rawId.startsWith("accessory:")) {
    const id = rawId.slice("accessory:".length);
    const list = await fetchTable("accessories", fallbackAccessories);
    const a = list.find(x => x.id === id);
    return a ? { kind: "accessory", data: a } : null;
  }
  if (rawId.startsWith("solar:")) {
    const id = rawId.slice("solar:".length);
    const list = await fetchTable("solar_panels", fallbackSolar);
    const s = list.find(x => x.id === id);
    return s ? { kind: "solar", data: s } : null;
  }
  if (rawId.startsWith("bundle:")) {
    const id = rawId.slice("bundle:".length);
    const list = await fetchTable("bundles", fallbackBundles);
    const b = list.find(x => x.id === id);
    return b ? { kind: "bundle", data: b } : null;
  }
  const list = await fetchTable("products", fallbackProducts);
  const p = list.find(x => x.id === rawId);
  return p ? { kind: "product", data: p } : null;
}

async function findRelatedProduct(productId) {
  const products = await fetchTable("products", fallbackProducts);
  return products.find(p => p.id === productId) || null;
}

// ---------- Visible content (goes inside #product-detail) ----------
function renderDetailHTML({ kind, data, relatedProduct }) {
  const name = data.name;
  const price = data.price;
  const description = data.description || data.tagline || "";
  const images = data.images || (data.image ? [data.image] : []);
  const mainImage = images.length ? images[0] : null;
  const eyebrow = kind === "product" ? `${data.series || ""} SERIES`.replace("_", " ")
    : kind === "solar" ? "SOLAR PANEL"
    : kind === "bundle" ? "POWER KIT"
    : (data.category ? data.category.toUpperCase() : "ACCESSORY");

  const imageHtml = mainImage
    ? `<img src="${escapeHtml(DOMAIN + '/' + mainImage)}" alt="${escapeHtml(name)}" style="width:100%; height:100%; object-fit:contain; padding:20px;">`
    : `<div class="device-icon"><div class="wh-lbl">${escapeHtml(name)}</div></div>`;

  const specsHtml = kind === "product" ? `
    <div class="detail-specs">
      <div class="spec-box"><div class="num">${escapeHtml(data.capacityLabel || "")}</div><div class="lbl">Capacity</div></div>
      <div class="spec-box"><div class="num">${escapeHtml(data.outputLabel || "")}</div><div class="lbl">AC Output</div></div>
      <div class="spec-box"><div class="num">${escapeHtml(data.chargeTime || "")}</div><div class="lbl">Charge Time</div></div>
      <div class="spec-box"><div class="num">${escapeHtml(data.weight || "")}</div><div class="lbl">Weight</div></div>
    </div>
  ` : "";

  const bulletsHtml = kind === "product" && data.bullets && data.bullets.length
    ? `<ul class="detail-bullets">${data.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";

  const priceHtml = kind === "bundle" && data.compareAt
    ? `<div class="price" style="font-size:2rem;">$${Number(price).toLocaleString()} <span style="font-size:1rem; text-decoration:line-through; color:var(--text-faint);">$${Number(data.compareAt).toLocaleString()}</span></div>`
    : `<div class="price" style="font-size:2rem;">$${Number(price).toLocaleString()}</div>`;

  const includesHtml = kind === "bundle"
    ? `<p style="color:var(--text); margin-bottom:16px;">Includes: <strong>${escapeHtml(relatedProduct ? relatedProduct.name : "")}</strong>${(data.accessories || []).map(a => ` + <strong>${escapeHtml(a)}</strong>`).join("")}</p>`
    : "";

  return `
    <div class="detail-visual">
      <div class="product-visual">
        ${data.badge ? `<span class="badge">${escapeHtml(data.badge)}</span>` : ""}
        <span class="series-tag">${escapeHtml(eyebrow)}</span>
        ${imageHtml}
      </div>
    </div>
    <div>
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h1>${escapeHtml(name)}</h1>
      <p style="margin-top:12px; font-size:1.05rem;">${escapeHtml(description)}</p>
      ${bulletsHtml}
      ${specsHtml}
      ${includesHtml}
      ${priceHtml}
      <p style="font-size:0.85rem; color:var(--text-faint); margin-top:12px;">No payment now, a team member confirms details and payment with you directly after you submit your order.</p>
    </div>
  `;
}

function renderBreadcrumbsHTML({ kind, data }) {
  const base = `<a href="${DOMAIN}/">Home</a><span style="color:var(--text-faint); margin:0 6px;">/</span><a href="${DOMAIN}/products.html">Shop</a>`;
  if (kind === "product" && data.series && SERIES_INFO[data.series]) {
    const s = SERIES_INFO[data.series];
    return `${base}<span style="color:var(--text-faint); margin:0 6px;">/</span><a href="${DOMAIN}/${s.slug}">${escapeHtml(s.label)}</a><span style="color:var(--text-faint); margin:0 6px;">/</span><span style="color:var(--text);">${escapeHtml(data.name)}</span>`;
  }
  return `${base}<span style="color:var(--text-faint); margin:0 6px;">/</span><span style="color:var(--text);">${escapeHtml(data.name)}</span>`;
}

// ---------- Full page shell ----------
// KEEP IN SYNC with product.html's <head>/<header>/<footer> if those ever
// change - see the file-level comment above for why this is a copy
// rather than a shared include.
function renderPage({ kind, data, relatedProduct, pageUrl, rawId }) {
  const name = data.name;
  const description = (data.description || data.tagline || "").slice(0, 200);
  const images = data.images || (data.image ? [data.image] : []);
  const ogImage = images.length ? `${DOMAIN}/${images[0]}` : `${DOMAIN}/images/lifestyle/hero-lakeside.jpg`;
  const title = `${escapeHtml(name)}, VoltReserve`;

  const category = kind === "product" ? (data.series ? `${data.series} Series`.replace("_", " ") : "Power Station")
    : kind === "solar" ? "Solar Panel"
    : kind === "bundle" ? "Power Kit"
    : (data.category || "Accessory");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": data.description || data.tagline || "",
    "sku": rawId,
    "category": category,
    "brand": { "@type": "Brand", "name": kind === "bundle" ? "VoltReserve" : "EcoFlow" },
    "image": images.length ? `${DOMAIN}/${images[0]}` : undefined,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": data.price,
      "availability": (kind === "product" && data.inStock === false) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      "url": pageUrl,
      "seller": { "@type": "Organization", "name": "VoltReserve", "url": `${DOMAIN}/` }
    }
  };

  // Breadcrumb trail as structured data too, matching the visible trail
  // renderBreadcrumbsHTML() builds below.
  const breadcrumbItems = [
    { name: "Home", url: `${DOMAIN}/` },
    { name: "Shop", url: `${DOMAIN}/products.html` }
  ];
  if (kind === "product" && data.series && SERIES_INFO[data.series]) {
    breadcrumbItems.push({ name: SERIES_INFO[data.series].label, url: `${DOMAIN}/${SERIES_INFO[data.series].slug}` });
  }
  breadcrumbItems.push({ name, url: pageUrl });
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, i) => ({
      "@type": "ListItem", "position": i + 1, "name": item.name, "item": item.url
    }))
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="${DOMAIN}/favicon.svg">
<link rel="icon" type="image/x-icon" href="${DOMAIN}/favicon.ico">
<title>${title}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="VoltReserve">
<meta property="og:title" content="${escapeHtml(name)} | VoltReserve">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${DOMAIN}/css/style.css">
<script type="application/ld+json" id="product-schema">${safeJsonForScriptTag(jsonLd)}</script>
<script type="application/ld+json" id="breadcrumb-schema">${safeJsonForScriptTag(breadcrumbJsonLd)}</script>
</head>
<body>

<header class="site-header">
  <nav class="nav">
    <a href="${DOMAIN}/" class="logo"><svg class="logo-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align:-5px; margin-right:2px;">
        <circle cx="12" cy="12" r="11" fill="#1e7800"/>
        <path d="M13 4L6 13.5H11L10 20L18 10H12L13 4Z" fill="#ffffff"/>
      </svg> VoltReserve</a>
    <div class="nav-links">
      <a href="${DOMAIN}/">Home</a>
      <a href="${DOMAIN}/products.html">All Products</a>
      <a href="${DOMAIN}/river.html">RIVER Series</a>
      <a href="${DOMAIN}/delta.html">DELTA Series</a>
      <a href="${DOMAIN}/delta-pro.html">DELTA Pro Series</a>
      <a href="${DOMAIN}/trail.html">TRAIL Series</a>
      <a href="${DOMAIN}/solar.html">Solar Panels</a>
      <a href="${DOMAIN}/accessories.html">Extra Batteries &amp; Accessories</a>
      <a href="${DOMAIN}/kits.html">Power Kits</a>
      <a href="${DOMAIN}/guide.html">Buying Guide</a>
      <a href="${DOMAIN}/about.html">About</a>
      <a href="${DOMAIN}/contact.html">Contact</a>
    </div>
  </nav>
</header>

<section style="padding-bottom:20px;">
  <div class="container">
    <div class="breadcrumbs" id="product-breadcrumbs">${renderBreadcrumbsHTML({ kind, data })}</div>
  </div>
</section>

<section style="padding-top:0;">
  <div class="container detail-grid" id="product-detail">${renderDetailHTML({ kind, data, relatedProduct })}</div>
</section>

<section style="padding-top:0;">
  <div class="container" style="max-width:900px;">
    <div class="product-tabs" id="product-tabs"></div>
  </div>
</section>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a href="${DOMAIN}/" class="logo"><svg class="logo-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align:-5px; margin-right:2px;">
        <circle cx="12" cy="12" r="11" fill="#1e7800"/>
        <path d="M13 4L6 13.5H11L10 20L18 10H12L13 4Z" fill="#ffffff"/>
      </svg> VoltReserve</a>
        <p style="margin-top:14px; font-size:0.88rem; max-width:260px;">Portable power stations for home backup, camping, and off-grid living.</p>
        <p style="margin-top:14px; font-size:0.82rem; color:#9c9ca4;">Mon–Fri 8AM–7PM CST &middot; Sat 9AM–4PM CST<br>contact@voltreservepower.com</p>
      </div>
      <div>
        <h4>Shop</h4>
        <ul>
          <li><a href="${DOMAIN}/products.html">All Products</a></li>
          <li><a href="${DOMAIN}/river.html">RIVER Series</a></li>
          <li><a href="${DOMAIN}/delta.html">DELTA Series</a></li>
          <li><a href="${DOMAIN}/delta-pro.html">DELTA Pro Series</a></li>
          <li><a href="${DOMAIN}/trail.html">TRAIL Series</a></li>
          <li><a href="${DOMAIN}/solar.html">Solar Panels</a></li>
          <li><a href="${DOMAIN}/accessories.html">Accessories</a></li>
          <li><a href="${DOMAIN}/kits.html">Power Kits</a></li>
        </ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="${DOMAIN}/about.html">About</a></li>
          <li><a href="${DOMAIN}/contact.html">Contact</a></li>
          <li><a href="${DOMAIN}/guide.html">Buying Guide</a></li>
          <li><a href="${DOMAIN}/faq.html">FAQ</a></li>
          <li><a href="${DOMAIN}/compare.html">Compare</a></li>
        </ul>
      </div>
      <div>
        <h4>Policies</h4>
        <ul>
          <li><a href="${DOMAIN}/shipping.html">Shipping &amp; Returns</a></li>
          <li><a href="${DOMAIN}/privacy.html">Privacy Policy</a></li>
          <li><a href="${DOMAIN}/terms.html">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 VoltReserve. Independent reseller, not affiliated with EcoFlow Inc.</span>
      <span>Made for real off-grid power needs.</span>
    </div>
  </div>
</footer>

<script src="${DOMAIN}/js/products-data.js"></script>
<script src="${DOMAIN}/js/products-loader.js"></script>
<script src="${DOMAIN}/js/main.js"></script>
<script>
  // For any crawler capable of running this: re-render with live data
  // exactly like the real product.html does, harmlessly replacing the
  // server-rendered content above with the same (or fresher) values.
  renderProductDetail();
  PRODUCTS_READY.then(renderProductDetail);
</script>

</body>
</html>
`;
}

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Not Found | VoltReserve</title>
<meta name="robots" content="noindex">
</head>
<body>
<p>That product could not be found. <a href="${DOMAIN}/products.html">See all products</a>.</p>
</body>
</html>
`;

exports.handler = async (event) => {
  const rawId = (event.queryStringParameters && event.queryStringParameters.id) || "";
  if (!rawId) {
    return { statusCode: 404, headers: { "Content-Type": "text/html; charset=utf-8" }, body: NOT_FOUND_HTML };
  }

  let found;
  try {
    found = await lookupItem(rawId);
  } catch (err) {
    console.error("product-page: lookup failed", err);
    return { statusCode: 500, headers: { "Content-Type": "text/html; charset=utf-8" }, body: NOT_FOUND_HTML };
  }

  if (!found) {
    return { statusCode: 404, headers: { "Content-Type": "text/html; charset=utf-8" }, body: NOT_FOUND_HTML };
  }

  const relatedProduct = found.kind === "bundle" && found.data.productId
    ? await findRelatedProduct(found.data.productId)
    : null;

  const pageUrl = `${DOMAIN}${prettyPath(rawId)}`;
  const html = renderPage({ kind: found.kind, data: found.data, relatedProduct, pageUrl, rawId });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Short cache - this reflects admin-editable data, same freshness
      // expectation as products.js's own Cache-Control.
      "Cache-Control": "public, max-age=300"
    },
    body: html
  };
};
