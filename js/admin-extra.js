/* ============================================
   ADMIN EXTRA (core)
   Loaded by admin.html after its own inline script, so it can use that
   script's globals (apiRequest, escapeHtml, adminKey, products,
   accessories, solarPanels, bundles, currentSettings, reload*()).

   Contains: the grouped tab navigation, short "what this does" guides,
   Notifications / Orders / Messages / Change log panels, and the helpers
   the catalog tables use (reorder, duplicate, stock labels, CSV export).
   The remaining panels (promo codes, shipping, SEO, content, ...) live in
   js/admin-site-panels.js and register themselves through registerPanel().
   ============================================ */

/* ---------- tiny utilities ---------- */
const $ = (id) => document.getElementById(id);

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return Math.floor(secs / 60) + " min ago";
  if (secs < 86400) return Math.floor(secs / 3600) + " hr ago";
  if (secs < 86400 * 14) return Math.floor(secs / 86400) + " days ago";
  return fmtDate(iso);
}

function adminToast(msg) {
  const el = document.createElement("div");
  el.className = "admin-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function pill(text, kind) {
  return `<span class="pill ${kind || "muted"}">${escapeHtml(text)}</span>`;
}

function setStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text || "";
  el.className = "admin-status" + (kind ? " " + kind : "");
}

function guideHTML(what, how, affects) {
  const tag = affects === "site"
    ? `<span class="affects site-live">Changes the live site</span>`
    : `<span class="affects admin-only">Admin only, the live site is not touched</span>`;
  return `<div class="admin-guide"><strong>What this does:</strong> ${what}${how ? `<br><strong>How:</strong> ${how}` : ""}<br>${tag}</div>`;
}

function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// CSV with a UTF-8 BOM so Excel opens it correctly. Cells that start with
// = + - @ get a leading apostrophe so a spreadsheet never runs them as a formula.
function toCsv(columns, rows) {
  const cell = (v) => {
    let t = v == null ? "" : Array.isArray(v) ? v.join(" | ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@]/.test(t)) t = "'" + t;
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const head = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => cell(typeof c.get === "function" ? c.get(r) : r[c.key])).join(","));
  return "﻿" + [head, ...body].join("\r\n");
}

function todayStamp() { return new Date().toISOString().slice(0, 10); }

/* ---------- fresh-settings helpers ---------- */
// settings.js replaces the whole stored object on every save, so any
// section that saves must start from the LATEST stored copy, not from
// whatever this tab loaded earlier (another tab or section may have saved
// since). Merge only the keys you changed.
async function fetchLatestSettings() {
  try {
    const res = await fetch("/.netlify/functions/settings?t=" + Date.now());
    const data = res.ok ? await res.json() : null;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function saveSettingsPatch(patch) {
  const latest = await fetchLatestSettings();
  const merged = { ...(typeof currentSettings === "object" ? currentSettings : {}), ...latest, ...patch };
  delete merged._promoUsage; // computed by the server, never stored
  await apiRequest("POST", "settings", merged);
  currentSettings = merged;
  return merged;
}

/* ---------- panel registry + grouped navigation ---------- */
const ADMIN_GROUPS = [
  { id: "inbox", label: "Inbox", tabs: ["notifications", "orders", "messages"] },
  { id: "catalog", label: "Catalog", tabs: ["products", "accessories", "solar", "kits"] },
  { id: "marketing", label: "Marketing", tabs: ["promo", "codes", "shipping", "announcement"] },
  { id: "content", label: "Site Content", tabs: ["pages", "faq", "blog", "footer"] },
  { id: "seo", label: "SEO & Tracking", tabs: ["seo", "redirects", "tracking"] },
  { id: "settings", label: "Settings", tabs: ["contact", "branding", "store", "maintenance"] },
  { id: "tools", label: "Tools", tabs: ["log", "bulk", "export"] }
];

const PANELS = {
  notifications: { label: "Notifications" },
  orders: { label: "Orders" },
  messages: { label: "Messages" },
  products: { label: "Products", static: true },
  accessories: { label: "Accessories", static: true },
  solar: { label: "Solar Panels", static: true },
  kits: { label: "Power Kits", static: true },
  promo: { label: "Promo Settings", static: true },
  codes: { label: "Promo Codes" },
  shipping: { label: "Shipping" },
  announcement: { label: "Announcement Bar" },
  pages: { label: "Homepage & Pages" },
  faq: { label: "FAQ" },
  blog: { label: "Blog" },
  footer: { label: "Footer Links" },
  seo: { label: "Page SEO" },
  redirects: { label: "Redirects" },
  tracking: { label: "Tracking & Tags" },
  contact: { label: "Contact & Payment", static: true },
  branding: { label: "Logo & Colors" },
  store: { label: "Currency & Stock" },
  maintenance: { label: "Maintenance Mode" },
  log: { label: "Change Log" },
  bulk: { label: "Bulk Prices" },
  export: { label: "Export & Backup" }
};

// Other files add their panels here: registerPanel("codes", { guide: {...}, build(el){...}, onShow(){...} })
function registerPanel(id, def) {
  PANELS[id] = { ...(PANELS[id] || { label: id }), ...def };
}

let currentTab = null;

function groupOfTab(tabId) {
  return ADMIN_GROUPS.find((g) => g.tabs.includes(tabId)) || ADMIN_GROUPS[0];
}

function renderNav() {
  const groups = $("admin-groups");
  if (!groups) return;
  const activeGroup = groupOfTab(currentTab);
  groups.innerHTML = ADMIN_GROUPS.map((g) => `
    <button class="admin-tab-btn${g.id === activeGroup.id ? " active" : ""}" data-group="${g.id}">${escapeHtml(g.label)}${g.id === "inbox" ? `<span class="nav-badge hidden" id="badge-inbox"></span>` : ""}</button>
  `).join("");
  $("admin-subtabs").innerHTML = activeGroup.tabs.map((t) => `
    <button class="admin-sub-btn${t === currentTab ? " active" : ""}" data-tab="${t}">${escapeHtml(PANELS[t].label)}${t === "notifications" ? `<span class="nav-badge hidden" id="badge-notifications"></span>` : ""}</button>
  `).join("");
  updateBadges();
}

function ensurePanel(tabId) {
  let el = $("tab-" + tabId);
  const def = PANELS[tabId];
  if (!el) {
    el = document.createElement("div");
    el.className = "admin-tab-panel";
    el.id = "tab-" + tabId;
    const anchor = $("product-form") || $("admin-app").lastElementChild;
    $("admin-app").insertBefore(el, anchor);
  }
  if (!el.dataset.ready) {
    el.dataset.ready = "1";
    const guide = def.guide ? guideHTML(def.guide.what, def.guide.how, def.guide.affects) : "";
    if (def.static) {
      if (guide) el.insertAdjacentHTML("afterbegin", guide);
    } else {
      el.innerHTML = guide + `<div class="panel-body"></div>`;
      if (typeof def.build === "function") def.build(el.querySelector(".panel-body"));
    }
  }
  return el;
}

function showTab(tabId, fromHash) {
  if (!PANELS[tabId]) tabId = "notifications";
  currentTab = tabId;
  document.querySelectorAll(".admin-tab-panel").forEach((p) => p.classList.remove("active"));
  const el = ensurePanel(tabId);
  el.classList.add("active");
  renderNav();
  if (!fromHash) {
    try { history.replaceState(null, "", "#" + tabId); } catch (e) { /* ignore */ }
  }
  const def = PANELS[tabId];
  if (typeof def.onShow === "function") def.onShow();
}

function wireNav() {
  $("admin-groups").addEventListener("click", (e) => {
    const b = e.target.closest("[data-group]");
    if (!b) return;
    const g = ADMIN_GROUPS.find((x) => x.id === b.dataset.group);
    showTab(g.tabs[0]);
  });
  $("admin-subtabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) showTab(b.dataset.tab);
  });
  window.addEventListener("hashchange", () => {
    const t = location.hash.replace("#", "");
    if (t && PANELS[t] && t !== currentTab) showTab(t, true);
  });
}

// Short guides for the panels that already existed (their HTML is static)
registerPanel("products", { guide: { what: "Your power stations: add, edit, duplicate, reorder, or delete.", how: "Click Edit on a row, change the fields, press Save. Use Reorder to set the order shoppers see.", affects: "site" } });
registerPanel("accessories", { guide: { what: "Extra batteries, cables, and add-ons.", how: "Same as Products. Fill in 'Compatible product IDs' so the item shows on the right product pages.", affects: "site" } });
registerPanel("solar", { guide: { what: "Solar panels sold with the stations.", how: "Edit a panel, press Save. Prices and photos update on the site within a minute.", affects: "site" } });
registerPanel("kits", { guide: { what: "Ready-made bundles (a station plus accessories).", how: "Set the kit price and a higher 'compare-at' price to show the saving.", affects: "site" } });
registerPanel("promo", { guide: { what: "The main promo code, discount percentages, free-shipping amount, and sale end date.", how: "Change the numbers, press Save. For extra codes, use Marketing > Promo Codes.", affects: "site" } });
registerPanel("contact", { guide: { what: "Support email, phone, address, business hours, social links, and checkout payment methods.", how: "Edit the fields and press Save. Empty phone/address/social fields are hidden on the site.", affects: "site" } });

/* ---------- catalog helpers used by admin.html's tables ---------- */
const CATALOG = {
  products: { label: "products", path: "products", get arr() { return products; }, render: () => renderTable(), reload: () => reloadProducts(), tbody: "products-tbody", open: (id) => openForm(id), idInput: "f-id", nameInput: "f-name", title: "form-title" },
  accessories: { label: "accessories", path: "accessories", get arr() { return accessories; }, render: () => renderAccessoriesTable(), reload: () => reloadAccessories(), tbody: "accessories-tbody", open: (id) => openAccessoryForm(id), idInput: "af-id", nameInput: "af-name", title: "accessory-form-title" },
  solar: { label: "solar panels", path: "solar", get arr() { return solarPanels; }, render: () => renderSolarTable(), reload: () => reloadSolar(), tbody: "solar-tbody", open: (id) => openSolarForm(id), idInput: "sof-id", nameInput: "sof-name", title: "solar-form-title" },
  bundles: { label: "kits", path: "bundles", get arr() { return bundles; }, render: () => renderBundlesTable(), reload: () => reloadBundles(), tbody: "kits-tbody", open: (id) => openBundleForm(id), idInput: "kf-id", nameInput: "kf-name", title: "kit-form-title" }
};

// An existing item keeps its place when edited; a new one goes to the end.
// (Without this every edit reset the item's sort position to 0.)
function nextSortOrder(list, id) {
  const existing = (list || []).find((x) => x.id === id);
  if (existing && existing.sortOrder != null) return existing.sortOrder;
  const max = (list || []).reduce((m, x) => Math.max(m, Number(x.sortOrder) || 0), 0);
  return max + 10;
}

function lowStockLimit() {
  const n = Number(typeof currentSettings === "object" && currentSettings.lowStockThreshold);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

function stockCellHTML(item) {
  if (item.stockQty != null) {
    if (item.stockQty <= 0) return `<span class="low-stock">Out of Stock (0)</span>`;
    if (item.stockQty <= lowStockLimit()) return `<span class="low-stock">${item.stockQty} left, low</span>`;
    return `<span style="color:var(--accent);">${item.stockQty} in stock</span>`;
  }
  return item.inStock !== false
    ? '<span style="color:var(--accent);">In Stock</span>'
    : '<span style="color:var(--text-faint);">Out of Stock</span>';
}

function applyBadgePreset(inputId, sel) {
  const input = $(inputId);
  if (!input || !sel.value) return;
  input.value = sel.value === "__none" ? "" : sel.value;
  sel.value = "";
}

/* Reorder: up/down buttons (work on phones) and drag-and-drop (desktop) */
const reorderState = {};   // entity -> { on: bool, dirty: bool }

function reorderCellHTML(entity, index) {
  return `<button class="btn btn-secondary btn-sm" type="button" data-move="${entity}:${index}:-1" title="Move up">&#9650;</button> <button class="btn btn-secondary btn-sm" type="button" data-move="${entity}:${index}:1" title="Move down">&#9660;</button>`;
}

function toggleReorder(entity) {
  const c = CATALOG[entity];
  const st = (reorderState[entity] = reorderState[entity] || { on: false, dirty: false });
  st.on = !st.on;
  const table = $(c.tbody).closest("table");
  table.classList.toggle("reorder-on", st.on);
  $("reorder-btn-" + entity).textContent = st.on ? "Cancel reorder" : "Reorder";
  $("save-order-" + entity).style.display = st.on ? "" : "none";
  if (!st.on && st.dirty) { st.dirty = false; c.reload(); }
}

function moveItem(entity, index, delta) {
  const c = CATALOG[entity];
  const arr = c.arr;
  const j = index + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[index], arr[j]] = [arr[j], arr[index]];
  reorderState[entity].dirty = true;
  c.render();
}

async function saveReorder(entity) {
  const c = CATALOG[entity];
  const arr = c.arr;
  const st = reorderState[entity];
  const btn = $("save-order-" + entity);
  btn.disabled = true; btn.textContent = "Saving...";
  try {
    let changed = 0;
    for (let i = 0; i < arr.length; i++) {
      const wanted = (i + 1) * 10;
      if (arr[i].sortOrder === wanted) continue;
      await apiRequest("POST", c.path, { ...arr[i], sortOrder: wanted, _quiet: true });
      arr[i].sortOrder = wanted;
      changed++;
    }
    if (changed) {
      await apiRequest("POST", "admin-log", { action: "update", entity: c.path === "bundles" ? "bundles" : c.path, summary: `Reordered ${c.label} (${changed} moved)` });
    }
    st.dirty = false;
    adminToast(changed ? "Order saved. It's live on the site now." : "Nothing changed.");
    st.on = true; toggleReorder(entity);
    await c.reload();
  } catch (err) {
    adminToast("Couldn't save the order: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Save order";
  }
}

function wireReorderDrag() {
  ["products", "accessories", "solar", "bundles"].forEach((entity) => {
    const tbody = $(CATALOG[entity].tbody);
    let dragId = null;
    tbody.addEventListener("click", (e) => {
      const b = e.target.closest("[data-move]");
      if (!b) return;
      const [ent, idx, delta] = b.dataset.move.split(":");
      moveItem(ent, parseInt(idx, 10), parseInt(delta, 10));
    });
    tbody.addEventListener("mousedown", (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (tr) tr.draggable = !!(reorderState[entity] && reorderState[entity].on) && !e.target.closest("button,input,select,a");
    });
    tbody.addEventListener("dragstart", (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      dragId = tr.dataset.id;
      tr.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", dragId); } catch (err) { /* ignore */ }
    });
    tbody.addEventListener("dragover", (e) => { if (dragId) e.preventDefault(); });
    tbody.addEventListener("drop", (e) => {
      e.preventDefault();
      const target = e.target.closest("tr[data-id]");
      if (!target || !dragId || target.dataset.id === dragId) return;
      const arr = CATALOG[entity].arr;
      const from = arr.findIndex((x) => x.id === dragId);
      const to = arr.findIndex((x) => x.id === target.dataset.id);
      if (from < 0 || to < 0) return;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      reorderState[entity].dirty = true;
      CATALOG[entity].render();
    });
    tbody.addEventListener("dragend", () => { dragId = null; tbody.querySelectorAll(".dragging").forEach((r) => r.classList.remove("dragging")); });
  });
}

/* Duplicate: open the normal "add" form pre-filled from an existing item */
function duplicateItem(entity, id) {
  const c = CATALOG[entity];
  c.open(id);               // fills every field from the existing item
  const idEl = $(c.idInput);
  const used = new Set(c.arr.map((x) => x.id));
  let newId = id + "-copy", n = 2;
  while (used.has(newId)) newId = `${id}-copy-${n++}`;
  idEl.disabled = false;
  idEl.value = newId;
  const nameEl = $(c.nameInput);
  nameEl.value = nameEl.value + " (copy)";
  $(c.title).textContent = "Add (copy of " + id + ") - change the ID and name, then Save";
  adminToast("Copy opened below. Change the ID and name, then press Save.");
}

function injectCatalogToolbars() {
  const tabs = { products: "products", accessories: "accessories", solar: "solar", bundles: "kits" };
  Object.entries(tabs).forEach(([entity, tabId]) => {
    const toolbar = document.querySelector(`#tab-${tabId} .admin-toolbar`);
    if (!toolbar || toolbar.dataset.extras) return;
    toolbar.dataset.extras = "1";
    const div = document.createElement("div");
    div.innerHTML = `
      <button class="btn btn-secondary" type="button" id="reorder-btn-${entity}">Reorder</button>
      <button class="btn btn-primary" type="button" id="save-order-${entity}" style="display:none;">Save order</button>
      <button class="btn btn-secondary" type="button" data-export="${entity}">Export CSV</button>`;
    toolbar.appendChild(div);
    $("reorder-btn-" + entity).addEventListener("click", () => toggleReorder(entity));
    $("save-order-" + entity).addEventListener("click", () => saveReorder(entity));
    div.querySelector("[data-export]").addEventListener("click", () => exportCatalogCsv(entity));
  });
}

const CATALOG_CSV = {
  products: [["id", "ID"], ["name", "Name"], ["series", "Series"], ["price", "Price"], ["ecoflowPrice", "EcoFlow price"], ["capacityLabel", "Capacity"], ["outputW", "Output W"], ["stockQty", "Stock qty"], ["inStock", "In stock"], ["featured", "Featured"], ["badge", "Badge"], ["tagline", "Tagline"]],
  accessories: [["id", "ID"], ["name", "Name"], ["category", "Category"], ["price", "Price"], ["stockQty", "Stock qty"], ["compatibleWith", "Compatible with"], ["tagline", "Tagline"]],
  solar: [["id", "ID"], ["name", "Name"], ["watts", "Watts"], ["price", "Price"], ["stockQty", "Stock qty"], ["compatibleWith", "Compatible with"], ["tagline", "Tagline"]],
  bundles: [["id", "ID"], ["name", "Name"], ["productId", "Base product"], ["price", "Price"], ["compareAt", "Compare at"], ["featured", "Featured"], ["badge", "Badge"], ["accessories", "Includes"], ["tagline", "Tagline"]]
};

function exportCatalogCsv(entity) {
  const c = CATALOG[entity];
  const cols = CATALOG_CSV[entity].map(([key, label]) => ({ key, label }));
  downloadFile(`voltreserve-${c.path}-${todayStamp()}.csv`, toCsv(cols, c.arr), "text/csv;charset=utf-8");
}

/* ============================================
   NOTIFICATIONS
   ============================================ */
const NT = { items: [], counts: { unread: 0, needsAttention: 0 }, filter: "all", timer: null, lastUnread: null, loaded: false };

function updateBadges() {
  const n = NT.counts.unread;
  ["badge-inbox", "badge-notifications"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.textContent = n > 99 ? "99+" : String(n);
    el.classList.toggle("hidden", n <= 0);
  });
  document.title = (n > 0 ? `(${n}) ` : "") + "Admin, VoltReserve";
}

function notificationStatusPill(n) {
  if (n.status === "sent") return pill("Emails sent", "ok");
  if (n.status === "failed") return pill("Emails failed", "bad");
  const which = !n.ownerSent ? "Your email failed" : "Customer email failed";
  return pill(which, "warn");
}

function notificationBodyHTML(n) {
  const p = n.payload || {};
  let details = "";
  if (n.type === "order") {
    details = `<dl class="kv">
      <dt>Customer</dt><dd>${escapeHtml(p.name || "Not provided")}</dd>
      <dt>Email</dt><dd>${escapeHtml(p.email || "")}</dd>
      <dt>Phone</dt><dd>${escapeHtml(p.phone || "Not provided")}</dd>
      <dt>Country</dt><dd>${escapeHtml(p.country || "Not provided")}</dd>
      <dt>Address</dt><dd>${escapeHtml(p.address || "Not provided")}</dd>
      <dt>Payment</dt><dd>${escapeHtml(p.paymentMethod || "Not provided")}</dd>
      <dt>Promo code</dt><dd>${escapeHtml(p.promoCode || "None")}</dd>
      <dt>Notes</dt><dd>${escapeHtml(p.notes || "None")}</dd>
      <dt>Items</dt><dd>${(p.itemLines || []).map((l) => escapeHtml(l)).join("\n")}</dd>
      <dt>Total</dt><dd>$${Number(p.total || 0).toLocaleString()}</dd>
    </dl>`;
  } else {
    details = `<dl class="kv">
      <dt>Name</dt><dd>${escapeHtml(p.name || "Not provided")}</dd>
      <dt>Email</dt><dd>${escapeHtml(p.email || "")}</dd>
      <dt>Message</dt><dd>${escapeHtml(p.message || "")}</dd>
    </dl>`;
  }
  const err = n.error ? `<div class="err-box">${escapeHtml(n.error)}</div>` : "";
  const tried = n.resentCount ? `<p class="admin-hint">Re-sent ${n.resentCount} time${n.resentCount === 1 ? "" : "s"}${n.lastAttemptAt ? ", last try " + escapeHtml(timeAgo(n.lastAttemptAt)) : ""}.</p>` : "";
  const resendLabel = n.status === "sent" ? "Resend both emails" : (n.status === "partial" ? (!n.ownerSent ? "Resend my email" : "Resend customer email") : "Resend failed emails");
  const jump = n.type === "order" ? `<button class="btn btn-secondary btn-sm" data-act="jump" data-id="${n.id}">Open in Orders</button>` : `<button class="btn btn-secondary btn-sm" data-act="jump" data-id="${n.id}">Open in Messages</button>`;
  return `${details}${err}${tried}
    <div class="btn-row">
      <button class="btn ${n.status === "sent" ? "btn-secondary" : "btn-primary"} btn-sm" data-act="resend" data-id="${n.id}">${resendLabel}</button>
      ${n.status !== "sent" ? `<button class="btn btn-secondary btn-sm" data-act="resend-both" data-id="${n.id}">Resend both</button>` : ""}
      <button class="btn btn-secondary btn-sm" data-act="${n.read ? "unread" : "read"}" data-id="${n.id}">${n.read ? "Mark unread" : "Mark read"}</button>
      ${jump}
    </div>`;
}

function renderNotifications() {
  const list = $("nt-list");
  if (!list) return;
  let items = NT.items;
  if (NT.filter === "unread") items = items.filter((n) => !n.read);
  else if (NT.filter === "attention") items = items.filter((n) => n.status !== "sent");
  else if (NT.filter === "order" || NT.filter === "contact") items = items.filter((n) => n.type === NT.filter);
  if (!items.length) {
    list.innerHTML = `<div class="empty-state">${NT.items.length ? "Nothing matches this filter." : "No notifications yet. Every order and contact message will show up here, with a note on whether its emails went out."}</div>`;
    return;
  }
  const openIds = new Set([...list.querySelectorAll(".item-card.open")].map((c) => c.dataset.id));
  list.innerHTML = items.map((n) => `
    <div class="item-card${n.read ? "" : " unread"}${openIds.has(n.id) ? " open" : ""}" data-id="${n.id}">
      <div class="item-head" data-act="toggle" data-id="${n.id}">
        <div class="item-icon">${n.type === "order" ? "ORD" : "MSG"}</div>
        <div class="item-main">
          <div class="item-title">${escapeHtml(n.title)}</div>
          <div class="item-sub">${escapeHtml(n.summary || "")}</div>
        </div>
        <div class="item-meta"><span>${escapeHtml(timeAgo(n.createdAt))}</span>${notificationStatusPill(n)}</div>
      </div>
      <div class="item-body">${notificationBodyHTML(n)}</div>
    </div>
  `).join("");
}

async function loadNotifications(silent) {
  const status = $("nt-status");
  try {
    const data = await apiRequest("GET", "notifications?limit=500");
    const prevUnread = NT.lastUnread;
    NT.items = data.items || [];
    NT.counts = data.counts || { unread: 0, needsAttention: 0 };
    NT.loaded = true;
    if (prevUnread !== null && NT.counts.unread > prevUnread) adminToast("New notification in your Inbox");
    NT.lastUnread = NT.counts.unread;
    updateBadges();
    renderNotifications();
    setStatus(status, NT.counts.needsAttention ? `${NT.counts.needsAttention} need attention (an email didn't go out).` : "", NT.counts.needsAttention ? "error" : "");
  } catch (err) {
    if (!silent) setStatus(status, err.message, "error");
  }
}

async function notificationAction(act, id) {
  const status = $("nt-status");
  try {
    if (act === "read" || act === "unread") {
      await apiRequest("POST", "notifications", { action: act, id });
      const n = NT.items.find((x) => x.id === id);
      if (n) n.read = act === "read";
      NT.counts.unread = NT.items.filter((x) => !x.read).length;
      updateBadges(); renderNotifications();
    } else if (act === "resend" || act === "resend-both") {
      if (act === "resend-both" && !confirm("Send BOTH emails again? The customer will get a second copy of their confirmation.")) return;
      const n0 = NT.items.find((x) => x.id === id);
      if (act === "resend" && n0 && n0.status === "sent" && !confirm("Both emails already went out. Send them again?")) return;
      setStatus(status, "Sending...");
      const body = { action: "resend", id };
      if (act === "resend-both" || (n0 && n0.status === "sent")) body.target = "both";
      const res = await apiRequest("POST", "notifications", body);
      setStatus(status, res.ok ? "Sent successfully." : "Tried again, but an email still failed. See the red note on the card.", res.ok ? "success" : "error");
      await loadNotifications(true);
    } else if (act === "jump") {
      const n = NT.items.find((x) => x.id === id);
      if (!n) return;
      showTab(n.type === "order" ? "orders" : "messages");
    }
  } catch (err) {
    setStatus(status, err.message, "error");
  }
}

registerPanel("notifications", {
  guide: { what: "Every order and contact message, with a note on whether its emails were delivered. If an email fails, it waits here so nothing is lost.", how: "Click an item to open it. Use Resend to try the failed email again. This page refreshes itself every 30 seconds.", affects: "admin" },
  build(el) {
    el.innerHTML = `
      <div class="toolbar-row">
        <select id="nt-filter">
          <option value="all">Everything</option>
          <option value="attention">Needs attention (email failed)</option>
          <option value="unread">Unread</option>
          <option value="order">Orders only</option>
          <option value="contact">Contact messages only</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="nt-refresh">Refresh</button>
        <button class="btn btn-secondary btn-sm" id="nt-readall">Mark all read</button>
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" id="nt-export">Export CSV</button>
      </div>
      <p id="nt-status" class="admin-status"></p>
      <div id="nt-list"><div class="empty-state">Loading...</div></div>`;
    $("nt-filter").addEventListener("change", (e) => { NT.filter = e.target.value; renderNotifications(); });
    $("nt-refresh").addEventListener("click", () => loadNotifications());
    $("nt-readall").addEventListener("click", async () => {
      try { await apiRequest("POST", "notifications", { action: "readall" }); await loadNotifications(); } catch (err) { setStatus($("nt-status"), err.message, "error"); }
    });
    $("nt-export").addEventListener("click", () => {
      downloadFile(`voltreserve-notifications-${todayStamp()}.csv`, toCsv([
        { label: "Received", get: (n) => n.createdAt }, { label: "Type", key: "type" }, { label: "Title", key: "title" },
        { label: "Status", key: "status" }, { label: "Owner email sent", get: (n) => n.ownerSent }, { label: "Customer email sent", get: (n) => n.customerSent },
        { label: "Customer email", get: (n) => (n.payload || {}).email }, { label: "Summary", key: "summary" }, { label: "Error", key: "error" }
      ], NT.items), "text/csv;charset=utf-8");
    });
    $("nt-list").addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]");
      if (!t) return;
      const act = t.dataset.act, id = t.dataset.id;
      if (act === "toggle") {
        const card = t.closest(".item-card");
        card.classList.toggle("open");
        const n = NT.items.find((x) => x.id === id);
        if (card.classList.contains("open") && n && !n.read && n.status === "sent") notificationAction("read", id);
        return;
      }
      notificationAction(act, id);
    });
  },
  onShow() { loadNotifications(); }
});

function startNotificationPolling() {
  if (NT.timer) return;
  loadNotifications(true);
  NT.timer = setInterval(() => { if (!document.hidden && adminKey()) loadNotifications(true); }, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && adminKey()) loadNotifications(true); });
}

/* ============================================
   ORDERS
   ============================================ */
const ORDER_STATUSES = [["new", "New"], ["confirmed", "Confirmed"], ["paid", "Paid"], ["shipped", "Shipped"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]];
const ORDER_PILL = { new: "info", confirmed: "info", paid: "ok", shipped: "ok", delivered: "muted", cancelled: "bad" };
const OR = { items: [], filter: "", search: "" };

function orderCardHTML(o, open) {
  const label = (ORDER_STATUSES.find((s) => s[0] === o.status) || [o.status, o.status])[1];
  const opts = ORDER_STATUSES.map(([v, l]) => `<option value="${v}"${v === o.status ? " selected" : ""}>${l}</option>`).join("");
  return `
  <div class="item-card${open ? " open" : ""}" data-id="${o.id}">
    <div class="item-head" data-act="toggle">
      <div class="item-icon">ORD</div>
      <div class="item-main">
        <div class="item-title">${escapeHtml(o.name || o.email)} <span style="font-weight:400; color:var(--text-dim);">$${Number(o.total || 0).toLocaleString()}</span></div>
        <div class="item-sub">${escapeHtml((o.itemLines || []).join("; "))}</div>
      </div>
      <div class="item-meta"><span>${escapeHtml(fmtDate(o.createdAt))}</span><span>${pill(label, ORDER_PILL[o.status] || "muted")}${o.emailsSent ? "" : " " + pill("Email issue", "warn")}</span></div>
    </div>
    <div class="item-body">
      <dl class="kv">
        <dt>Email</dt><dd>${escapeHtml(o.email)}</dd>
        <dt>Phone</dt><dd>${escapeHtml(o.phone || "Not provided")}</dd>
        <dt>Country</dt><dd>${escapeHtml(o.country || "Not provided")}</dd>
        <dt>Address</dt><dd>${escapeHtml(o.address || "Not provided")}</dd>
        <dt>Payment</dt><dd>${escapeHtml(o.paymentMethod || "Not provided")}</dd>
        <dt>Promo code</dt><dd>${escapeHtml(o.promoCode || "None")}${Number(o.discountPercent) > 0 ? ` (${o.discountPercent}% off, saved $${Number(o.discountAmount || 0).toLocaleString()})` : ""}</dd>
        <dt>Customer notes</dt><dd>${escapeHtml(o.notes || "None")}</dd>
        <dt>Items</dt><dd>${(o.itemLines || []).map((l) => escapeHtml(l)).join("\n")}</dd>
        <dt>Stock</dt><dd>${o.stockApplied ? "Stock already reduced for this order" : "Not reduced yet (happens when you confirm the order, for items with a stock quantity)"}</dd>
      </dl>
      ${o.emailsSent ? "" : `<div class="err-box">The emails for this order didn't go out. Open Inbox &gt; Notifications to resend them.</div>`}
      <div class="field-row">
        <div class="field"><label>Status</label><select data-f="status">${opts}</select></div>
        <div class="field"><label>Tracking number</label><input type="text" data-f="trackingNumber" value="${escapeHtml(o.trackingNumber)}"></div>
      </div>
      <div class="field-row full"><div class="field"><label>Tracking link (optional)</label><input type="url" data-f="trackingUrl" value="${escapeHtml(o.trackingUrl)}" placeholder="https://..."></div></div>
      <div class="field-row full"><div class="field"><label>Private notes (only you see these)</label><textarea data-f="adminNotes">${escapeHtml(o.adminNotes)}</textarea></div></div>
      <label class="check-inline"><input type="checkbox" data-f="emailCustomer"> Email the customer about this update</label>
      <div class="field-row full" style="margin-top:8px;"><div class="field"><label>Extra message for the customer (optional, only sent with the email above)</label><textarea data-f="emailNote"></textarea></div></div>
      <div class="btn-row"><button class="btn btn-primary btn-sm" data-act="save">Save changes</button></div>
      <p class="admin-status" data-f="status-msg"></p>
    </div>
  </div>`;
}

function renderOrders() {
  const list = $("or-list");
  if (!list) return;
  const open = new Set([...list.querySelectorAll(".item-card.open")].map((c) => c.dataset.id));
  const q = OR.search.trim().toLowerCase();
  const items = OR.items.filter((o) => (!OR.filter || o.status === OR.filter) && (!q || JSON.stringify([o.name, o.email, o.phone, o.country, o.itemLines, o.trackingNumber]).toLowerCase().includes(q)));
  list.innerHTML = items.length ? items.map((o) => orderCardHTML(o, open.has(o.id))).join("") :
    `<div class="empty-state">${OR.items.length ? "No orders match." : "No orders yet. Orders placed on the site will appear here."}</div>`;
}

async function loadOrders() {
  setStatus($("or-status"), "Loading...");
  try {
    OR.items = await apiRequest("GET", "orders?limit=1000");
    setStatus($("or-status"), `${OR.items.length} order${OR.items.length === 1 ? "" : "s"}`);
    renderOrders();
  } catch (err) {
    setStatus($("or-status"), err.message, "error");
  }
}

async function saveOrderCard(card) {
  const id = card.dataset.id;
  const f = (n) => card.querySelector(`[data-f="${n}"]`);
  const msg = f("status-msg");
  setStatus(msg, "Saving...");
  try {
    const body = {
      id,
      status: f("status").value,
      trackingNumber: f("trackingNumber").value,
      trackingUrl: f("trackingUrl").value,
      adminNotes: f("adminNotes").value,
      emailCustomer: f("emailCustomer").checked,
      emailNote: f("emailNote").value
    };
    const res = await apiRequest("POST", "orders", body);
    const idx = OR.items.findIndex((o) => o.id === id);
    if (idx >= 0) OR.items[idx] = res.order;
    let text = "Saved.";
    if (res.emailed === true) text += " Customer emailed.";
    if (res.warnings && res.warnings.length) text += " " + res.warnings.join(" ");
    renderOrders();
    const fresh = document.querySelector(`#or-list [data-id="${id}"]`);
    if (fresh) { fresh.classList.add("open"); setStatus(fresh.querySelector('[data-f="status-msg"]'), text, res.warnings && res.warnings.length ? "error" : "success"); }
  } catch (err) {
    setStatus(msg, "Couldn't save: " + err.message, "error");
  }
}

registerPanel("orders", {
  guide: { what: "Every order placed on the site. Set its status, add a tracking number, keep private notes.", how: "Click an order to open it, change the fields, press Save. Tick 'Email the customer' to send them the update. Confirming an order also lowers stock for items that have a stock quantity.", affects: "admin" },
  build(el) {
    el.innerHTML = `
      <div class="toolbar-row">
        <select id="or-filter"><option value="">All statuses</option>${ORDER_STATUSES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
        <input type="search" id="or-search" placeholder="Search name, email, item...">
        <button class="btn btn-secondary btn-sm" id="or-refresh">Refresh</button>
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" id="or-export">Export CSV</button>
      </div>
      <p id="or-status" class="admin-status"></p>
      <div id="or-list"><div class="empty-state">Loading...</div></div>`;
    $("or-filter").addEventListener("change", (e) => { OR.filter = e.target.value; renderOrders(); });
    $("or-search").addEventListener("input", (e) => { OR.search = e.target.value; renderOrders(); });
    $("or-refresh").addEventListener("click", loadOrders);
    $("or-export").addEventListener("click", () => {
      downloadFile(`voltreserve-orders-${todayStamp()}.csv`, toCsv([
        { label: "Date", get: (o) => o.createdAt }, { label: "Status", key: "status" }, { label: "Name", key: "name" }, { label: "Email", key: "email" },
        { label: "Phone", key: "phone" }, { label: "Country", key: "country" }, { label: "Address", key: "address" }, { label: "Payment", key: "paymentMethod" },
        { label: "Promo code", key: "promoCode" }, { label: "Discount %", key: "discountPercent" }, { label: "Total", key: "total" },
        { label: "Items", get: (o) => (o.itemLines || []).join(" | ") }, { label: "Tracking", key: "trackingNumber" }, { label: "Notes", key: "notes" }, { label: "Private notes", key: "adminNotes" }
      ], OR.items), "text/csv;charset=utf-8");
    });
    $("or-list").addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]");
      if (!t) return;
      const card = t.closest(".item-card");
      if (t.dataset.act === "toggle") card.classList.toggle("open");
      else if (t.dataset.act === "save") saveOrderCard(card);
    });
  },
  onShow() { loadOrders(); }
});

/* ============================================
   MESSAGES
   ============================================ */
const MS = { items: [], filter: "", search: "" };
const MSG_STATUSES = [["new", "New", "info"], ["replied", "Replied", "ok"], ["closed", "Closed", "muted"]];

function messageCardHTML(m, open) {
  const st = MSG_STATUSES.find((s) => s[0] === m.status) || MSG_STATUSES[0];
  return `
  <div class="item-card${open ? " open" : ""}${m.status === "new" ? " unread" : ""}" data-id="${m.id}">
    <div class="item-head" data-act="toggle">
      <div class="item-icon">MSG</div>
      <div class="item-main">
        <div class="item-title">${escapeHtml(m.name || m.email)}</div>
        <div class="item-sub">${escapeHtml(m.message)}</div>
      </div>
      <div class="item-meta"><span>${escapeHtml(fmtDate(m.createdAt))}</span><span>${pill(st[1], st[2])}${m.emailsSent ? "" : " " + pill("Email issue", "warn")}</span></div>
    </div>
    <div class="item-body">
      <dl class="kv">
        <dt>From</dt><dd>${escapeHtml(m.name || "Not provided")} &lt;${escapeHtml(m.email)}&gt;</dd>
        <dt>Message</dt><dd>${escapeHtml(m.message)}</dd>
        ${m.repliedAt ? `<dt>Replied</dt><dd>${escapeHtml(fmtDate(m.repliedAt))}</dd>` : ""}
      </dl>
      ${m.emailsSent ? "" : `<div class="err-box">The emails for this message didn't go out. Open Inbox &gt; Notifications to resend them.</div>`}
      <div class="field-row full"><div class="field"><label>Reply to ${escapeHtml(m.email)} (sent from your site email)</label><textarea data-f="reply" placeholder="Write your reply..."></textarea></div></div>
      <div class="btn-row"><button class="btn btn-primary btn-sm" data-act="reply">Send reply</button></div>
      <div class="field-row full" style="margin-top:14px;"><div class="field"><label>Private notes (only you see these)</label><textarea data-f="adminNotes">${escapeHtml(m.adminNotes)}</textarea></div></div>
      <div class="btn-row">
        <button class="btn btn-secondary btn-sm" data-act="notes">Save notes</button>
        ${MSG_STATUSES.filter((s) => s[0] !== m.status).map((s) => `<button class="btn btn-secondary btn-sm" data-act="status" data-status="${s[0]}">Mark ${s[1].toLowerCase()}</button>`).join("")}
      </div>
      <p class="admin-status" data-f="status-msg"></p>
    </div>
  </div>`;
}

function renderMessages() {
  const list = $("ms-list");
  if (!list) return;
  const open = new Set([...list.querySelectorAll(".item-card.open")].map((c) => c.dataset.id));
  const q = MS.search.trim().toLowerCase();
  const items = MS.items.filter((m) => (!MS.filter || m.status === MS.filter) && (!q || JSON.stringify([m.name, m.email, m.message]).toLowerCase().includes(q)));
  list.innerHTML = items.length ? items.map((m) => messageCardHTML(m, open.has(m.id))).join("") :
    `<div class="empty-state">${MS.items.length ? "No messages match." : "No messages yet. Messages from the Contact page will appear here."}</div>`;
}

async function loadMessages() {
  setStatus($("ms-status"), "Loading...");
  try {
    MS.items = await apiRequest("GET", "messages?limit=1000");
    const fresh = MS.items.filter((m) => m.status === "new").length;
    setStatus($("ms-status"), `${MS.items.length} message${MS.items.length === 1 ? "" : "s"}${fresh ? `, ${fresh} new` : ""}`);
    renderMessages();
  } catch (err) {
    setStatus($("ms-status"), err.message, "error");
  }
}

async function messageAction(card, act, statusValue) {
  const id = card.dataset.id;
  const msg = card.querySelector('[data-f="status-msg"]');
  const m = MS.items.find((x) => x.id === id);
  try {
    let res;
    if (act === "reply") {
      const body = card.querySelector('[data-f="reply"]').value.trim();
      if (!body) { setStatus(msg, "Write a reply first.", "error"); return; }
      if (!confirm(`Send this reply to ${m.email}?`)) return;
      setStatus(msg, "Sending...");
      res = await apiRequest("POST", "messages", { action: "reply", id, body });
    } else if (act === "notes") {
      setStatus(msg, "Saving...");
      res = await apiRequest("POST", "messages", { id, adminNotes: card.querySelector('[data-f="adminNotes"]').value });
    } else if (act === "status") {
      res = await apiRequest("POST", "messages", { id, status: statusValue });
    }
    const idx = MS.items.findIndex((x) => x.id === id);
    if (idx >= 0) MS.items[idx] = res.message;
    renderMessages();
    const fresh = document.querySelector(`#ms-list [data-id="${id}"]`);
    if (fresh) { fresh.classList.add("open"); setStatus(fresh.querySelector('[data-f="status-msg"]'), act === "reply" ? "Reply sent." : "Saved.", "success"); }
  } catch (err) {
    setStatus(msg, err.message, "error");
  }
}

registerPanel("messages", {
  guide: { what: "Messages sent through the Contact page. Read them, reply by email, and mark them done.", how: "Click a message, type your reply, press Send reply. The customer's answer goes to your normal support inbox.", affects: "admin" },
  build(el) {
    el.innerHTML = `
      <div class="toolbar-row">
        <select id="ms-filter"><option value="">All messages</option>${MSG_STATUSES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
        <input type="search" id="ms-search" placeholder="Search name, email, text...">
        <button class="btn btn-secondary btn-sm" id="ms-refresh">Refresh</button>
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" id="ms-export">Export CSV</button>
      </div>
      <p id="ms-status" class="admin-status"></p>
      <div id="ms-list"><div class="empty-state">Loading...</div></div>`;
    $("ms-filter").addEventListener("change", (e) => { MS.filter = e.target.value; renderMessages(); });
    $("ms-search").addEventListener("input", (e) => { MS.search = e.target.value; renderMessages(); });
    $("ms-refresh").addEventListener("click", loadMessages);
    $("ms-export").addEventListener("click", () => {
      downloadFile(`voltreserve-messages-${todayStamp()}.csv`, toCsv([
        { label: "Date", get: (m) => m.createdAt }, { label: "Status", key: "status" }, { label: "Name", key: "name" },
        { label: "Email", key: "email" }, { label: "Message", key: "message" }, { label: "Private notes", key: "adminNotes" }
      ], MS.items), "text/csv;charset=utf-8");
    });
    $("ms-list").addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]");
      if (!t) return;
      const card = t.closest(".item-card");
      if (t.dataset.act === "toggle") card.classList.toggle("open");
      else messageAction(card, t.dataset.act, t.dataset.status);
    });
  },
  onShow() { loadMessages(); }
});

/* ============================================
   CHANGE LOG (with restore)
   ============================================ */
const LG = { items: [], filter: "" };
const LOG_PATHS = { products: "products", accessories: "accessories", solar: "solar", bundles: "bundles", settings: "settings", blog: "blog" };
const ENTITY_LABELS = { products: "Product", accessories: "Accessory", solar: "Solar panel", bundles: "Kit", settings: "Settings", blog: "Blog post", orders: "Order", messages: "Message", notifications: "Notification", stock: "Stock" };

function canRestore(e) {
  if (!LOG_PATHS[e.entity]) return false;
  if (e.entity === "settings") return !!e.before;
  if (e.action === "delete") return !!e.before;
  if (e.action === "save") return true;     // revert an edit, or undo an add (delete)
  return false;
}

async function restoreEntry(e) {
  const path = LOG_PATHS[e.entity];
  const isUndoAdd = e.action === "save" && !e.before && e.entity !== "settings";
  const text = e.entity === "settings"
    ? "Put ALL site settings back to how they were before this change? Anything changed in settings since then will also be undone."
    : isUndoAdd ? `Undo adding "${e.entityId}"? It will be deleted.`
    : `Restore "${e.entityId}" to how it was before this change?`;
  if (!confirm(text)) return;
  try {
    if (isUndoAdd) await apiRequest("DELETE", path, { id: e.entityId });
    else await apiRequest("POST", path, e.before);
    adminToast("Restored.");
    await loadLog();
    ["products", "accessories", "solar", "bundles"].forEach((k) => { if (CATALOG[k]) CATALOG[k].reload(); });
  } catch (err) {
    alert("Couldn't restore: " + err.message);
  }
}

function renderLog() {
  const list = $("lg-list");
  if (!list) return;
  const items = LG.items.filter((e) => !LG.filter || e.entity === LG.filter);
  if (!items.length) { list.innerHTML = `<div class="empty-state">No changes recorded yet.</div>`; return; }
  list.innerHTML = items.map((e, i) => `
    <div class="log-row">
      <div class="when">${escapeHtml(fmtDate(e.createdAt))}</div>
      <div style="flex:1;">${pill(ENTITY_LABELS[e.entity] || e.entity, "muted")} ${escapeHtml(e.summary || e.action)}</div>
      <div>${canRestore(e) ? `<button class="btn btn-secondary btn-sm" data-restore="${i}">${e.action === "save" && !e.before && e.entity !== "settings" ? "Undo add" : "Restore"}</button>` : ""}</div>
    </div>`).join("");
  list._items = items;
}

async function loadLog() {
  setStatus($("lg-status"), "Loading...");
  try {
    LG.items = await apiRequest("GET", "admin-log?limit=500");
    setStatus($("lg-status"), `${LG.items.length} recent change${LG.items.length === 1 ? "" : "s"}`);
    renderLog();
  } catch (err) {
    setStatus($("lg-status"), err.message, "error");
  }
}

registerPanel("log", {
  guide: { what: "A history of what was changed in the admin panel and when. Edits and deletes can be undone.", how: "Press Restore on a line to put that item back how it was before the change.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <div class="toolbar-row">
        <select id="lg-filter"><option value="">All changes</option>${Object.entries(ENTITY_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <button class="btn btn-secondary btn-sm" id="lg-refresh">Refresh</button>
      </div>
      <p id="lg-status" class="admin-status"></p>
      <div id="lg-list"><div class="empty-state">Loading...</div></div>`;
    $("lg-filter").addEventListener("change", (e) => { LG.filter = e.target.value; renderLog(); });
    $("lg-refresh").addEventListener("click", loadLog);
    $("lg-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-restore]");
      if (b) restoreEntry($("lg-list")._items[parseInt(b.dataset.restore, 10)]);
    });
  },
  onShow() { loadLog(); }
});

/* ============================================
   BULK PRICE CHANGE
   ============================================ */
const BK = { entity: "products" };

function bulkCompute() {
  const pct = parseFloat($("bk-percent").value);
  const round = $("bk-round").value;
  const needle = $("bk-filter").value.trim().toLowerCase();
  const list = CATALOG[BK.entity].arr.filter((x) => !needle || (x.name + " " + x.id).toLowerCase().includes(needle));
  return list.map((x) => {
    let next = Number(x.price) * (1 + (isNaN(pct) ? 0 : pct) / 100);
    if (round === "dollar") next = Math.round(next);
    else if (round === "99") next = Math.max(0.99, Math.round(next) - 0.01);
    else next = Math.round(next * 100) / 100;
    return { item: x, from: Number(x.price), to: next };
  });
}

function renderBulkPreview() {
  const rows = bulkCompute();
  const pct = parseFloat($("bk-percent").value);
  $("bk-preview").innerHTML = isNaN(pct) || pct === 0
    ? `<div class="empty-state">Enter a percentage (for example 10 to raise prices 10%, or -5 to lower them 5%) to see a preview.</div>`
    : `<table class="admin-table"><thead><tr><th>Item</th><th>Now</th><th>New</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${escapeHtml(r.item.name)}</td><td>$${r.from.toLocaleString()}</td><td><strong>$${r.to.toLocaleString()}</strong></td></tr>`).join("")}</tbody></table>`;
  $("bk-apply").disabled = isNaN(pct) || pct === 0 || !rows.length;
  $("bk-apply").textContent = `Apply to ${rows.length} item${rows.length === 1 ? "" : "s"}`;
}

registerPanel("bulk", {
  guide: { what: "Raise or lower many prices at once by a percentage.", how: "Pick what to change, type a percent (use a minus sign to lower), check the preview, then press Apply. Every change is saved in the Change Log.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <div class="rowform">
        <div class="field"><label>Change prices of</label><select id="bk-entity"><option value="products">Products</option><option value="accessories">Accessories</option><option value="solar">Solar panels</option><option value="bundles">Power kits</option></select></div>
        <div class="field"><label>Percent change</label><input type="number" id="bk-percent" step="0.1" placeholder="e.g. 10 or -5"></div>
        <div class="field"><label>Rounding</label><select id="bk-round"><option value="cents">Keep cents</option><option value="dollar">Nearest whole dollar</option><option value="99">End in .99</option></select></div>
        <div class="field"><label>Only names containing (optional)</label><input type="text" id="bk-filter" placeholder="e.g. RIVER"></div>
      </div>
      <div id="bk-preview"></div>
      <div class="btn-row"><button class="btn btn-primary" id="bk-apply" disabled>Apply</button></div>
      <p id="bk-status" class="admin-status"></p>`;
    ["bk-percent", "bk-round", "bk-filter"].forEach((id) => $(id).addEventListener("input", renderBulkPreview));
    $("bk-entity").addEventListener("change", async (e) => { BK.entity = e.target.value; await CATALOG[BK.entity].reload(); renderBulkPreview(); });
    $("bk-apply").addEventListener("click", async () => {
      const rows = bulkCompute();
      const pct = parseFloat($("bk-percent").value);
      if (!rows.length || isNaN(pct)) return;
      if (!confirm(`Change the price of ${rows.length} item(s) by ${pct}%? This goes live on the site right away.`)) return;
      const c = CATALOG[BK.entity];
      const status = $("bk-status");
      $("bk-apply").disabled = true;
      try {
        let done = 0;
        for (const r of rows) {
          setStatus(status, `Updating ${++done} of ${rows.length}...`);
          await apiRequest("POST", c.path, { ...r.item, price: r.to, _quiet: true });
        }
        await apiRequest("POST", "admin-log", { action: "update", entity: c.path, summary: `Bulk price change ${pct > 0 ? "+" : ""}${pct}% on ${rows.length} ${c.label}` });
        setStatus(status, `Done. ${rows.length} price${rows.length === 1 ? "" : "s"} updated.`, "success");
        $("bk-percent").value = "";
        await c.reload();
        renderBulkPreview();
      } catch (err) {
        setStatus(status, "Stopped: " + err.message + ". Some prices may already have changed, check the Change Log.", "error");
      }
    });
  },
  async onShow() { await CATALOG[BK.entity].reload(); renderBulkPreview(); }
});

/* ============================================
   EXPORT & BACKUP
   ============================================ */
registerPanel("export", {
  guide: { what: "Download your data as spreadsheets (CSV) or one full backup file (JSON).", how: "Press a button and the file downloads to your computer. Nothing is changed.", affects: "admin" },
  build(el) {
    el.innerHTML = `
      <p class="admin-section-title">Spreadsheets (CSV)</p>
      <div class="btn-row" style="margin-top:0;">
        <button class="btn btn-secondary" data-exp="orders">Orders</button>
        <button class="btn btn-secondary" data-exp="messages">Contact messages</button>
        <button class="btn btn-secondary" data-exp="notifications">Notifications</button>
        <button class="btn btn-secondary" data-exp="products">Products</button>
        <button class="btn btn-secondary" data-exp="accessories">Accessories</button>
        <button class="btn btn-secondary" data-exp="solar">Solar panels</button>
        <button class="btn btn-secondary" data-exp="bundles">Power kits</button>
      </div>
      <p class="admin-section-title">Full backup (JSON)</p>
      <p class="admin-hint">Everything in one file: products, accessories, solar panels, kits, site settings, blog posts, orders and messages. Keep it somewhere safe.</p>
      <div class="btn-row"><button class="btn btn-primary" data-exp="backup">Download full backup</button></div>
      <p id="ex-status" class="admin-status"></p>`;
    el.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-exp]");
      if (!b) return;
      const what = b.dataset.exp, status = $("ex-status");
      setStatus(status, "Preparing...");
      try {
        if (what === "backup") {
          const get = async (p) => { try { return await apiRequest("GET", p); } catch { return null; } };
          const [prods, acc, sol, kits, orders, msgs, blog, settings] = await Promise.all([
            get("products"), get("accessories"), get("solar"), get("bundles"), get("orders?limit=2000"), get("messages?limit=2000"), get("blog?all=1"), fetchLatestSettings()
          ]);
          downloadFile(`voltreserve-backup-${todayStamp()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), products: prods, accessories: acc, solarPanels: sol, kits, orders, messages: msgs, blogPosts: blog, settings }, null, 2), "application/json");
        } else if (CATALOG[what]) {
          await CATALOG[what].reload();
          exportCatalogCsv(what);
        } else if (what === "orders") {
          await loadOrders(); ensurePanel("orders"); $("or-export").click();
        } else if (what === "messages") {
          await loadMessages(); ensurePanel("messages"); $("ms-export").click();
        } else if (what === "notifications") {
          ensurePanel("notifications"); await loadNotifications(); $("nt-export").click();
        }
        setStatus(status, "Downloaded.", "success");
      } catch (err) {
        setStatus(status, err.message, "error");
      }
    });
  }
});

/* ============================================
   START
   ============================================ */
let adminExtraStarted = false;
function initAdminExtra() {
  if (adminExtraStarted) return;
  adminExtraStarted = true;
  wireNav();
  injectCatalogToolbars();
  wireReorderDrag();
  const wanted = location.hash.replace("#", "");
  showTab(PANELS[wanted] ? wanted : "notifications", true);
  startNotificationPolling();
  // Settings drive the low-stock label; load them once so the tables can use the threshold.
  fetchLatestSettings().then((s) => { if (typeof currentSettings === "object") currentSettings = { ...s, ...currentSettings }; });
}

if (typeof adminKey === "function" && adminKey()) initAdminExtra();
