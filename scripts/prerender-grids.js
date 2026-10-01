#!/usr/bin/env node
/*
 * prerender-grids.js
 *
 * WHY: every catalog page (products.html, river.html, delta.html, ...) builds
 * its product cards with JavaScript, so the raw HTML that a crawler downloads
 * has an EMPTY grid and therefore zero links to the product pages. Google can
 * render JavaScript, but on a new site it does so slowly, which is one reason
 * many product URLs sit in "Discovered - currently not indexed".
 *
 * WHAT: this script writes real, crawlable product cards (image, name link,
 * tagline, price) straight into each page's HTML, using the bundled fallback
 * catalog in js/products-data.js. When a visitor's browser loads the page,
 * js/main.js still re-renders the grid from the live database exactly as
 * before and simply replaces these cards, so nothing changes for shoppers.
 *
 * HOW TO RUN (from the project root, after changing products-data.js):
 *     node scripts/prerender-grids.js
 * It is safe to run repeatedly: it only rewrites what sits between the
 *     <!--ssr-grid--> ... <!--/ssr-grid-->
 * markers inside each grid container.
 *
 * NOTE: products added later through admin.html live in the database, not in
 * products-data.js. They still appear for shoppers (JS render) and in
 * sitemap.xml, but will only show up in this static HTML after the fallback
 * catalog is updated and this script is re-run.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const code = fs.readFileSync(path.join(ROOT, "js", "products-data.js"), "utf8");
const data = vm.runInNewContext(
  code + ";({ PRODUCTS: FALLBACK_PRODUCTS, BUNDLES, ACCESSORIES, SOLAR_PANELS })",
  {}
);

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const money = (n) => "$" + Number(n).toLocaleString("en-US");
const asset = (p) => (!p ? "" : /^([a-z]+:)?\/\//i.test(p) || p.startsWith("/") ? p : "/" + p);
const pretty = {
  product: (id) => `/products/${encodeURIComponent(id)}`,
  accessory: (id) => `/accessories/${encodeURIComponent(id)}`,
  solar: (id) => `/solar/${encodeURIComponent(id)}`,
  bundle: (id) => `/kits/${encodeURIComponent(id)}`,
};

function img(src, alt) {
  return src
    ? `<img src="${esc(asset(src))}" alt="${esc(alt)}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:20px;">`
    : "";
}

function card({ url, tag, badge, visual, name, tagline, spec, price, compareAt, cta }) {
  return `
      <article class="product-card">
        <a href="${url}" class="product-visual" aria-label="${esc(name)} details">
          ${badge ? `<span class="badge">${esc(badge)}</span>` : ""}
          <span class="series-tag">${esc(tag)}</span>
          ${visual}
        </a>
        <div class="product-body">
          <a href="${url}"><h3>${esc(name)}</h3></a>
          <p class="tagline">${esc(tagline)}</p>
          ${spec ? `<div class="spec-row">${spec}</div>` : ""}
          <div class="price-row">
            <div>
              <span class="price">${money(price)}</span>${compareAt ? ` <span style="font-size:0.78rem; color:var(--text-faint); text-decoration:line-through; margin-left:6px;">${money(compareAt)}</span>` : ""}
            </div>
            <a href="${url}" class="btn btn-secondary btn-sm">${esc(cta)}</a>
          </div>
        </div>
      </article>`;
}

const byId = (id) => data.PRODUCTS.find((p) => p.id === id);

const renderers = {
  products: (series) =>
    data.PRODUCTS.filter((p) => !series || p.series === series)
      .map((p) =>
        card({
          url: pretty.product(p.id),
          tag: String(p.series).replace("_", " "),
          badge: p.badge,
          visual: img(p.images && p.images[0], p.name),
          name: p.name,
          tagline: p.tagline,
          spec: `<span>Capacity <strong>${esc(p.capacityLabel)}</strong></span><span>Output <strong>${esc(p.outputW)}W</strong></span>`,
          price: p.price,
          compareAt: p.ecoflowPrice,
          cta: "View details",
        })
      )
      .join(""),
  bundles: (limit) =>
    data.BUNDLES.slice(0, limit || data.BUNDLES.length)
      .map((b) => {
        const base = byId(b.productId);
        const includes = [base ? base.name : ""].concat(b.accessories || []).filter(Boolean).join(" + ");
        return card({
          url: pretty.bundle(b.id),
          tag: "KIT",
          badge: b.badge,
          visual: img(b.image || (base && base.images && base.images[0]), b.name),
          name: b.name,
          tagline: b.tagline,
          spec: `<span>Includes: <strong>${esc(includes)}</strong></span>`,
          price: b.price,
          compareAt: b.compareAt,
          cta: "View kit",
        });
      })
      .join(""),
  accessories: () =>
    data.ACCESSORIES.map((a) =>
      card({
        url: pretty.accessory(a.id),
        tag: String(a.category || "").toUpperCase(),
        visual: img(a.images && a.images[0], a.name),
        name: a.name,
        tagline: a.tagline,
        spec: `<span>Fits: <strong>${esc((a.compatibleWith || []).map((id) => (byId(id) || {}).name || id).join(", "))}</strong></span>`,
        price: a.price,
        cta: "View details",
      })
    ).join(""),
  solar: () =>
    data.SOLAR_PANELS.map((s) =>
      card({
        url: pretty.solar(s.id),
        tag: `${s.watts}W`,
        visual: img(s.images && s.images[0], s.name),
        name: s.name,
        tagline: s.tagline,
        spec: `<span>Pairs well with: <strong>${esc((s.compatibleWith || []).map((id) => (byId(id) || {}).name || id).slice(0, 2).join(", "))}</strong></span>`,
        price: s.price,
        cta: "View details",
      })
    ).join(""),
};

// page -> [container id, renderer name, argument]
const PAGES = {
  "products.html": ["product-grid", "products", null],
  "river.html": ["product-grid", "products", "RIVER"],
  "delta.html": ["product-grid", "products", "DELTA"],
  "delta-pro.html": ["product-grid", "products", "DELTA_PRO"],
  "trail.html": ["product-grid", "products", "TRAIL"],
  "solar.html": ["solar-grid", "solar", null],
  "accessories.html": ["accessory-grid", "accessories", null],
  "kits.html": ["bundle-grid", "bundles", null],
  "index.html": ["kits-teaser-grid", "bundles", 3],
};

const START = "<!--ssr-grid-->";
const END = "<!--/ssr-grid-->";

let changed = 0;
for (const [file, [containerId, renderer, arg]] of Object.entries(PAGES)) {
  const fp = path.join(ROOT, file);
  let html = fs.readFileSync(fp, "utf8");
  const html2 = renderers[renderer](arg);
  const block = `${START}${html2}\n    ${END}`;

  const marked = new RegExp(`(<div class="product-grid" id="${containerId}">)${START}[\\s\\S]*?${END}(</div>)`);
  const empty = new RegExp(`(<div class="product-grid" id="${containerId}">)(</div>)`);
  let next;
  if (marked.test(html)) next = html.replace(marked, (_, a, b) => a + block + b);
  else if (empty.test(html)) next = html.replace(empty, (_, a, b) => a + block + b);
  else {
    console.warn(`! ${file}: container #${containerId} not found, skipped`);
    continue;
  }
  if (next !== html) {
    fs.writeFileSync(fp, next);
    changed++;
  }
  const links = (block.match(/<h3>/g) || []).length;
  console.log(`${file}: ${links} product links written into #${containerId}`);
}
console.log(`Done. ${changed} file(s) updated.`);
