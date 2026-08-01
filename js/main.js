/* ============================================
   CONFIG — edit these two lines for your business
   ============================================ */
const SALES_EMAIL = "voltreservepower@gmail.com";

/* ============================================
   ICON SYSTEM
   One consistent, dependency-free SVG language across the site.
   ============================================ */
const ICON_PATHS = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  cart: '<path d="M4 5h2l2.2 9.2a2 2 0 0 0 2 1.5h6.9a2 2 0 0 0 1.9-1.4L20.5 9H7.1"/><circle cx="10.5" cy="19" r="1"/><circle cx="17.5" cy="19" r="1"/>',
  tent: '<path d="m3 20 9-16 9 16M7 20l5-8 5 8M3 20h18"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  shield: '<path d="M12 3 5 6v5c0 4.7 2.9 8.1 7 10 4.1-1.9 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3 2.4-2.4Z"/>',
  scale: '<path d="M4 19h16M12 5v14M7 8h10M7 8l-3 6h6L7 8ZM17 8l-3 6h6l-3-6Z"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.4 3.5-7 8-7s7.2 2.6 8 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plug: '<path d="M8 3v5M16 3v5M6 8h12v2a6 6 0 0 1-6 6v5M9 21h6"/>'
};

function iconHTML(name, className) {
  const path = ICON_PATHS[name] || ICON_PATHS.bolt;
  return `<svg class="${className || "ui-icon"}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function hydrateIcons(root) {
  (root || document).querySelectorAll("[data-icon]").forEach(el => {
    el.innerHTML = iconHTML(el.getAttribute("data-icon"));
  });
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
  const count = cartCount();
  document.querySelectorAll(".nav-cart .count, .mobile-cart .count").forEach(el => {
    el.textContent = count;
  });
  document.querySelectorAll(".mobile-cart").forEach(link => {
    link.setAttribute("aria-label", `Order, ${count} ${count === 1 ? "item" : "items"}`);
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
  if (toggle && !document.querySelector(".mobile-cart")) {
    const quickCart = document.createElement("a");
    quickCart.className = "mobile-cart";
    quickCart.href = "cart.html";
    quickCart.innerHTML = `${iconHTML("cart")}<span class="count">0</span>`;
    toggle.before(quickCart);
  }
  if (toggle && links) {
    toggle.innerHTML = iconHTML("menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("open");
      toggle.classList.toggle("is-open", isOpen);
      toggle.innerHTML = iconHTML(isOpen ? "close" : "menu");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
      document.body.classList.toggle("nav-open", isOpen);
    });
  }
  document.querySelectorAll(".nav-dropdown-toggle").forEach(button => {
    button.innerHTML = `<span>Shop</span>${iconHTML("chevron")}`;
    button.removeAttribute("onclick");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const menu = button.nextElementSibling;
      const isOpen = menu.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });
  document.querySelectorAll(".nav-cart").forEach(link => {
    if (!link.querySelector("svg")) link.insertAdjacentHTML("afterbegin", iconHTML("cart"));
  });
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".nav-dropdown-menu.open").forEach(menu => {
      if (!menu.parentElement.contains(e.target)) {
        menu.classList.remove("open");
        const button = menu.parentElement.querySelector(".nav-dropdown-toggle");
        if (button) button.setAttribute("aria-expanded", "false");
      }
    });
  });
  hydrateIcons();
  updateCartCount();
}

/* ============================================
   DEVICE ICON (fallback visual — no external images needed)
   ============================================ */
function deviceIconHTML(product) {
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
    return `<img src="${product.images[0]}" alt="${product.name}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:20px;">`;
  }
  return deviceIconHTML(product);
}

/* ============================================
   PRODUCT GRID (home + products page)
   ============================================ */
function renderProductGrid(containerId, seriesFilter, capacityFilter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let list = PRODUCTS;
  if (seriesFilter && seriesFilter !== "ALL") {
    list = list.filter(p => p.series === seriesFilter);
  }
  if (capacityFilter && capacityFilter !== "ALL") {
    list = list.filter(p => p.capacityTier === capacityFilter);
  }

  container.innerHTML = list.map(p => `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-visual" aria-label="${p.name} details">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <span class="series-tag">${p.series.replace("_", " ")}</span>
        ${productVisualHTML(p)}
      </a>
      <div class="product-body">
        <a href="product.html?id=${p.id}"><h3>${p.name}</h3></a>
        <p class="tagline">${p.tagline}</p>
        <div class="spec-row">
          <span>Output <strong>${p.outputW}W</strong></span>
          <span>Charge <strong>${p.chargeTime.split(" ")[0]}</strong></span>
        </div>
        <div class="price-row">
          <span class="price" data-usd-price="${p.price}">$${p.price.toLocaleString()}</span>
          <button class="btn btn-secondary btn-sm" onclick="addToCart('${p.id}', 1)">Add to Order</button>
        </div>
        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; color:var(--text-faint); font-family:var(--font-mono); cursor:pointer; margin-top:4px;">
          <input type="checkbox" data-compare-id="${p.id}" ${getCompareList().includes(p.id) ? "checked" : ""} onchange="toggleCompare('${p.id}')" style="accent-color:var(--accent);">
          Compare
        </label>
      </div>
    </article>
  `).join("");
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

function renderBundleGrid(containerId, limit) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const list = limit ? BUNDLES.slice(0, limit) : BUNDLES;
  container.innerHTML = list.map(b => {
    const p = findProduct(b.productId);
    const savings = b.compareAt - b.price;
    const visual = b.image
      ? `<img src="${b.image}" alt="${b.name}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:20px;">`
      : (p ? productVisualHTML(p) : "");
    return `
      <article class="product-card">
        <div class="product-visual">
          ${b.badge ? `<span class="badge">${b.badge}</span>` : ""}
          <span class="series-tag">KIT</span>
          ${visual}
        </div>
        <div class="product-body">
          <h3>${b.name}</h3>
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
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

function initFilterBar() {
  const seriesButtons = document.querySelectorAll("[data-series]");
  const capacityButtons = document.querySelectorAll("[data-capacity]");
  function applyFilters() {
    const activeSeries = document.querySelector("[data-series].active")?.dataset.series || "ALL";
    const activeCapacity = document.querySelector("[data-capacity].active")?.dataset.capacity || "ALL";
    renderProductGrid("product-grid", activeSeries, activeCapacity);
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
    return `<img src="${item.images[0]}" alt="${item.name}" loading="lazy" style="width:100%; height:100%; object-fit:contain; padding:20px;">`;
  }
  return `<div class="device-icon"><div class="wh-lbl">${item.name}</div></div>`;
}

function renderAccessoryGrid(containerId, categoryFilter) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const list = categoryFilter && categoryFilter !== "ALL"
    ? ACCESSORIES.filter(a => a.category === categoryFilter)
    : ACCESSORIES;
  container.innerHTML = list.map(a => `
    <article class="product-card">
      <a href="product.html?id=accessory:${a.id}" class="product-visual" aria-label="${a.name} details">
        <span class="series-tag">${a.category.toUpperCase()}</span>
        ${accessoryVisualHTML(a)}
      </a>
      <div class="product-body">
        <a href="product.html?id=accessory:${a.id}"><h3>${a.name}</h3></a>
        <p class="tagline">${a.tagline}</p>
        <div class="spec-row"><span>Fits: <strong>${a.compatibleWith.map(id => (findProduct(id)||{}).name || id).join(", ")}</strong></span></div>
        <div class="price-row">
          <span class="price" data-usd-price="${a.price}">$${a.price.toLocaleString()}</span>
          <button class="btn btn-secondary btn-sm" onclick="addAccessoryToCart('${a.id}', 1)">Add to Order</button>
        </div>
      </div>
    </article>
  `).join("");
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

function renderSolarGrid(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = SOLAR_PANELS.map(s => `
    <article class="product-card">
      <a href="product.html?id=solar:${s.id}" class="product-visual" aria-label="${s.name} details">
        <span class="series-tag">${s.watts}W</span>
        ${accessoryVisualHTML(s)}
      </a>
      <div class="product-body">
        <a href="product.html?id=solar:${s.id}"><h3>${s.name}</h3></a>
        <p class="tagline">${s.tagline}</p>
        <div class="spec-row"><span>Pairs well with: <strong>${s.compatibleWith.map(id => (findProduct(id)||{}).name || id).slice(0,2).join(", ")}</strong></span></div>
        <div class="price-row">
          <span class="price" data-usd-price="${s.price}">$${s.price.toLocaleString()}</span>
          <button class="btn btn-secondary btn-sm" onclick="addSolarToCart('${s.id}', 1)">Add to Order</button>
        </div>
      </div>
    </article>
  `).join("");
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

/* ============================================
   FREQUENTLY BOUGHT WITH (product detail cross-sell)
   ============================================ */
function renderFrequentlyBoughtWith(productId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const accMatches = ACCESSORIES.filter(a => a.compatibleWith.includes(productId));
  const solarMatches = SOLAR_PANELS.filter(s => s.compatibleWith.includes(productId));
  const items = [...accMatches.map(a => ({ ...a, kind: "accessory" })), ...solarMatches.map(s => ({ ...s, kind: "solar" }))];

  const section = container.closest("section");
  if (items.length === 0) {
    if (section) section.style.display = "none";
    return;
  }

  container.innerHTML = items.map(item => `
    <article class="product-card">
      <div class="product-visual" style="aspect-ratio:16/10;">
        ${accessoryVisualHTML(item)}
      </div>
      <div class="product-body">
        <h3 style="font-size:0.98rem;">${item.name}</h3>
        <p class="tagline">${item.tagline}</p>
        <div class="price-row">
          <span class="price" data-usd-price="${item.price}">$${item.price.toLocaleString()}</span>
          <button class="btn btn-secondary btn-sm" onclick="${item.kind === 'accessory' ? `addAccessoryToCart('${item.id}', 1)` : `addSolarToCart('${item.id}', 1)`}">Add to Order</button>
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
  const products = PRODUCTS.map(p => ({ id: p.id, name: p.name, tagline: p.tagline, type: "Power Station", url: `product.html?id=${p.id}` }));
  const accessories = ACCESSORIES.map(a => ({ id: a.id, name: a.name, tagline: a.tagline, type: "Accessory", url: `product.html?id=accessory:${a.id}` }));
  const solar = SOLAR_PANELS.map(s => ({ id: s.id, name: s.name, tagline: s.tagline, type: "Solar Panel", url: `product.html?id=solar:${s.id}` }));
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
          ${items.map(p => `<th style="text-align:left; padding:14px; border-bottom:1px solid var(--border);"><a href="product.html?id=${p.id}" style="font-family:var(--font-display); font-size:1rem;">${p.name}</a></th>`).join("")}
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
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:14px; border-bottom:1px solid var(--border); color:var(--text-faint); font-family:var(--font-mono); font-size:0.78rem;"></th>
          ${items.map(p => `<th style="text-align:left; padding:14px; border-bottom:1px solid var(--border);"><a href="product.html?id=${p.id}" style="font-family:var(--font-display); font-size:1.05rem;">${p.name}</a></th>`).join("")}
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
  `;
}

/* ============================================
   PRODUCT DETAIL PAGE
   ============================================ */
function renderProductDetail() {
  const container = document.getElementById("product-detail");
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id") || PRODUCTS[0].id;
  const lookup = cartItemLookup(rawId) || cartItemLookup(PRODUCTS[0].id);
  const kind = lookup.kind; // "product" | "accessory" | "solar" | "bundle"
  const d = lookup.data;

  // Normalize fields across product types so one template can render any of them
  const displayName = lookup.name;
  const displayPrice = lookup.price;
  const description = d.description || d.tagline;
  const images = d.images || [];
  const eyebrow = kind === "product" ? `${d.series} SERIES`
    : kind === "solar" ? "SOLAR PANEL"
    : kind === "bundle" ? "POWER KIT"
    : (d.category ? d.category.toUpperCase() : "ACCESSORY");
  const seriesTag = kind === "product" ? d.series : (kind === "solar" ? `${d.watts}W` : eyebrow);
  const cartIdForAdd = kind === "accessory" ? `accessory:${d.id}` : kind === "solar" ? `solar:${d.id}` : kind === "bundle" ? `bundle:${d.id}` : d.id;

  document.title = `${displayName} — VoltReserve`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", description.slice(0, 155));

  const specsHTML = kind === "product" ? `
      <div class="detail-specs">
        <div class="spec-box"><div class="num">${d.capacityLabel}</div><div class="lbl">Capacity</div></div>
        <div class="spec-box"><div class="num">${d.outputLabel}</div><div class="lbl">AC Output</div></div>
        <div class="spec-box"><div class="num">${d.chargeTime}</div><div class="lbl">Charge Time</div></div>
        <div class="spec-box"><div class="num">${d.weight}</div><div class="lbl">Weight</div></div>
      </div>
      <p class="eyebrow" style="margin-bottom:6px;">BEST FOR</p>
      <p style="color:var(--text); margin-bottom:20px;">${d.useCase}</p>
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
          ${images.map((img, i) => `
            <button onclick="document.querySelector('#detail-main-visual img').src='${img}'"
              style="width:64px; height:64px; padding:0; border:1px solid var(--border); border-radius:6px; background:var(--surface); cursor:pointer; overflow:hidden;">
              <img src="${img}" alt="${displayName} view ${i+1}" style="width:100%; height:100%; object-fit:contain; padding:6px;">
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
    <div>
      <p class="eyebrow">${eyebrow}</p>
      <h1>${displayName}</h1>
      <p style="margin-top:12px; font-size:1.05rem;">${description}</p>

      ${specsHTML}

      <div class="price" style="font-size:2rem;" data-usd-price="${displayPrice}">$${displayPrice.toLocaleString()}</div>

      <div class="qty-row">
        <div class="qty-control">
          <button type="button" onclick="stepQty(-1)">−</button>
          <input type="number" id="detail-qty" value="1" min="1" />
          <button type="button" onclick="stepQty(1)">+</button>
        </div>
        <button class="btn btn-primary" onclick="addDetailToCart('${cartIdForAdd}')">Add to Order</button>
      </div>

      <p style="font-size:0.85rem; color:var(--text-faint);">No payment now — a team member confirms details and payment with you directly after you submit your order.</p>

      <div class="service-badges">
        ${SERVICE_BENEFITS.map(b => `<div class="service-badge">${iconHTML(b.icon)}<span>${b.label}</span></div>`).join("")}
      </div>
    </div>
  `;
  if (kind === "product") renderFrequentlyBoughtWith(d.id, "fbw-grid");
  else {
    const fbwSection = document.getElementById("fbw-grid");
    if (fbwSection && fbwSection.closest("section")) fbwSection.closest("section").style.display = "none";
  }
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();

  // Inject Product schema (JSON-LD) for search engines
  const existingSchema = document.getElementById("product-schema");
  if (existingSchema) existingSchema.remove();
  const schema = document.createElement("script");
  schema.type = "application/ld+json";
  schema.id = "product-schema";
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": displayName,
    "description": description,
    "image": images.length ? `https://voltreservepower.com/${images[0]}` : undefined,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": displayPrice,
      "availability": "https://schema.org/InStock",
      "url": window.location.href
    }
  });
  document.head.appendChild(schema);
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
  listEl.innerHTML = cart.map(item => {
    const info = cartItemLookup(item.id);
    if (!info) return "";
    const lineTotal = info.price * item.qty;
    total += lineTotal;
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
    summaryEl.innerHTML = `
      <div class="summary-row"><span>Items</span><span>${cartCount()}</span></div>
      <div class="summary-row total"><span>Estimated Total</span><span data-usd-price="${total}">$${total.toLocaleString()}</span></div>
    `;
  }
  if (typeof refreshCurrencyDisplay === "function") refreshCurrencyDisplay();
}

/* ============================================
   ORDER SUBMISSION → Smartsupp Live Chat
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
}

function submitOrder(event) {
  event.preventDefault();
  const cart = getCart();
  if (cart.length === 0) return;

  const name = document.getElementById("order-name").value.trim();
  const phoneCode = document.getElementById("order-phone-code").value;
  const phoneNumber = document.getElementById("order-phone").value.trim();
  const phone = `${phoneCode} ${phoneNumber}`;
  const email = document.getElementById("order-email").value.trim();
  const country = document.getElementById("order-country").value.trim();
  const address = document.getElementById("order-address").value.trim();
  const paymentMethod = document.getElementById("order-payment").value.trim();
  const notes = document.getElementById("order-notes").value.trim();

  let itemLines = "";
  let total = 0;
  cart.forEach(item => {
    const info = cartItemLookup(item.id);
    if (!info) return;
    const lineTotal = info.price * item.qty;
    total += lineTotal;
    const tag = info.kind === "bundle" ? "[KIT] " : info.kind === "accessory" ? "[ADD-ON] " : info.kind === "solar" ? "[SOLAR] " : "";
    itemLines += `- ${tag}${info.name} × ${item.qty} ($${lineTotal.toLocaleString()})\n`;
  });

  const message =
`New order request:

${itemLines}
Estimated Total: $${total.toLocaleString()}

Name: ${name}
Phone: ${phone}
Email: ${email}
Country: ${country}
Delivery Address: ${address}
Preferred Payment: ${paymentMethod}
Notes: ${notes || "—"}`;

  // Pre-fill and open the Smartsupp chat widget with the order details.
  // The visitor reviews the pre-filled message and hits send themselves.
  function trySmartsupp(retries) {
    if (typeof smartsupp === "function") {
      smartsupp("chat:message", message);
      smartsupp("chat:open");
    } else if (retries > 0) {
      // Smartsupp's script loads async — give it a moment if it hasn't initialized yet
      setTimeout(() => trySmartsupp(retries - 1), 400);
    } else {
      console.warn("Smartsupp did not load in time; order message was not pre-filled.");
    }
  }
  trySmartsupp(8);

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
   Uses frankfurter.app — free, no API key required, backed by ECB rates.
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
  // Primary + documented fallback host for fawazahmed0/currency-api — free, no key, supports 200+ currencies incl. NGN/XAF
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
  // Fallback source: frankfurter.app — only covers major currencies, but request each one separately
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
  return `≈ ${c.symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
}

// Re-scan the page for any element with data-usd-price and append/update a converted-price note beside it
async function refreshCurrencyDisplay() {
  const nodes = document.querySelectorAll("[data-usd-price]");
  if (nodes.length === 0) return;
  if (currentCurrency !== "USD") await fetchCurrencyRates();
  nodes.forEach(el => {
    const usd = parseFloat(el.getAttribute("data-usd-price"));
    let note = el.querySelector(".currency-note");
    if (currentCurrency === "USD") {
      if (note) note.remove();
      return;
    }
    const text = formatConverted(usd, currentCurrency);
    if (!note) {
      note = document.createElement("span");
      note.className = "currency-note";
      el.appendChild(note);
    }
    note.textContent = " " + text;
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

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initSearchBox();
  updateCompareBar();
  initCurrencySelector();
});
