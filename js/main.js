/* ============================================
   CONFIG, edit these two lines for your business
   ============================================ */
const SALES_EMAIL = "contact@voltreservepower.com"; // fallback only - see applyLiveContactInfo, admin-editable via Site Settings

// Applies admin-edited contact info (Site Settings > Contact/Payment) to
// whichever of these elements happen to exist on the current page - most
// pages have none of them, so this is a no-op there. Called once
// immediately (uses PROMO_CONFIG's hardcoded defaults) and again once
// PRODUCTS_READY resolves with live settings, matching the instant-
// render-then-refresh pattern used everywhere else on this site. Uses
// .textContent (never innerHTML), which is inherently safe against HTML
// injection regardless of what's typed in the admin panel.
function applyLiveContactInfo() {
  const emailEl = document.getElementById("live-contact-email");
  if (emailEl && PROMO_CONFIG.contactEmail) {
    emailEl.textContent = PROMO_CONFIG.contactEmail;
    if (emailEl.tagName === "A") emailEl.href = `mailto:${PROMO_CONFIG.contactEmail}`;
  }
  ["email-display", "ship-email", "policy-email", "terms-email"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && PROMO_CONFIG.contactEmail) el.textContent = PROMO_CONFIG.contactEmail;
  });
  const phoneRow = document.getElementById("live-contact-phone-row");
  const phoneEl = document.getElementById("live-contact-phone");
  if (phoneRow && phoneEl) {
    if (PROMO_CONFIG.contactPhone) {
      phoneEl.textContent = PROMO_CONFIG.contactPhone;
      phoneRow.style.display = "";
    } else {
      phoneRow.style.display = "none";
    }
  }
  const addressRow = document.getElementById("live-contact-address-row");
  const addressEl = document.getElementById("live-contact-address");
  if (addressRow && addressEl) {
    if (PROMO_CONFIG.contactAddress) {
      addressEl.textContent = PROMO_CONFIG.contactAddress;
      addressRow.style.display = "";
    } else {
      addressRow.style.display = "none";
    }
  }
}
document.addEventListener("DOMContentLoaded", applyLiveContactInfo);
if (typeof PRODUCTS_READY !== "undefined") {
  PRODUCTS_READY.then(applyLiveContactInfo);
}

/* ============================================
   CART STORAGE
   ============================================ */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("ecoflow_cart")) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("ecoflow_cart", JSON.stringify(cart));
  updateCartCount();
}

function addToCart(id, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: id, qty: qty });
  }
  saveCart(cart);
  showToast("Added to order");
}

function removeFromCart(id) {
  let cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
  if (typeof renderCartPage === "function") renderCartPage();
}

function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart(cart);
  }
}

function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartCount() {
  document.querySelectorAll(".nav-cart .count").forEach(el => {
    el.textContent = cartCount();
  });
}

function findProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

function findBundle(id) {
  return BUNDLES.find(b => b.id === id);
}

function findAccessory(id) {
  return ACCESSORIES.find(a => a.id === id);
}

function findSolarPanel(id) {
  return SOLAR_PANELS.find(s => s.id === id);
}

// Cart item ids are prefixed by type: "bundle:x", "accessory:x", "solar:x", or a bare product id
function cartItemLookup(rawId) {
  if (rawId.startsWith("bundle:")) {
    const b = findBundle(rawId.replace("bundle:", ""));
    return b ? { kind: "bundle", data: b, name: b.name, price: b.price, thumb: "KIT" } : null;
  }
  if (rawId.startsWith("accessory:")) {
    const a = findAccessory(rawId.replace("accessory:", ""));
    return a ? { kind: "accessory", data: a, name: a.name, price: a.price, thumb: "ADD-ON" } : null;
  }
  if (rawId.startsWith("solar:")) {
    const s = findSolarPanel(rawId.replace("solar:", ""));
    return s ? { kind: "solar", data: s, name: s.name, price: s.price, thumb: s.watts + "W" } : null;
  }
  const p = findProduct(rawId);
  return p ? { kind: "product", data: p, name: p.name, price: p.price, thumb: p.capacityLabel.split(" ")[0] } : null;
}

function isBundleCartId(id) {
  return typeof id === "string" && id.startsWith("bundle:");
}

// Builds the clean, permanent SEO-friendly address for any product/
// accessory/solar-panel/kit id - e.g. "/products/river-2",
// "/accessories/river-3-waterproof-bag", "/solar/solar-45w",
// "/kits/kit-weekend-camper" - instead of the old "product.html?id=..."
// query-string form. Always absolute (leading slash) so the link resolves
// correctly no matter how deep the current page's own URL is (product.html
// itself is now served from multiple different-looking addresses via a
// Netlify rewrite, so a relative link on that page can't safely assume it
// lives at the site root anymore).
//
// Same id-prefix scheme used everywhere else in this file (see
// cartItemLookup above). This exact mapping is duplicated in
// netlify/edge-functions/bot-prerender.js and netlify/functions/
// product-page.js and sitemap.js, which run in separate JS runtimes that
// can't share this file - same reasoning as the prefix scheme itself
// already being duplicated across those files.
function prettyProductUrl(rawId) {
  if (rawId.startsWith("bundle:")) return `/kits/${encodeURIComponent(rawId.slice("bundle:".length))}`;
  if (rawId.startsWith("accessory:")) return `/accessories/${encodeURIComponent(rawId.slice("accessory:".length))}`;
  if (rawId.startsWith("solar:")) return `/solar/${encodeURIComponent(rawId.slice("solar:".length))}`;
  return `/products/${encodeURIComponent(rawId)}`;
}

// Injects (or clears) an ItemList JSON-LD block describing whatever is
// currently visible in one of the catalog grids (renderProductGrid,
// renderAccessoryGrid, renderSolarGrid, renderBundleGrid below). Lets
// search engines see the real, live list of items on products.html,
// accessories.html, solar.html, kits.html, and each series page (river/
// delta/delta-pro/trail, which reuse renderProductGrid pre-filtered to
// their series) - not just the static CollectionPage description already
// in each page's <head>. Same create-or-replace-by-id pattern as the
// Product/BreadcrumbList schema on the product detail page (see
// renderProductDetail below), scoped per container so unrelated grids on
// the same page (there aren't any today, but this is cheap insurance)
// can't clobber each other's schema. Re-run on every re-render (filters,
// search) so the schema never lags behind what's actually on screen -
// capped at 60 items so an unfiltered catalog can't produce an
// unreasonably large script tag.
function injectItemListSchema(containerId, items) {
  const scriptId = `${containerId}-itemlist-schema`;
  const existing = document.getElementById(scriptId);
  if (existing) existing.remove();
  if (!items || !items.length) return;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = scriptId;
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": items.slice(0, 60).map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "url": `https://voltreservepower.com${item.url}`
    }))
  });
  document.head.appendChild(script);
}

// Product/accessory/solar/kit photos are stored (in products-data.js and
// in the database) as root-relative paths with no leading slash, e.g.
// "images/river-2-real-1.png". That resolved fine back when product.html
// was only ever reached at the site root, but now that the same file is
// also served at nested addresses like /products/river-2 (see
// prettyProductUrl() above), a plain relative "images/..." src would
// resolve against /products/ instead of /  and 404. Every place that
// turns a stored image path into an <img src="..."> should route it
// through this first so photos keep loading regardless of how deep the
// current URL is. Already-absolute paths (leading "/") and full URLs
// pass through unchanged, so this is safe to apply everywhere.
function assetUrl(p) {
  if (!p) return p;
  if (/^([a-z]+:)?\/\//i.test(p) || p.startsWith("/")) return p;
  return `/${p}`;
}

// The reverse of prettyProductUrl(): figures out which item id the current
// page is showing. Checks the old "?id=" query string first (still
// supported so any link still written that way keeps working), then falls
// back to reading it out of the clean URL's path - product.html is served
// at "/products/x", "/accessories/x", "/solar/x" and "/kits/x" via a
// Netlify rewrite, so the browser's address bar shows the clean path with
// no query string at all, and this is the only way to know which item to
// show. Returns null if the current URL doesn't look like a product page
// at all (shouldn't normally happen, callers fall back to a default item).
function rawIdFromLocation() {
  const queryId = new URLSearchParams(window.location.search).get("id");
  if (queryId) return queryId;
  const m = window.location.pathname.match(/^\/(products|accessories|solar|kits)\/([^/]+)\/?$/);
  if (!m) return null;
  const prefixBySection = { products: "", accessories: "accessory:", solar: "solar:", kits: "bundle:" };
  return prefixBySection[m[1]] + decodeURIComponent(m[2]);
}

function addBundleToCart(bundleId, qty) {
  addToCart("bundle:" + bundleId, qty || 1);
}

function addAccessoryToCart(accessoryId, qty) {
  addToCart("accessory:" + accessoryId, qty || 1);
}

function addSolarToCart(solarId, qty) {
  addToCart("solar:" + solarId, qty || 1);
}

/* ============================================
   TOAST
   ============================================ */
function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ============================================
   NAV
   ============================================ */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".nav-dropdown-menu.open").forEach(menu => {
      if (!menu.parentElement.contains(e.target)) menu.classList.remove("open");
    });
  });
  updateCartCount();
}

/* ============================================
   DEVICE ICON (fallback visual, no external images needed)
   ============================================ */
function deviceIconHTML(product) {
  // Defensive fallback: this is only ever meant to be called with a real
  // PRODUCTS entry (which always has capacityWh/capacityLabel), but if it
  // ever gets called with something else that lacks them - as bundles
  // used to before the images-normalization fix in renderProductDetail()
  // - show the item's name instead of throwing.
  if (!product.capacityLabel) {
    return `<div class="device-icon"><div class="wh-lbl">${product.name || ""}</div></div>`;
  }
  const pct = Math.min(100, Math.round((product.capacityWh / 4096) * 100));
  return `
    <div class="device-icon">
      <div class="wh">${product.capacityLabel.split(" ")[0]}</div>
      <div class="wh-lbl">CAPACITY</div>
      <div class="bar"><span style="width:${pct}%"></span></div>
    </div>
  `;
}

/* Returns either a real product photo <img> or the fallback icon */
function productVisualHTML(product) {
  if (product.images && product.images.length > 0) {
    return `<img src="${assetUrl(product.images[0])}" alt="${product.name}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:20px;">`;
  }
  return deviceIconHTML(product);
}

/* ============================================
   PRODUCT GRID (home + products page)
   ============================================ */
function stockBadgeHTML(product) {
  return product.inStock !== false
    ? `<p class="stock-text in-stock">In Stock</p>`
    : `<p class="stock-text out-stock">Out of Stock</p>`;
}

function stockAwareButtonHTML(product, size) {
  const sizeClass = size ? ` btn-${size}` : "";
  if (product.inStock === false) {
    return `<a href="contact.html?item=${encodeURIComponent(product.name)}" class="btn btn-secondary${sizeClass}">Notify Me</a>`;
  }
  return `<button class="btn btn-secondary${sizeClass}" onclick="addToCart('${product.id}', 1)">Add to Order</button>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderProductGrid(containerId, seriesFilter, capacityFilter, searchQuery) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let list = PRODUCTS;
  if (seriesFilter && seriesFilter !== "ALL") {
    list = list.filter(p => p.series === seriesFilter);
  }
  if (capacityFilter && capacityFilter !== "ALL") {
    list = list.filter(p => p.capacityTier === capacityFilter);
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || (p.tagline && p.tagline.toLowerCase().includes(q)));
  }

  if (list.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1; color:var(--text-faint); padding:40px 0; text-align:center;">No power stations match "${escapeHtml(searchQuery)}", try a different search or clear your filters.</p>`;
    injectItemListSchema(containerId, []);
    return;
  }

  container.innerHTML = list.map(p => `
    <article class="product-card">
      <a href="${prettyProductUrl(p.id)}" class="product-visual" aria-label="${escapeHtml(p.name)} details">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <span class="series-tag">${p.series.replace("_", " ")}</span>
        ${productVisualHTML(p)}
      </a>
      <div class="product-body">
        <a href="${prettyProductUrl(p.id)}"><h3>${escapeHtml(p.name)}</h3></a>
        <p class="tagline">${escapeHtml(p.tagline)}</p>
        <div class="spec-row">
          <span>Output <strong>${p.outputW}W</strong></span>
          <span>Charge <strong>${p.chargeTime.split(" ")[0]}</strong></span>
        </div>
        <div class="price-row">
          ${p.ecoflowPrice ? `<span style="font-size:0.78rem; color:var(--text-faint); text-decoration:line-through; font-family:var(--font-mono); margin-right:4px;" data-usd-price="${p.ecoflowPrice}">$${p.ecoflowPrice.toLocaleString()}</span>` : ""}
          <span class="price" data-usd-price="${p.price}">$${p.price.toLocaleString()}</span>
          ${stockAwareButtonHTML(p, "sm")}
        </div>
        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; color:var(--text-faint); font-family:var(--font-mono); cursor:pointer; margin-top:4px;">
          <input type="checkbox" data-compare-id="${p.id}" ${getCompareList().includes(p.id) ? "checked" : ""} onchange="toggleCompare('${p.id}')" style="accent-color:var(--accent);">
          Compare
        </label>
      </div>
    </article>
  `).join("");
  injectItemListSchema(containerId, list.map(p => ({ name: p.name, url: prettyProductUrl(p.id) })));
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

function renderBundleGrid(containerId, limit, searchQuery) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let list = limit ? BUNDLES.slice(0, limit) : BUNDLES;
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(b => b.name.toLowerCase().includes(q) || (b.tagline && b.tagline.toLowerCase().includes(q)));
  }
  if (list.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1; color:var(--text-faint); padding:40px 0; text-align:center;">No kits match "${escapeHtml(searchQuery)}", try a different search.</p>`;
    injectItemListSchema(containerId, []);
    return;
  }
  container.innerHTML = list.map(b => {
    const p = findProduct(b.productId);
    const savings = b.compareAt - b.price;
    const visual = b.image
      ? `<img src="${assetUrl(b.image)}" alt="${b.name}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:20px;">`
      : (p ? productVisualHTML(p) : "");
    return `
      <article class="product-card">
        <a href="${prettyProductUrl("bundle:" + b.id)}" class="product-visual" aria-label="${b.name} details">
          ${b.badge ? `<span class="badge">${b.badge}</span>` : ""}
          <span class="series-tag">KIT</span>
          ${visual}
        </a>
        <div class="product-body">
          <a href="${prettyProductUrl("bundle:" + b.id)}"><h3>${b.name}</h3></a>
          <p class="tagline">${b.tagline}</p>
          <div class="spec-row" style="flex-direction:column; gap:4px; align-items:flex-start;">
            <span>Includes: <strong>${p ? p.name : ""}</strong></span>
            ${b.accessories.map(a => `<span>+ <strong>${a}</strong></span>`).join("")}
          </div>
          <div class="price-row">
            <div>
              <span class="price" data-usd-price="${b.price}">$${b.price.toLocaleString()}</span>
              <span style="font-size:0.78rem; color:var(--text-faint); text-decoration:line-through; margin-left:6px;" data-usd-price="${b.compareAt}">$${b.compareAt.toLocaleString()}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="addBundleToCart('${b.id}', 1)">Add Kit</button>
          </div>
          <div style="font-size:0.78rem; color:var(--accent); font-family:var(--font-mono);">Save <span data-usd-price="${savings}">$${savings.toLocaleString()}</span> vs. buying separately</div>
        </div>
      </article>
    `;
  }).join("");
  injectItemListSchema(containerId, list.map(b => ({ name: b.name, url: prettyProductUrl("bundle:" + b.id) })));
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

function initFilterBar() {
  const seriesButtons = document.querySelectorAll("[data-series]");
  const capacityButtons = document.querySelectorAll("[data-capacity]");
  const searchInput = document.getElementById("shop-search-input");
  function applyFilters() {
    const activeSeries = document.querySelector("[data-series].active")?.dataset.series || "ALL";
    const activeCapacity = document.querySelector("[data-capacity].active")?.dataset.capacity || "ALL";
    const query = searchInput ? searchInput.value : "";
    renderProductGrid("product-grid", activeSeries, activeCapacity, query);
  }
  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }
  seriesButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      seriesButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    });
  });
  capacityButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      capacityButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    });
  });
}

/* ============================================
   ACCESSORIES & SOLAR GRIDS
   ============================================ */
function accessoryVisualHTML(item) {
  if (item.images && item.images.length > 0) {
    return `<img src="${assetUrl(item.images[0])}" alt="${item.name}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:20px;">`;
  }
  return `<div class="device-icon"><div class="wh-lbl">${item.name}</div></div>`;
}

function renderAccessoryGrid(containerId, categoryFilter, searchQuery) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let list = categoryFilter && categoryFilter !== "ALL"
    ? ACCESSORIES.filter(a => a.category === categoryFilter)
    : ACCESSORIES;
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(a => a.name.toLowerCase().includes(q) || (a.tagline && a.tagline.toLowerCase().includes(q)));
  }
  if (list.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1; color:var(--text-faint); padding:40px 0; text-align:center;">No accessories match "${escapeHtml(searchQuery)}", try a different search or clear your filter.</p>`;
    injectItemListSchema(containerId, []);
    return;
  }
  container.innerHTML = list.map(a => `
    <article class="product-card">
      <a href="${prettyProductUrl("accessory:" + a.id)}" class="product-visual" aria-label="${a.name} details">
        <span class="series-tag">${a.category.toUpperCase()}</span>
        ${accessoryVisualHTML(a)}
      </a>
      <div class="product-body">
        <a href="${prettyProductUrl("accessory:" + a.id)}"><h3>${a.name}</h3></a>
        <p class="tagline">${a.tagline}</p>
        <div class="spec-row"><span>Fits: <strong>${a.compatibleWith.map(id => (findProduct(id)||{}).name || id).join(", ")}</strong></span></div>
        <div class="price-row">
          <span class="price" data-usd-price="${a.price}">$${a.price.toLocaleString()}</span>
          <button class="btn btn-secondary btn-sm" onclick="addAccessoryToCart('${a.id}', 1)">Add to Order</button>
        </div>
      </div>
    </article>
  `).join("");
  injectItemListSchema(containerId, list.map(a => ({ name: a.name, url: prettyProductUrl("accessory:" + a.id) })));
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

function renderSolarGrid(containerId, searchQuery) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let list = SOLAR_PANELS;
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(q) || (s.tagline && s.tagline.toLowerCase().includes(q)));
  }
  if (list.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1; color:var(--text-faint); padding:40px 0; text-align:center;">No solar panels match "${escapeHtml(searchQuery)}", try a different search.</p>`;
    injectItemListSchema(containerId, []);
    return;
  }
  container.innerHTML = list.map(s => `
    <article class="product-card">
      <a href="${prettyProductUrl("solar:" + s.id)}" class="product-visual" aria-label="${s.name} details">
        <span class="series-tag">${s.watts}W</span>
        ${accessoryVisualHTML(s)}
      </a>
      <div class="product-body">
        <a href="${prettyProductUrl("solar:" + s.id)}"><h3>${s.name}</h3></a>
        <p class="tagline">${s.tagline}</p>
        <div class="spec-row"><span>Pairs well with: <strong>${s.compatibleWith.map(id => (findProduct(id)||{}).name || id).slice(0,2).join(", ")}</strong></span></div>
        <div class="price-row">
          <span class="price" data-usd-price="${s.price}">$${s.price.toLocaleString()}</span>
          <button class="btn btn-secondary btn-sm" onclick="addSolarToCart('${s.id}', 1)">Add to Order</button>
        </div>
      </div>
    </article>
  `).join("");
  injectItemListSchema(containerId, list.map(s => ({ name: s.name, url: prettyProductUrl("solar:" + s.id) })));
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

/* ============================================
   FREQUENTLY BOUGHT WITH (product detail cross-sell)
   ============================================ */
// Finds the best "bundle and save" offer for a product page: a real curated
// BUNDLES entry if one exists for this product, otherwise a computed
// discount for pairing it with its best-matching compatible solar panel.
function getBundleOffer(productId) {
  const curated = BUNDLES.find(b => b.productId === productId && b.accessories && b.accessories.length);
  if (curated) {
    const savings = curated.compareAt - curated.price;
    return {
      partnerName: curated.accessories[0],
      savings,
      bundlePrice: curated.price,
      comparePrice: curated.compareAt
    };
  }
  const solar = SOLAR_PANELS.find(s => s.compatibleWith.includes(productId));
  if (!solar) return null;
  const product = findProduct(productId);
  if (!product) return null;
  const combined = product.price + solar.price;
  const savings = Math.round((combined * 0.08) / 5) * 5;
  return {
    partnerName: solar.name,
    savings,
    bundlePrice: combined - savings,
    comparePrice: combined
  };
}

// Recommends same-series upgrades for "You might also like", closest
// capacity tiers above this product first, so it reads as a natural upsell.
function getSameSeriesUpgrades(productId, max) {
  const product = findProduct(productId);
  if (!product) return [];
  return PRODUCTS
    .filter(p => p.series === product.series && p.id !== productId)
    .sort((a, b) => Math.abs(a.capacityWh - product.capacityWh) - Math.abs(b.capacityWh - product.capacityWh))
    .slice(0, max || 3);
}

// Computes the full stacked discount for a cart: promo code + volume +
// spend threshold, all additive, plus whether free shipping is unlocked.
// Shared by the cart page display and the order email so both agree.
// Shipping rules: free at the $500+ subtotal threshold (PROMO_CONFIG.
// freeShippingThreshold, editable from admin.html), otherwise no cost is
// calculated or shown at all - just "confirmed after order request" for
// every country and every address. No PO Box/APO/FPO restriction, no
// separate freight-quote case for AK/HI/PR/territories - those used to be
// distinct because they affected the dollar amount shown; now that
// there's no flat rate to calculate, there's nothing left to distinguish
// them from any other non-free order.

function getShippingStatus(subtotal) {
  if (subtotal >= PROMO_CONFIG.freeShippingThreshold) {
    return { type: "free", cost: 0, label: "Free shipping" };
  }
  return { type: "confirm", cost: 0, label: "Shipping cost confirmed after order request" };
}

function calculateDiscounts(subtotal, stationQty, promoCodeEntered) {
  let percent = 0;
  const applied = [];

  if (promoCodeEntered && promoCodeEntered.toUpperCase() === PROMO_CONFIG.code) {
    percent += PROMO_CONFIG.discountPercent;
    applied.push(`${PROMO_CONFIG.discountPercent}% (${PROMO_CONFIG.code})`);
  }
  if (stationQty >= PROMO_CONFIG.volumeQty) {
    percent += PROMO_CONFIG.volumeDiscountPercent;
    applied.push(`${PROMO_CONFIG.volumeDiscountPercent}% (${PROMO_CONFIG.volumeQty}+ power stations)`);
  }
  if (subtotal >= PROMO_CONFIG.spendThreshold) {
    percent += PROMO_CONFIG.spendDiscountPercent;
    applied.push(`${PROMO_CONFIG.spendDiscountPercent}% ($${PROMO_CONFIG.spendThreshold}+ order)`);
  }

  const discountAmount = Math.round(subtotal * percent / 100);
  const finalTotal = subtotal - discountAmount;
  const freeShipping = subtotal >= PROMO_CONFIG.freeShippingThreshold;

  return { percent, discountAmount, finalTotal, freeShipping, applied };
}

// Reference devices for the runtime estimate tab, watts are typical draw.
const RUNTIME_REFERENCE_DEVICES = [
  { name: "Smartphone (charge)", watts: 15 },
  { name: "Laptop", watts: 65 },
  { name: "Mini Fridge / Cooler", watts: 60 },
  { name: "CPAP Machine", watts: 40 },
  { name: "WiFi Router", watts: 20 },
  { name: "Box Fan", watts: 100 },
  { name: "Full-Size Refrigerator", watts: 150 }
];

function renderProductTabs(product, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const usableWh = Math.round(product.capacityWh * 0.85); // accounts for inverter loss
  const runtimeRows = RUNTIME_REFERENCE_DEVICES.map(dev => {
    const hours = usableWh / dev.watts;
    const label = hours >= 24 ? `${(hours / 24).toFixed(1)} days` : `${hours.toFixed(1)} hrs`;
    return `<tr><td>${dev.name} (${dev.watts}W)</td><td>${label}</td></tr>`;
  }).join("");

  const tabs = [
    {
      id: "runtime", label: "Runtime Chart", content: `
        <p style="font-size:0.88rem; color:var(--text-dim); margin-bottom:14px;">Estimated runtime on a full charge (${product.capacityLabel}), based on typical device draw. Actual runtime varies with temperature, surge loads, and inverter efficiency.</p>
        <table class="policy-table"><thead><tr><th>Device</th><th>Estimated runtime</th></tr></thead><tbody>${runtimeRows}</tbody></table>
        <p style="font-size:0.8rem; color:var(--text-faint); margin-top:10px;">Running multiple devices? Use our <a href="guide.html" style="color:var(--accent);">power sizing calculator</a> for a combined estimate.</p>
      `
    },
    {
      id: "box", label: "What's in the Box", content: `
        <p style="font-size:0.92rem; color:var(--text-dim);">${product.whatsInBox || "Contact us for full contents on this item."}</p>
      `
    },
    {
      id: "shipping", label: "Shipping Details", content: `
        <ul style="padding-left:20px; list-style:disc; font-size:0.92rem; color:var(--text-dim);">
          <li>Free shipping on orders $${PROMO_CONFIG.freeShippingThreshold}+, otherwise shipping cost is confirmed after your order request</li>
          <li>Standard delivery: 5–7 business days once confirmed, larger units may need freight (7–10 days)</li>
        </ul>
        <p style="font-size:0.8rem; margin-top:10px;"><a href="shipping.html" style="color:var(--accent);">Full shipping, returns & warranty policy →</a></p>
      `
    },
    {
      id: "warranty", label: "Warranty", content: `
        <p style="font-size:0.92rem; color:var(--text-dim); margin-bottom:10px;">This is genuine, factory-new EcoFlow hardware backed by the manufacturer's standard warranty.</p>
        <ul style="padding-left:20px; list-style:disc; font-size:0.92rem; color:var(--text-dim);">
          <li><strong>Days 1–30:</strong> we handle any operational defect directly, replacement or refund, no manufacturer runaround.</li>
          <li><strong>Day 31 onward:</strong> covered by EcoFlow's manufacturer warranty. Contact us and we'll help you through the claim process.</li>
        </ul>
        <p style="font-size:0.8rem; margin-top:10px;"><a href="shipping.html" style="color:var(--accent);">Full warranty policy →</a></p>
      `
    }
  ];

  container.innerHTML = `
    <div class="tab-buttons">
      ${tabs.map((t, i) => `<button type="button" class="tab-btn${i === 0 ? " active" : ""}" onclick="switchProductTab('${t.id}', this)">${t.label}</button>`).join("")}
    </div>
    ${tabs.map((t, i) => `<div class="tab-panel" id="tab-panel-${t.id}" style="display:${i === 0 ? "block" : "none"};">${t.content}</div>`).join("")}
  `;
}

function switchProductTab(tabId, btn) {
  const container = btn.closest(".product-tabs");
  container.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  container.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");
  const panel = document.getElementById(`tab-panel-${tabId}`);
  if (panel) panel.style.display = "block";
}

function renderFrequentlyBoughtWith(productId, containerId) {
  const container = document.getElementById(containerId);
  const accMatches = ACCESSORIES.filter(a => a.compatibleWith.includes(productId));
  const solarMatches = SOLAR_PANELS.filter(s => s.compatibleWith.includes(productId));
  const items = [...accMatches.map(a => ({ ...a, kind: "accessory" })), ...solarMatches.map(s => ({ ...s, kind: "solar" }))];

  const section = container.closest("section");
  if (items.length === 0) {
    if (section) section.style.display = "none";
    return;
  }

  container.innerHTML = items.map(item => {
    const product = findProduct(productId);
    const combined = (product ? product.price : 0) + item.price;
    const savings = Math.round((combined * 0.06) / 5) * 5;
    return `
    <article class="product-card">
      <div class="product-visual" style="aspect-ratio:16/10;">
        ${accessoryVisualHTML(item)}
      </div>
      <div class="product-body">
        <h3 style="font-size:0.98rem;">${item.name}</h3>
        <p class="tagline">${item.tagline}</p>
        ${savings > 0 ? `<p style="font-size:0.78rem; color:var(--accent); margin-bottom:4px;">Add this, save $${savings}</p>` : ""}
        <div class="price-row">
          <span class="price" data-usd-price="${item.price}">$${item.price.toLocaleString()}</span>
          <button class="btn btn-secondary btn-sm" onclick="${item.kind === 'accessory' ? `addAccessoryToCart('${item.id}', 1)` : `addSolarToCart('${item.id}', 1)`}">Add to Order</button>
        </div>
      </div>
    </article>
  `;
  }).join("");
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

function renderSameSeriesUpgrades(productId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const upgrades = getSameSeriesUpgrades(productId, 3);
  const section = container.closest("section");
  if (upgrades.length === 0) {
    if (section) section.style.display = "none";
    return;
  }
  container.innerHTML = upgrades.map(p => `
    <article class="product-card">
      <div class="product-visual" style="aspect-ratio:16/10;">
        ${productVisualHTML({ images: p.images, name: p.name })}
      </div>
      <div class="product-body">
        <h3 style="font-size:0.98rem;"><a href="${prettyProductUrl(p.id)}">${escapeHtml(p.name)}</a></h3>
        <p class="tagline">${escapeHtml(p.tagline)}</p>
        <div class="price-row">
          <span class="price" data-usd-price="${p.price}">$${p.price.toLocaleString()}</span>
          <a href="${prettyProductUrl(p.id)}" class="btn btn-secondary btn-sm">View</a>
        </div>
      </div>
    </article>
  `).join("");
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

/* ============================================
   BREADCRUMBS
   ============================================ */
function renderBreadcrumbs(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    return isLast
      ? `<span style="color:var(--text);">${item.label}</span>`
      : `<a href="${item.url}" style="color:var(--text-dim);">${item.label}</a><span style="color:var(--text-faint); margin:0 6px;">/</span>`;
  }).join("");
}

/* ============================================
   SEARCH
   ============================================ */
function buildSearchIndex() {
  const products = PRODUCTS.map(p => ({ id: p.id, name: p.name, tagline: p.tagline, type: "Power Station", url: prettyProductUrl(p.id) }));
  const accessories = ACCESSORIES.map(a => ({ id: a.id, name: a.name, tagline: a.tagline, type: "Accessory", url: prettyProductUrl("accessory:" + a.id) }));
  const solar = SOLAR_PANELS.map(s => ({ id: s.id, name: s.name, tagline: s.tagline, type: "Solar Panel", url: prettyProductUrl("solar:" + s.id) }));
  return [...products, ...accessories, ...solar];
}

function runSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index = buildSearchIndex();
  return index.filter(item =>
    item.name.toLowerCase().includes(q) || item.tagline.toLowerCase().includes(q)
  );
}

function initSearchBox() {
  const input = document.getElementById("nav-search-input");
  const form = document.getElementById("nav-search-form");
  if (!form || !input) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
  });
}

/* ============================================
   COMPARE
   ============================================ */
function getCompareList() {
  try {
    return JSON.parse(localStorage.getItem("ecoflow_compare")) || [];
  } catch (e) {
    return [];
  }
}

function saveCompareList(list) {
  localStorage.setItem("ecoflow_compare", JSON.stringify(list));
  updateCompareBar();
}

function toggleCompare(productId) {
  let list = getCompareList();
  if (list.includes(productId)) {
    list = list.filter(id => id !== productId);
  } else {
    if (list.length >= 3) {
      showToast("You can compare up to 3 products");
      return;
    }
    list.push(productId);
  }
  saveCompareList(list);
  document.querySelectorAll(`[data-compare-id="${productId}"]`).forEach(el => {
    el.classList.toggle("active", list.includes(productId));
  });
}

function updateCompareBar() {
  const bar = document.getElementById("compare-bar");
  if (!bar) return;
  const list = getCompareList();
  if (list.length === 0) {
    bar.style.display = "none";
    return;
  }
  bar.style.display = "flex";
  const names = list.map(id => (findProduct(id) || {}).name || id).join(", ");
  bar.querySelector(".compare-bar-text").textContent = `Comparing: ${names}`;
}

function renderSeriesComparisonTable(seriesKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = PRODUCTS.filter(p => p.series === seriesKey);
  const rows = [
    ["Price", p => `$${p.price.toLocaleString()}`],
    ["Capacity", p => p.capacityLabel],
    ["Output", p => p.outputLabel],
    ["Charge Time", p => p.chargeTime],
    ["Weight", p => p.weight],
    ["Best For", p => p.useCase]
  ];
  container.innerHTML = `
    <div style="overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse; min-width:${items.length * 160 + 140}px;">
      <thead>
        <tr>
          <th style="text-align:left; padding:14px; border-bottom:1px solid var(--border); color:var(--text-faint); font-family:var(--font-mono); font-size:0.78rem;"></th>
          ${items.map(p => `<th style="text-align:left; padding:14px; border-bottom:1px solid var(--border);"><a href="${prettyProductUrl(p.id)}" style="font-family:var(--font-display); font-size:1rem;">${escapeHtml(p.name)}</a></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map(([label, fn]) => `
          <tr>
            <td style="padding:14px; border-bottom:1px solid var(--border); color:var(--text-faint); font-family:var(--font-mono); font-size:0.8rem;">${label}</td>
            ${items.map(p => `<td style="padding:14px; border-bottom:1px solid var(--border); font-family:var(--font-mono); font-size:0.85rem;">${fn(p)}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
    </div>
  `;
}

function renderComparePage() {
  const container = document.getElementById("compare-table");
  if (!container) return;
  const list = getCompareList();
  if (list.length < 2) {
    container.innerHTML = `<div class="empty-state"><p>Select 2-3 products to compare from the <a href="products.html">Products page</a>.</p></div>`;
    return;
  }
  const items = list.map(id => findProduct(id)).filter(Boolean);
  const rows = [
    ["Price", p => `$${p.price.toLocaleString()}`],
    ["Capacity", p => p.capacityLabel],
    ["Output", p => p.outputLabel],
    ["Charge Time", p => p.chargeTime],
    ["Weight", p => p.weight],
    ["Best For", p => p.useCase]
  ];
  container.innerHTML = `
    <div style="overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse; min-width:${items.length * 160 + 140}px;">
      <thead>
        <tr>
          <th style="text-align:left; padding:14px; border-bottom:1px solid var(--border); color:var(--text-faint); font-family:var(--font-mono); font-size:0.78rem;"></th>
          ${items.map(p => `<th style="text-align:left; padding:14px; border-bottom:1px solid var(--border);"><a href="${prettyProductUrl(p.id)}" style="font-family:var(--font-display); font-size:1.05rem;">${escapeHtml(p.name)}</a></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map(([label, fn]) => `
          <tr>
            <td style="padding:14px; border-bottom:1px solid var(--border); color:var(--text-faint); font-family:var(--font-mono); font-size:0.82rem;">${label}</td>
            ${items.map(p => `<td style="padding:14px; border-bottom:1px solid var(--border); font-family:var(--font-mono); font-size:0.9rem;">${fn(p)}</td>`).join("")}
          </tr>
        `).join("")}
        <tr>
          <td style="padding:14px;"></td>
          ${items.map(p => `<td style="padding:14px;"><button class="btn btn-secondary btn-sm" onclick="toggleCompare('${p.id}'); renderComparePage();">Remove</button></td>`).join("")}
        </tr>
      </tbody>
    </table>
    </div>
  `;
}

/* ============================================
   PRODUCT DETAIL PAGE
   ============================================ */
function renderProductDetail() {
  const container = document.getElementById("product-detail");
  if (!container) return;
  const rawId = rawIdFromLocation() || PRODUCTS[0].id;
  const lookup = cartItemLookup(rawId) || cartItemLookup(PRODUCTS[0].id);
  const kind = lookup.kind; // "product" | "accessory" | "solar" | "bundle"
  const d = lookup.data;

  // Normalize fields across product types so one template can render any of them
  const displayName = lookup.name;
  const displayPrice = lookup.price;
  const bundleOffer = kind === "product" ? getBundleOffer(d.id) : null;
  const description = d.description || d.tagline;
  // Bundles store their one photo as a singular `image` field, not an
  // `images` array like products/accessories/solar panels do - reading
  // d.images here unconditionally used to silently evaluate to [] for
  // every bundle (even ones with a real photo), which fell through to
  // deviceIconHTML()'s fallback icon, which itself assumes a
  // capacityLabel that bundles don't have - a guaranteed crash on every
  // single Power Kit detail page. Normalizing per-kind here fixes both,
  // and (matching renderBundleGrid's existing fallback) a kit with no
  // photo of its own borrows its linked product's photo instead of
  // falling all the way to a plain icon.
  const bundleRelatedProduct = kind === "bundle" ? findProduct(d.productId) : null;
  const images = kind === "bundle"
    ? (d.image ? [d.image] : (bundleRelatedProduct ? bundleRelatedProduct.images || [] : []))
    : (d.images || []);
  const eyebrow = kind === "product" ? `${d.series} SERIES`
    : kind === "solar" ? "SOLAR PANEL"
    : kind === "bundle" ? "POWER KIT"
    : (d.category ? d.category.toUpperCase() : "ACCESSORY");
  const seriesTag = kind === "product" ? d.series : (kind === "solar" ? `${d.watts}W` : eyebrow);
  const cartIdForAdd = kind === "accessory" ? `accessory:${d.id}` : kind === "solar" ? `solar:${d.id}` : kind === "bundle" ? `bundle:${d.id}` : d.id;

  document.title = `${displayName}, VoltReserve`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", description.slice(0, 155));

  // Keep canonical + Open Graph tags in sync with whichever product/
  // accessory/solar panel/bundle is actually loaded, so search engines and
  // link previews (Facebook, Slack, iMessage, etc.) see the right item
  // instead of the generic "Power Station Details" placeholder baked into
  // product.html. Every tag here already exists as a static fallback in
  // product.html's <head>, this just updates their values in place.
  const pageUrl = `https://voltreservepower.com${prettyProductUrl(cartIdForAdd)}`;
  const ogImage = (images.length && typeof images[0] === "string")
    ? `https://voltreservepower.com/${images[0]}`
    : null;
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute("href", pageUrl);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", `${displayName} | VoltReserve`);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", description.slice(0, 200));
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", pageUrl);
  if (ogImage) {
    const ogImageTag = document.querySelector('meta[property="og:image"]');
    if (ogImageTag) ogImageTag.setAttribute("content", ogImage);
  }

  const whoForHTML = (kind === "product" && d.whoFor && d.whoFor.length)
    ? d.whoFor.join(" &middot; ")
    : (d.useCase || "");

  const specsHTML = kind === "product" ? `
      <div class="detail-specs">
        <div class="spec-box"><div class="num">${d.capacityLabel}</div><div class="lbl">Capacity</div></div>
        <div class="spec-box"><div class="num">${d.outputLabel}</div><div class="lbl">AC Output</div></div>
        <div class="spec-box"><div class="num">${d.chargeTime}</div><div class="lbl">Charge Time</div></div>
        <div class="spec-box"><div class="num">${d.weight}</div><div class="lbl">Weight</div></div>
      </div>
      <p class="eyebrow" style="margin-bottom:6px;">WHO IT'S FOR</p>
      <p style="color:var(--text); margin-bottom:20px;">${whoForHTML}</p>
      ${d.whatsInBox ? `
        <p class="eyebrow" style="margin-bottom:6px;">WHAT'S IN THE BOX</p>
        <p style="color:var(--text); margin-bottom:20px;">${d.whatsInBox}</p>
      ` : ""}
  ` : `
      <p class="eyebrow" style="margin-bottom:6px;">COMPATIBLE WITH</p>
      <p style="color:var(--text); margin-bottom:20px;">${(d.compatibleWith && d.compatibleWith.length) ? d.compatibleWith.map(id => (findProduct(id)||{}).name || id).join(", ") : "Universal / see product page"}</p>
  `;

  container.innerHTML = `
    <div class="detail-visual">
      <div class="product-visual" id="detail-main-visual">
        ${d.badge ? `<span class="badge">${d.badge}</span>` : ""}
        <span class="series-tag">${seriesTag}</span>
        ${productVisualHTML({ images: images, name: displayName })}
      </div>
      ${images.length > 1 ? `
        <div style="display:flex; gap:10px; margin-top:12px;">
          ${images.filter(img => img && typeof img === 'string').map((img, i) => `
            <button onclick="document.querySelector('#detail-main-visual img').src='${assetUrl(img)}'"
              style="width:64px; height:64px; padding:0; border:1px solid var(--border); border-radius:6px; background:var(--surface); cursor:pointer; overflow:hidden;">
              <img src="${assetUrl(img)}" alt="${escapeHtml(displayName)} view ${i+1}" style="width:100%; height:100%; object-fit:contain; padding:6px;">
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
    <div>
      <p class="eyebrow">${eyebrow}</p>
      <h1>${escapeHtml(displayName)}</h1>
      ${kind === "product" && d.hook ? `<p class="detail-hook">${escapeHtml(d.hook)}</p>` : ""}
      <p style="margin-top:12px; font-size:1.05rem;">${escapeHtml(description)}</p>
      ${kind === "product" && d.bullets && d.bullets.length ? `
        <ul class="detail-bullets">
          ${d.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
        </ul>
      ` : ""}

      ${specsHTML}

      ${d.ecoflowPrice ? `<div style="font-size:0.9rem; color:var(--text-faint); font-family:var(--font-mono); margin-bottom:4px;">EcoFlow direct: <span style="text-decoration:line-through;" data-usd-price="${d.ecoflowPrice}">$${d.ecoflowPrice.toLocaleString()}</span></div>` : ""}
      <div class="price" style="font-size:2rem;" data-usd-price="${displayPrice}">$${displayPrice.toLocaleString()}</div>
      ${kind === "product" ? stockBadgeHTML(d) : ""}

      ${kind === "product" ? `
        <div class="promo-lines">
          <p>Save ${PROMO_CONFIG.discountPercent}% with code <strong>${PROMO_CONFIG.code}</strong></p>
          <p>Free shipping on orders $${PROMO_CONFIG.freeShippingThreshold}+</p>
        </div>
      ` : ""}

      ${kind === "product" && bundleOffer ? `
        <div class="bundle-save-box">
          <p class="eyebrow" style="margin-bottom:4px;">BUNDLE &amp; SAVE</p>
          <p>${displayName} + ${bundleOffer.partnerName}, save $${bundleOffer.savings}</p>
        </div>
      ` : ""}

      ${kind === "product" && d.inStock === false ? `
        <div class="qty-row">
          <a href="contact.html?item=${encodeURIComponent(d.name)}" class="btn btn-primary">Notify Me When Back</a>
        </div>
        <p style="font-size:0.85rem; color:var(--text-faint);">Currently out of stock, reach out and we'll let you know the moment it's back.</p>
      ` : `
        <div class="qty-row">
          <div class="qty-control">
            <button type="button" onclick="stepQty(-1)">−</button>
            <input type="number" id="detail-qty" value="1" min="1" />
            <button type="button" onclick="stepQty(1)">+</button>
          </div>
          <button class="btn btn-primary" onclick="addDetailToCart('${cartIdForAdd}')">Add to Order</button>
        </div>
        ${kind === "product" ? `<p class="volume-note">Buy ${PROMO_CONFIG.volumeQty}+ power stations, extra ${PROMO_CONFIG.volumeDiscountPercent}% off</p>` : ""}
        <p style="font-size:0.85rem; color:var(--text-faint);">No payment now, a team member confirms details and payment with you directly after you submit your order.</p>
      `}
    </div>
  `;
  if (kind === "product") {
    // Each of these renders an independent section of the page - wrapped
    // separately so a bug in one (like the missing accMatches variable
    // that used to crash this whole block) can't also take out the
    // sections after it. Matches the resilience pattern used elsewhere
    // on the site for exactly this reason.
    try { renderFrequentlyBoughtWith(d.id, "fbw-grid"); } catch (err) { console.error("Frequently bought with failed:", err); }
    try { renderSameSeriesUpgrades(d.id, "also-like-grid"); } catch (err) { console.error("Same series upgrades failed:", err); }
    try { renderProductTabs(d, "product-tabs"); } catch (err) { console.error("Product tabs failed:", err); }
  }
  else {
    const fbwSection = document.getElementById("fbw-grid");
    if (fbwSection && fbwSection.closest("section")) fbwSection.closest("section").style.display = "none";
    const tabsEl = document.getElementById("product-tabs");
    if (tabsEl && tabsEl.closest("section")) tabsEl.closest("section").style.display = "none";
  }
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();

  // Inject Product schema (JSON-LD) for search engines. Includes brand,
  // sku, category and real stock status - not just name/price/image -
  // since these are what let Google show richer results (price, brand,
  // availability) in search instead of a plain blue link.
  const existingSchema = document.getElementById("product-schema");
  if (existingSchema) existingSchema.remove();
  const schema = document.createElement("script");
  schema.type = "application/ld+json";
  schema.id = "product-schema";
  const category = kind === "product" ? (d.series ? `${d.series} Series`.replace("_", " ") : "Power Station")
    : kind === "solar" ? "Solar Panel"
    : kind === "bundle" ? "Power Kit"
    : (d.category || "Accessory");
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": displayName,
    "description": description,
    "sku": cartIdForAdd,
    "category": category,
    "brand": { "@type": "Brand", "name": kind === "bundle" ? "VoltReserve" : "EcoFlow" },
    "image": images.length ? `https://voltreservepower.com/${images[0]}` : undefined,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": displayPrice,
      "availability": (kind === "product" && d.inStock === false)
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      "url": pageUrl,
      "seller": { "@type": "Organization", "name": "VoltReserve", "url": "https://voltreservepower.com/" }
    }
  });
  document.head.appendChild(schema);

  // Breadcrumb schema (JSON-LD) mirrors the visible breadcrumb trail
  // rendered in product.html's own inline script, and the equivalent
  // renderBreadcrumbsHTML() in netlify/functions/product-page.js for bots.
  const existingBreadcrumbSchema = document.getElementById("breadcrumb-schema");
  if (existingBreadcrumbSchema) existingBreadcrumbSchema.remove();
  const breadcrumbItems = [
    { name: "Home", url: "https://voltreservepower.com/" },
    { name: "Shop", url: "https://voltreservepower.com/products.html" }
  ];
  if (kind === "product" && d.series && typeof SERIES_INFO !== "undefined" && SERIES_INFO[d.series]) {
    breadcrumbItems.push({ name: SERIES_INFO[d.series].label, url: `https://voltreservepower.com/${SERIES_INFO[d.series].slug}` });
  }
  breadcrumbItems.push({ name: displayName, url: pageUrl });

  // Visible breadcrumb trail (the actual on-page text, not just the
  // schema). Handles all four item kinds - product.html's own inline
  // script used to do this but only ever handled plain products, silently
  // showing no breadcrumb at all on accessory/solar/kit pages.
  const breadcrumbsEl = document.getElementById("product-breadcrumbs");
  if (breadcrumbsEl) {
    breadcrumbsEl.innerHTML = breadcrumbItems.map((item, i) => {
      const isLast = i === breadcrumbItems.length - 1;
      const sep = i > 0 ? `<span style="color:var(--text-faint); margin:0 6px;">/</span>` : "";
      const label = isLast
        ? `<span style="color:var(--text);">${escapeHtml(item.name)}</span>`
        : `<a href="${item.url.replace("https://voltreservepower.com", "")}">${escapeHtml(item.name)}</a>`;
      return sep + label;
    }).join("");
  }

  const breadcrumbSchema = document.createElement("script");
  breadcrumbSchema.type = "application/ld+json";
  breadcrumbSchema.id = "breadcrumb-schema";
  breadcrumbSchema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, i) => ({
      "@type": "ListItem", "position": i + 1, "name": item.name, "item": item.url
    }))
  });
  document.head.appendChild(breadcrumbSchema);
}

function stepQty(delta) {
  const input = document.getElementById("detail-qty");
  const val = Math.max(1, parseInt(input.value || "1", 10) + delta);
  input.value = val;
}

function addDetailToCart(id) {
  const qty = parseInt(document.getElementById("detail-qty").value || "1", 10);
  addToCart(id, qty);
}

/* ============================================
   CART PAGE
   ============================================ */
function renderCartPage() {
  const listEl = document.getElementById("cart-items");
  const summaryEl = document.getElementById("cart-summary-body");
  const emptyEl = document.getElementById("cart-empty");
  const formSection = document.getElementById("order-form-section");
  if (!listEl) return;

  const cart = getCart();

  if (cart.length === 0) {
    listEl.innerHTML = "";
    if (summaryEl) summaryEl.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    if (formSection) formSection.style.display = "none";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  if (formSection) formSection.style.display = "grid";

  let total = 0;
  let stationQty = 0;
  listEl.innerHTML = cart.map(item => {
    const info = cartItemLookup(item.id);
    if (!info) return "";
    const lineTotal = info.price * item.qty;
    total += lineTotal;
    if (info.kind === "product") stationQty += item.qty;
    return `
      <div class="cart-item">
        <div class="mini-icon">${info.thumb}</div>
        <div>
          <h4>${info.name}</h4>
          <div class="sub"><span data-usd-price="${info.price}">$${info.price.toLocaleString()}</span> × 
            <input type="number" min="1" value="${item.qty}" style="width:46px; background:var(--surface-raised); border:1px solid var(--border); color:var(--text); border-radius:4px; padding:2px 4px; font-family:var(--font-mono);"
              onchange="updateCartQty('${item.id}', parseInt(this.value||1,10)); renderCartPage();" />
          </div>
        </div>
        <div class="price" data-usd-price="${lineTotal}">$${lineTotal.toLocaleString()}</div>
        <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
      </div>
    `;
  }).join("");

  if (summaryEl) {
    const promoInputVal = document.getElementById("order-promo")?.value || "";
    const result = calculateDiscounts(total, stationQty, promoInputVal);

    const shipRemaining = PROMO_CONFIG.freeShippingThreshold - total;
    const shippingMsg = result.freeShipping
      ? `<p>You've unlocked <strong>free shipping</strong></p>`
      : `<p>$${shipRemaining.toLocaleString()} more to unlock <strong>free shipping</strong></p>`;

    const promoActive = promoInputVal.trim().toUpperCase() === PROMO_CONFIG.code;
    const promoMsg = promoActive
      ? `<p>You're getting <strong>${PROMO_CONFIG.discountPercent}% off</strong> with ${PROMO_CONFIG.code}</p>`
      : `<p>Use code <strong>${PROMO_CONFIG.code}</strong> for ${PROMO_CONFIG.discountPercent}% off</p>`;

    const volumeMsg = stationQty >= PROMO_CONFIG.volumeQty
      ? `<p>You've unlocked an extra <strong>${PROMO_CONFIG.volumeDiscountPercent}% off</strong> for ${PROMO_CONFIG.volumeQty}+ power stations</p>`
      : `<p>Add ${PROMO_CONFIG.volumeQty - stationQty} more power station${PROMO_CONFIG.volumeQty - stationQty === 1 ? "" : "s"} to unlock an extra ${PROMO_CONFIG.volumeDiscountPercent}% off</p>`;

    const spendRemaining = PROMO_CONFIG.spendThreshold - total;
    const spendMsg = total >= PROMO_CONFIG.spendThreshold
      ? `<p>You've unlocked an extra <strong>${PROMO_CONFIG.spendDiscountPercent}% off</strong> for orders $${PROMO_CONFIG.spendThreshold}+</p>`
      : `<p>Add $${spendRemaining.toLocaleString()} more to unlock an extra ${PROMO_CONFIG.spendDiscountPercent}% off</p>`;

    const shipping = getShippingStatus(result.finalTotal);
    const grandTotal = result.finalTotal;

    const shippingRowHTML = (() => {
      if (shipping.type === "free") return `<div class="summary-row"><span>Shipping</span><span style="color:var(--accent);">Free</span></div>`;
      return `<div class="summary-row"><span>Shipping</span><span style="color:var(--text-faint); font-size:0.82rem;">Confirmed after request</span></div>`;
    })();

    const totalsHTML = result.percent > 0 ? `
      <div class="summary-row"><span>Subtotal</span><span data-usd-price="${total}" style="text-decoration:line-through; color:var(--text-faint);">$${total.toLocaleString()}</span></div>
      <div class="summary-row"><span>Discount (${result.percent}%)</span><span data-usd-price="${result.discountAmount}" style="color:var(--accent);">-$${result.discountAmount.toLocaleString()}</span></div>
      ${shippingRowHTML}
      <div class="summary-row total"><span>Estimated Total</span><span data-usd-price="${grandTotal}">$${grandTotal.toLocaleString()}</span></div>
    ` : `
      <div class="summary-row"><span>Items</span><span>${cartCount()}</span></div>
      ${shippingRowHTML}
      <div class="summary-row total"><span>Estimated Total</span><span data-usd-price="${grandTotal}">$${grandTotal.toLocaleString()}</span></div>
    `;

    summaryEl.innerHTML = `
      ${totalsHTML}
      <div class="cart-progress">
        ${shippingMsg}
        ${promoMsg}
        ${volumeMsg}
        ${spendMsg}
      </div>
    `;
  }
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

/* ============================================
   ORDER SUBMISSION, sends order emails automatically
   ============================================ */
const COUNTRY_PHONE_CODES = {
  "United States": "+1", "Canada": "+1", "United Kingdom": "+44", "Germany": "+49",
  "France": "+33", "Netherlands": "+31", "Ireland": "+353", "Belgium": "+32",
  "Switzerland": "+41", "Spain": "+34", "Italy": "+39"
};
function syncPhoneCode(country) {
  const code = COUNTRY_PHONE_CODES[country];
  const select = document.getElementById("order-phone-code");
  if (code && select) select.value = code;
  // Filter payment methods, Zelle and Cash App are US-only
  const paymentSelect = document.getElementById("order-payment");
  if (!paymentSelect) return;
  const isUS = country === "United States";
  Array.from(paymentSelect.options).forEach(opt => {
    const usOnly = opt.value === "Zelle" || opt.value === "Cash App";
    opt.hidden = usOnly && !isUS;
    opt.disabled = usOnly && !isUS;
  });
  // If current selection is now hidden, reset to first visible option
  if (paymentSelect.selectedOptions[0] && paymentSelect.selectedOptions[0].hidden) {
    const firstVisible = Array.from(paymentSelect.options).find(o => !o.hidden);
    if (firstVisible) paymentSelect.value = firstVisible.value;
  }
}

async function submitOrder(event) {
  event.preventDefault();
  const cart = getCart();
  if (cart.length === 0) return;

  const submitBtn = event.target.querySelector("button[type=submit], .btn-primary");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending..."; }

  const name = document.getElementById("order-name").value.trim();
  const phoneCode = document.getElementById("order-phone-code").value;
  const phoneNumber = document.getElementById("order-phone").value.trim();
  const phone = `${phoneCode} ${phoneNumber}`;
  const email = document.getElementById("order-email").value.trim();
  const country = document.getElementById("order-country").value.trim();
  const address = document.getElementById("order-address").value.trim();
  const paymentMethod = document.getElementById("order-payment").value.trim();
  const notes = document.getElementById("order-notes").value.trim();
  const promoInput = document.getElementById("order-promo");
  const promoCode = promoInput ? promoInput.value.trim().toUpperCase() : "";

  let itemLines = [];
  let total = 0;
  let stationQty = 0;
  cart.forEach(item => {
    const info = cartItemLookup(item.id);
    if (!info) return;
    const lineTotal = info.price * item.qty;
    total += lineTotal;
    if (info.kind === "product") stationQty += item.qty;
    const tag = info.kind === "bundle" ? "[KIT] " : info.kind === "accessory" ? "[ADD-ON] " : info.kind === "solar" ? "[SOLAR] " : "";
    itemLines.push(`${tag}${info.name} x ${item.qty} ($${lineTotal.toLocaleString()})`);
  });

  const discount = calculateDiscounts(total, stationQty, promoCode);
  const shipping = getShippingStatus(discount.finalTotal);
  const grandTotal = discount.finalTotal;

  try {
    const res = await fetch("/.netlify/functions/send-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, email, phone, country, address, paymentMethod, promoCode, notes, itemLines,
        subtotal: total,
        discountPercent: discount.percent,
        discountAmount: discount.discountAmount,
        shippingType: shipping.type,
        shippingCost: 0,
        shippingNote: shipping.label,
        total: grandTotal,
        freeShipping: discount.freeShipping
      })
    });
    if (!res.ok) throw new Error("Order email failed");
  } catch (err) {
    console.error("Order submission failed", err);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Order"; }
    alert("Something went wrong sending your order. Please try again, or reach us via live chat.");
    return;
  }

  saveCart([]);
  showOrderReadyState();
}

function showOrderReadyState() {
  const formSection = document.getElementById("order-form-section");
  const readyState = document.getElementById("order-ready-state");
  if (formSection) formSection.style.display = "none";
  if (readyState) readyState.style.display = "block";
}

/* ============================================
   CURRENCY CONVERTER
   Uses frankfurter.app, free, no API key required, backed by ECB rates.
   All prices are authored in USD; this converts the displayed number only.
   ============================================ */
const CURRENCY_LIST = [
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "CAD", label: "CAD ($)", symbol: "CA$" },
  { code: "AUD", label: "AUD ($)", symbol: "AU$" },
  { code: "XAF", label: "XAF (FCFA)", symbol: "FCFA" },
  { code: "NGN", label: "NGN (₦)", symbol: "₦" },
  { code: "ZAR", label: "ZAR (R)", symbol: "R" },
  { code: "INR", label: "INR (₹)", symbol: "₹" },
  { code: "JPY", label: "JPY (¥)", symbol: "¥" }
];

let currentCurrency = localStorage.getItem("ecoflow_currency") || "USD";
let currencyRates = null; // cached { EUR: 0.92, GBP: 0.78, ... } relative to USD

async function fetchCurrencyRates() {
  if (currencyRates) return currencyRates;
  // Primary + documented fallback host for fawazahmed0/currency-api, free, no key, supports 200+ currencies incl. NGN/XAF
  const sources = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    "https://latest.currency-api.pages.dev/v1/currencies/usd.json"
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      const rates = data.usd || {};
      currencyRates = { USD: 1 };
      CURRENCY_LIST.forEach(c => {
        const key = c.code.toLowerCase();
        if (rates[key]) currencyRates[c.code] = rates[key];
      });
      return currencyRates;
    } catch (e) {
      console.warn("Currency source failed, trying next.", url, e);
    }
  }
  // Fallback source: frankfurter.app, only covers major currencies, but request each one separately
  // so a single unsupported code (e.g. NGN) can't break the whole batch.
  currencyRates = { USD: 1 };
  const supported = CURRENCY_LIST.filter(c => c.code !== "USD");
  await Promise.all(supported.map(async c => {
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${c.code}`);
      const data = await res.json();
      if (data.rates && data.rates[c.code]) currencyRates[c.code] = data.rates[c.code];
    } catch (e) {
      // silently skip currencies this fallback doesn't support
    }
  }));
  return currencyRates;
}

function formatConverted(usdAmount, currencyCode) {
  const c = CURRENCY_LIST.find(x => x.code === currencyCode) || CURRENCY_LIST[0];
  if (currencyCode === "USD" || !currencyRates || !currencyRates[currencyCode]) {
    return `$${usdAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  const converted = usdAmount * currencyRates[currencyCode];
  const decimals = currencyCode === "JPY" ? 0 : 2;
  return `${c.symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
}

// Re-scan the page for any element with data-usd-price and update display
async function refreshCurrencyDisplay() {
  const nodes = document.querySelectorAll("[data-usd-price]");
  if (nodes.length === 0) return;
  if (currentCurrency !== "USD") await fetchCurrencyRates();
  nodes.forEach(el => {
    const usd = parseFloat(el.getAttribute("data-usd-price"));
    // Remove any previously inserted currency-note spans
    const note = el.querySelector(".currency-note");
    if (note) note.remove();
    if (currentCurrency === "USD") {
      // Restore original USD text, read from data attribute
      const decimals = usd % 1 === 0 ? 0 : 2;
      el.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = `$${usd.toLocaleString(undefined, {maximumFractionDigits: decimals})}`; });
      return;
    }
    // Replace text content with converted price only
    const text = formatConverted(usd, currentCurrency);
    el.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = text; });
  });
}

function initCurrencySelector() {
  const select = document.getElementById("currency-select");
  if (!select) return;
  select.innerHTML = CURRENCY_LIST.map(c => `<option value="${c.code}">${c.label}</option>`).join("");
  select.value = currentCurrency;
  select.addEventListener("change", async () => {
    currentCurrency = select.value;
    localStorage.setItem("ecoflow_currency", currentCurrency);
    await refreshCurrencyDisplay();
  });
  refreshCurrencyDisplay();
}

// Cards fade/slide into place as they scroll into view. Safe to call more
// than once, already-observed elements are skipped, so pages can re-run
// this after product/bundle grids finish rendering asynchronously.
const _revealObserver = ("IntersectionObserver" in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          _revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 })
  : null;

function initScrollReveal() {
  const selector = ".feature-card, .usecase-card, .product-card, .bundle-card";
  document.querySelectorAll(selector).forEach((el, i) => {
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = "1";
    el.classList.add("reveal");
    el.style.transitionDelay = (i % 4) * 0.07 + "s";
    if (_revealObserver) {
      _revealObserver.observe(el);
    } else {
      el.classList.add("in-view"); // no IntersectionObserver support, just show it
    }
  });
}

function renderAnnouncementBar() {
  let bar = document.querySelector(".announcement-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "announcement-bar";
    document.body.prepend(bar);
  }
  bar.innerHTML = `
    <span>End of Summer Sale, <strong>${PROMO_CONFIG.discountPercent}% off</strong> with code <strong>${PROMO_CONFIG.code}</strong></span>
    <span class="sep">|</span>
    <span>Ends ${PROMO_CONFIG.endDateShort}</span>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderAnnouncementBar();
  initNav();
  initSearchBox();
  updateCompareBar();
  initCurrencySelector();
  initScrollReveal();
  if (typeof PRODUCTS_READY !== "undefined") {
    PRODUCTS_READY.then(() => {
      renderAnnouncementBar();
      if (typeof renderCartPage === "function" && document.getElementById("cart-items")) renderCartPage();
      initScrollReveal();
    });
  }
});
