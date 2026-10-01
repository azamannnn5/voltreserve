/* ============================================
   ADMIN SITE PANELS
   Loaded by admin.html after js/admin-extra.js. Uses its helpers
   (registerPanel, saveSettingsPatch, fetchLatestSettings, setStatus,
   adminToast, $) and admin.html's apiRequest / escapeHtml.

   Panels: Promo Codes, Shipping, Announcement Bar, Homepage & Pages, FAQ,
   Blog, Footer Links, Page SEO, Redirects, Tracking & Tags, Logo & Colors,
   Currency & Stock, Maintenance Mode.

   Every panel saves into the same settings object the site already reads,
   and only the keys it owns, so panels never overwrite each other.
   ============================================ */

const SP = {
  settings: {},
  async load() { SP.settings = await fetchLatestSettings(); return SP.settings; }
};

const val = (id) => { const el = $(id); return el ? el.value.trim() : ""; };

/* ---------- generic "rows of fields" editor ---------- */
// fields: [{ key, label, type: text|number|date|select|checkbox|textarea, options, placeholder }]
function rowsEditorHTML(id, fields, rows, addLabel) {
  return `<div id="${id}-rows"></div>
    <div class="btn-row"><button type="button" class="btn btn-secondary" data-add="${id}">${escapeHtml(addLabel || "+ Add row")}</button></div>`;
}

function rowHTML(fields, row) {
  const cells = fields.map((f) => {
    const v = row[f.key];
    let input;
    if (f.type === "select") {
      input = `<select data-k="${f.key}">${f.options.map((o) => `<option value="${escapeHtml(o[0])}"${String(v) === String(o[0]) ? " selected" : ""}>${escapeHtml(o[1])}</option>`).join("")}</select>`;
    } else if (f.type === "checkbox") {
      input = `<select data-k="${f.key}" data-bool="1"><option value="1"${v !== false ? " selected" : ""}>${escapeHtml(f.onLabel || "Yes")}</option><option value="0"${v === false ? " selected" : ""}>${escapeHtml(f.offLabel || "No")}</option></select>`;
    } else if (f.type === "textarea") {
      input = `<textarea data-k="${f.key}" rows="2" placeholder="${escapeHtml(f.placeholder || "")}">${escapeHtml(v == null ? "" : v)}</textarea>`;
    } else {
      input = `<input type="${f.type || "text"}" data-k="${f.key}" value="${escapeHtml(v == null ? "" : v)}" placeholder="${escapeHtml(f.placeholder || "")}"${f.step ? ` step="${f.step}"` : ""}>`;
    }
    return `<div class="field"><label>${escapeHtml(f.label)}</label>${input}</div>`;
  }).join("");
  return `<div class="rowform">${cells}<button type="button" class="btn btn-secondary btn-sm row-remove" data-remove="1" title="Remove this row">Remove</button></div>`;
}

function mountRows(id, fields, rows, onChange) {
  const box = $(id + "-rows");
  box.innerHTML = rows.length ? rows.map((r) => rowHTML(fields, r)).join("") : `<div class="empty-state">Nothing here yet. Press the button below to add one.</div>`;
  const panel = box.closest(".panel-body") || document;
  if (!panel.dataset.rowsWired) {
    panel.dataset.rowsWired = "1";
    panel.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) {
        const cur = collectRows(add.dataset.add, panel.__fields[add.dataset.add]);
        cur.push({});
        mountRows(add.dataset.add, panel.__fields[add.dataset.add], cur, panel.__onChange && panel.__onChange[add.dataset.add]);
        return;
      }
      const rm = e.target.closest("[data-remove]");
      if (rm) {
        const rowsBox = rm.closest("[id$='-rows']");
        const rid = rowsBox.id.replace(/-rows$/, "");
        rm.closest(".rowform").remove();
        const cur = collectRows(rid, panel.__fields[rid]);
        mountRows(rid, panel.__fields[rid], cur, panel.__onChange && panel.__onChange[rid]);
      }
    });
    panel.addEventListener("input", (e) => {
      const rowsBox = e.target.closest("[id$='-rows']");
      if (!rowsBox) return;
      const rid = rowsBox.id.replace(/-rows$/, "");
      if (panel.__onChange && panel.__onChange[rid]) panel.__onChange[rid](rowsBox);
    });
  }
  panel.__fields = panel.__fields || {};
  panel.__fields[id] = fields;
  panel.__onChange = panel.__onChange || {};
  if (onChange) { panel.__onChange[id] = onChange; onChange(box); }
}

function collectRows(id, fields) {
  const box = $(id + "-rows");
  if (!box) return [];
  return Array.from(box.querySelectorAll(".rowform")).map((rf) => {
    const row = {};
    fields.forEach((f) => {
      const el = rf.querySelector(`[data-k="${f.key}"]`);
      if (!el) return;
      if (el.dataset.bool) row[f.key] = el.value === "1";
      else if (f.type === "number") row[f.key] = el.value.trim() === "" ? "" : Number(el.value);
      else row[f.key] = el.value.trim();
    });
    return row;
  });
}

async function saveKeys(patch, statusEl, okText) {
  setStatus(statusEl, "Saving...");
  try {
    await saveSettingsPatch(patch);
    SP.settings = { ...SP.settings, ...patch };
    setStatus(statusEl, (okText || "Saved.") + " Visitors see it within about a minute.", "success");
    adminToast(okText || "Saved");
    return true;
  } catch (err) {
    setStatus(statusEl, "Could not save: " + err.message, "error");
    return false;
  }
}

const isUrlish = (u) => /^(https?:\/\/|\/|mailto:|tel:|#|[a-z0-9_-]+\.html)/i.test(u);

/* ============================================
   PROMO CODES
   ============================================ */
const CODE_FIELDS = [
  { key: "code", label: "Code", placeholder: "SAVE10" },
  { key: "percent", label: "Percent off", type: "number", placeholder: "10" },
  { key: "minOrder", label: "Minimum order ($)", type: "number", placeholder: "0" },
  { key: "startsOn", label: "Starts on", type: "date" },
  { key: "expiresOn", label: "Ends on", type: "date" },
  { key: "maxUses", label: "Max uses (0 = no limit)", type: "number", placeholder: "0" },
  { key: "active", label: "Status", type: "checkbox", onLabel: "On", offLabel: "Off" }
];

registerPanel("codes", {
  guide: { what: "Extra discount codes besides your main promo code. Each can have an end date, a minimum order, and a limit on total uses.", how: "Press 'Add code', fill the row, press Save. Set Status to Off to pause a code without deleting it.", affects: "site" },
  build(el) {
    el.innerHTML = `${rowsEditorHTML("cd", CODE_FIELDS, [], "+ Add code")}
      <p class="admin-hint">Codes are not case sensitive. The percent is taken off the order subtotal. 'Times used' counts orders that used the code.</p>
      <div class="btn-row"><button class="btn btn-primary" id="cd-save">Save codes</button></div>
      <p id="cd-status" class="admin-status"></p>`;
    $("cd-save").addEventListener("click", async () => {
      const rows = collectRows("cd", CODE_FIELDS).filter((r) => r.code);
      const seen = new Set();
      const main = String((SP.settings.code || (typeof PROMO_CONFIG !== "undefined" && PROMO_CONFIG.code) || "")).toUpperCase();
      for (const r of rows) {
        r.code = r.code.toUpperCase().replace(/\s+/g, "");
        if (!(r.percent > 0 && r.percent <= 90)) return setStatus($("cd-status"), `Code ${r.code}: percent must be between 1 and 90.`, "error");
        if (seen.has(r.code) || r.code === main) return setStatus($("cd-status"), `Code ${r.code} is used twice (or matches your main code).`, "error");
        if (r.startsOn && r.expiresOn && r.startsOn > r.expiresOn) return setStatus($("cd-status"), `Code ${r.code}: the end date is before the start date.`, "error");
        seen.add(r.code);
      }
      if (await saveKeys({ extraPromoCodes: rows }, $("cd-status"), "Codes saved.")) mountRows("cd", CODE_FIELDS, rows);
    });
  },
  async onShow() {
    await SP.load();
    const usage = SP.settings._promoUsage || {};
    const rows = Array.isArray(SP.settings.extraPromoCodes) ? SP.settings.extraPromoCodes : [];
    mountRows("cd", CODE_FIELDS, rows, (box) => {
      box.querySelectorAll(".rowform").forEach((rf) => {
        let note = rf.querySelector(".usage-note");
        const code = (rf.querySelector('[data-k="code"]').value || "").toUpperCase();
        if (!note) { note = document.createElement("span"); note.className = "usage-note admin-hint"; rf.insertBefore(note, rf.querySelector(".row-remove")); }
        const max = Number((rf.querySelector('[data-k="maxUses"]') || {}).value) || 0;
        note.textContent = max > 0 && code ? `Times used: ${usage[code] || 0} of ${max}` : "";
      });
    });
  }
});

/* ============================================
   SHIPPING
   ============================================ */
const SHIP_FIELDS = [
  { key: "country", label: "Country (exact name, or * for all others)", placeholder: "United States" },
  { key: "type", label: "Type", type: "select", options: [["free", "Free shipping"], ["flat", "Flat rate"], ["quote", "Confirmed after order"]] },
  { key: "cost", label: "Flat cost ($)", type: "number", placeholder: "0" },
  { key: "freeOver", label: "Free above ($, flat only)", type: "number", placeholder: "0" },
  { key: "note", label: "Text shown to shopper (optional)", placeholder: "Ships in 3-5 days" }
];

registerPanel("shipping", {
  guide: { what: "Set shipping by country: free, a flat price, or 'we confirm the cost after your order'.", how: "Add a row per country (spell it like the checkout country list). Add one row with * to cover every other country. With no rows, your original rule (free over the free-shipping amount) stays in place.", affects: "site" },
  build(el) {
    el.innerHTML = `${rowsEditorHTML("sh", SHIP_FIELDS, [], "+ Add country")}
      <div class="btn-row"><button class="btn btn-primary" id="sh-save">Save shipping</button></div>
      <p id="sh-status" class="admin-status"></p>`;
    $("sh-save").addEventListener("click", async () => {
      const rows = collectRows("sh", SHIP_FIELDS).filter((r) => r.country);
      for (const r of rows) {
        if (r.type === "flat" && !(r.cost >= 0)) return setStatus($("sh-status"), `${r.country}: enter the flat cost.`, "error");
        if (r.type !== "flat") { r.cost = 0; r.freeOver = 0; }
      }
      if (await saveKeys({ shippingRates: rows }, $("sh-status"), "Shipping saved.")) mountRows("sh", SHIP_FIELDS, rows);
    });
  },
  async onShow() {
    await SP.load();
    mountRows("sh", SHIP_FIELDS, Array.isArray(SP.settings.shippingRates) ? SP.settings.shippingRates : []);
  }
});

/* ============================================
   ANNOUNCEMENT BAR
   ============================================ */
registerPanel("announcement", {
  guide: { what: "The thin bar at the very top of every page.", how: "Leave the text empty to keep the automatic promo message. Type your own text to replace it, add a link if you want it clickable, or switch the bar off.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <div class="field-row"><div class="field"><label>Show the bar</label><select id="an-enabled"><option value="1">Yes</option><option value="0">No, hide it</option></select></div>
      <div class="field"><label>Link (optional)</label><input id="an-link" placeholder="products.html or https://..."></div></div>
      <div class="field-row full"><div class="field"><label>Custom text (empty = automatic promo message)</label><input id="an-text" maxlength="160" placeholder="Free shipping on every order this weekend"></div></div>
      <p class="admin-hint">Preview:</p>
      <div id="an-preview" style="background:var(--accent); color:var(--accent-ink,#fff); padding:8px 12px; border-radius:6px; font-size:0.85rem; text-align:center;"></div>
      <div class="btn-row"><button class="btn btn-primary" id="an-save">Save</button></div>
      <p id="an-status" class="admin-status"></p>`;
    const preview = () => {
      $("an-preview").textContent = $("an-enabled").value === "0" ? "(bar hidden)" : (val("an-text") || "Automatic promo message (code and end date from Promo Settings)");
    };
    ["an-enabled", "an-text"].forEach((id) => $(id).addEventListener("input", preview));
    $("an-save").addEventListener("click", async () => {
      const link = val("an-link");
      if (link && !isUrlish(link)) return setStatus($("an-status"), "The link should start with https:// or /, or be a page like products.html.", "error");
      await saveKeys({ announcement: { enabled: $("an-enabled").value === "1", text: val("an-text"), link } }, $("an-status"), "Announcement saved.");
    });
    el.__preview = preview;
  },
  async onShow() {
    await SP.load();
    const a = SP.settings.announcement || {};
    $("an-enabled").value = a.enabled === false ? "0" : "1";
    $("an-text").value = a.text || "";
    $("an-link").value = a.link || "";
    $("an-enabled").dispatchEvent(new Event("input"));
  }
});

/* ============================================
   HOMEPAGE & PAGES (text on index, about, shipping, privacy, terms)
   ============================================ */
const PAGES = { index: "Homepage", about: "About", shipping: "Shipping", privacy: "Privacy Policy", terms: "Terms" };
const PG = { page: "index", defaults: {}, bg: {} };

async function loadPageDefaults(page) {
  const res = await fetch(`/${page}.html?cms=raw&t=${Date.now()}`);
  if (!res.ok) throw new Error("Could not load the page text");
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  const out = [];
  doc.querySelectorAll("[data-cms]").forEach((n) => {
    out.push({ key: n.getAttribute("data-cms"), tag: n.tagName.toLowerCase(), text: n.textContent.replace(/\s+/g, " ").trim() });
  });
  const bg = [];
  doc.querySelectorAll("[data-cms-bg]").forEach((n) => {
    const m = (n.getAttribute("style") || "").match(/url\((['"]?)([^)'"]+)\1\)/);
    bg.push({ key: n.getAttribute("data-cms-bg"), url: m ? m[2] : "" });
  });
  return { items: out, bg };
}

function renderPageFields() {
  const cms = SP.settings.cms || {};
  const tagName = { h1: "Main heading", h2: "Heading", h3: "Sub-heading", p: "Paragraph", li: "List item" };
  const bgHtml = PG.bg.map((b) => `
    <div class="field" style="margin-bottom:12px;"><label>Hero photo (image address)</label>
      <input data-cms-field="${escapeHtml(b.key)}" data-default="${escapeHtml(b.url)}" value="${escapeHtml(cms[b.key] || b.url)}">
      <span class="admin-hint">Upload the picture into the site's images folder, or paste a full https:// address.</span></div>`).join("");
  const itemsHtml = PG.items.map((it) => {
    const cur = typeof cms[it.key] === "string" && cms[it.key] ? cms[it.key] : it.text;
    const long = it.text.length > 90 || it.tag === "p";
    return `<div class="field" style="margin-bottom:12px;"><label>${tagName[it.tag] || "Text"}${cur !== it.text ? " (edited)" : ""}</label>
      ${long ? `<textarea data-cms-field="${escapeHtml(it.key)}" data-default="${escapeHtml(it.text)}" rows="${Math.min(6, Math.ceil(it.text.length / 90))}">${escapeHtml(cur)}</textarea>`
             : `<input data-cms-field="${escapeHtml(it.key)}" data-default="${escapeHtml(it.text)}" value="${escapeHtml(cur)}">`}</div>`;
  }).join("");
  $("pg-fields").innerHTML = (bgHtml + itemsHtml) || `<div class="empty-state">No editable text was found on this page.</div>`;
}

registerPanel("pages", {
  guide: { what: "Change the words (and the homepage hero photo) on the Homepage, About, Shipping, Privacy and Terms pages.", how: "Pick a page, edit any box, press Save. Only boxes you actually change are stored. 'Reset page' puts the original text back. Plain text only.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <div class="field" style="max-width:260px;"><label>Page</label><select id="pg-page">${Object.entries(PAGES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <div id="pg-fields" style="margin-top:16px;"></div>
      <div class="btn-row"><button class="btn btn-primary" id="pg-save">Save this page</button><button class="btn btn-secondary" id="pg-reset">Reset page to original text</button></div>
      <p id="pg-status" class="admin-status"></p>`;
    $("pg-page").addEventListener("change", (e) => { PG.page = e.target.value; showPage(); });
    $("pg-save").addEventListener("click", async () => {
      const cms = { ...(SP.settings.cms || {}) };
      Object.keys(cms).forEach((k) => { if (k.startsWith(PG.page + ".")) delete cms[k]; });
      $("pg-fields").querySelectorAll("[data-cms-field]").forEach((f) => {
        const v = f.value.trim();
        if (v && v !== f.dataset.default) cms[f.dataset.cmsField] = v;
      });
      await saveKeys({ cms }, $("pg-status"), "Page saved.");
      renderPageFields();
    });
    $("pg-reset").addEventListener("click", async () => {
      if (!confirm("Put the original text back on this page?")) return;
      const cms = { ...(SP.settings.cms || {}) };
      Object.keys(cms).forEach((k) => { if (k.startsWith(PG.page + ".")) delete cms[k]; });
      await saveKeys({ cms }, $("pg-status"), "Page reset.");
      renderPageFields();
    });
  },
  onShow() { showPage(); }
});

async function showPage() {
  setStatus($("pg-status"), "Loading the page text...");
  try {
    await SP.load();
    const d = await loadPageDefaults(PG.page);
    PG.items = d.items; PG.bg = d.bg;
    renderPageFields();
    setStatus($("pg-status"), "");
  } catch (err) {
    setStatus($("pg-status"), err.message, "error");
  }
}

/* ============================================
   FAQ
   ============================================ */
const FQ = { items: [] };
const FAQ_FIELDS = [
  { key: "q", label: "Question" },
  { key: "a", label: "Answer (blank line = new paragraph)", type: "textarea" }
];

function renderFaq() {
  $("fq-list").innerHTML = FQ.items.map((it, i) => `
    <div class="rowform" style="grid-template-columns:1fr;" data-i="${i}">
      <div class="field"><label>Question ${i + 1}</label><input data-q value="${escapeHtml(it.q)}"></div>
      <div class="field"><label>Answer</label><textarea data-a rows="3">${escapeHtml(it.a)}</textarea></div>
      <div class="btn-row" style="margin:0;">
        <button type="button" class="btn btn-secondary btn-sm" data-act="up"${i === 0 ? " disabled" : ""}>Move up</button>
        <button type="button" class="btn btn-secondary btn-sm" data-act="down"${i === FQ.items.length - 1 ? " disabled" : ""}>Move down</button>
        <button type="button" class="btn btn-secondary btn-sm" data-act="del">Remove</button>
      </div>
    </div>`).join("") || `<div class="empty-state">No questions. Add one below.</div>`;
}

function syncFaqFromDom() {
  FQ.items = Array.from($("fq-list").querySelectorAll(".rowform")).map((rf) => ({ q: rf.querySelector("[data-q]").value.trim(), a: rf.querySelector("[data-a]").value.trim() }));
}

registerPanel("faq", {
  guide: { what: "The questions and answers on the FAQ page. Google also uses them for the expandable answers in search results.", how: "Edit, add, remove or reorder, then press Save. 'Reset to original' brings back the questions that came with the site. Plain text only.", affects: "site" },
  build(el) {
    el.innerHTML = `<div id="fq-list"></div>
      <div class="btn-row"><button class="btn btn-secondary" id="fq-add">+ Add question</button><button class="btn btn-primary" id="fq-save">Save FAQ</button><button class="btn btn-secondary" id="fq-reset">Reset to original</button></div>
      <p id="fq-status" class="admin-status"></p>`;
    $("fq-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      syncFaqFromDom();
      const i = Number(b.closest(".rowform").dataset.i);
      if (b.dataset.act === "del") FQ.items.splice(i, 1);
      else { const j = i + (b.dataset.act === "up" ? -1 : 1); [FQ.items[i], FQ.items[j]] = [FQ.items[j], FQ.items[i]]; }
      renderFaq();
    });
    $("fq-add").addEventListener("click", () => { syncFaqFromDom(); FQ.items.push({ q: "", a: "" }); renderFaq(); });
    $("fq-save").addEventListener("click", async () => {
      syncFaqFromDom();
      const items = FQ.items.filter((x) => x.q && x.a);
      if (!items.length) return setStatus($("fq-status"), "Add at least one question with an answer (or use Reset to original).", "error");
      await saveKeys({ faqItems: items }, $("fq-status"), "FAQ saved.");
    });
    $("fq-reset").addEventListener("click", async () => {
      if (!confirm("Go back to the original FAQ that came with the site?")) return;
      await saveKeys({ faqItems: [] }, $("fq-status"), "FAQ reset.");
      FQ.items = await defaultFaq(); renderFaq();
    });
  },
  async onShow() {
    await SP.load();
    FQ.items = Array.isArray(SP.settings.faqItems) && SP.settings.faqItems.length ? SP.settings.faqItems.map((x) => ({ q: x.q, a: x.a })) : await defaultFaq();
    renderFaq();
  }
});

async function defaultFaq() {
  try {
    const res = await fetch("/faq.html?cms=raw&t=" + Date.now());
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    return Array.from(doc.querySelectorAll("details.faq-item")).map((d) => ({
      q: (d.querySelector("summary") || {}).textContent.trim(),
      a: Array.from(d.querySelectorAll("p")).map((p) => p.textContent.replace(/\s+/g, " ").trim()).join("\n\n")
    }));
  } catch { return []; }
}

/* ============================================
   BLOG
   ============================================ */
const BL = { posts: [], editing: null };

function slugify(t) { return String(t || "").toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80); }

function renderBlogList() {
  $("bl-list").innerHTML = BL.posts.length ? `<table class="admin-table"><thead><tr><th>Title</th><th>Status</th><th>Address</th><th></th></tr></thead><tbody>${BL.posts.map((p) => `
    <tr><td>${escapeHtml(p.title)}</td><td>${p.published ? pill("Published", "ok") : pill("Draft", "muted")}</td><td class="admin-hint">/blog/${escapeHtml(p.slug)}</td>
    <td><button class="btn btn-secondary btn-sm" data-edit="${escapeHtml(p.slug)}">Edit</button>${p.published ? ` <a class="btn btn-secondary btn-sm" href="/blog/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">View</a>` : ""}</td></tr>`).join("")}</tbody></table>`
    : `<div class="empty-state">No posts yet. Press 'New post' to write your first one.</div>`;
}

function openBlogForm(post) {
  BL.editing = post ? post.slug : null;
  const p = post || { title: "", slug: "", category: "", excerpt: "", description: "", coverImage: "", body: "", published: false };
  $("bl-form").style.display = "block";
  $("bl-form").innerHTML = `
    <p class="admin-section-title">${post ? "Edit post" : "New post"}</p>
    <div class="field-row"><div class="field"><label>Title</label><input id="bl-title" value="${escapeHtml(p.title)}"></div>
    <div class="field"><label>Web address (letters, numbers, dashes)</label><input id="bl-slug" value="${escapeHtml(p.slug)}" ${post ? "readonly" : ""} placeholder="made-from-the-title"></div></div>
    <div class="field-row"><div class="field"><label>Category label (optional)</label><input id="bl-cat" value="${escapeHtml(p.category)}" placeholder="Buying guide"></div>
    <div class="field"><label>Cover image address (optional)</label><input id="bl-cover" value="${escapeHtml(p.coverImage)}" placeholder="images/lifestyle/..."></div></div>
    <div class="field-row full"><div class="field"><label>Short summary shown on the Guides page</label><input id="bl-excerpt" maxlength="200" value="${escapeHtml(p.excerpt)}"></div></div>
    <div class="field-row full"><div class="field"><label>Search result description (about 150 characters) <span id="bl-dcount" class="admin-hint"></span></label><textarea id="bl-desc" rows="2">${escapeHtml(p.description)}</textarea></div></div>
    <div class="field-row full"><div class="field"><label>Article</label>
      <div class="btn-row" style="margin:0 0 6px;"><button type="button" class="btn btn-secondary btn-sm" data-ins="h2">Heading</button><button type="button" class="btn btn-secondary btn-sm" data-ins="b">Bold</button><button type="button" class="btn btn-secondary btn-sm" data-ins="a">Link</button><button type="button" class="btn btn-secondary btn-sm" data-ins="ul">Bullet list</button><button type="button" class="btn btn-secondary btn-sm" data-ins="p">Paragraph</button></div>
      <textarea id="bl-body" rows="16" style="font-family:var(--font-mono,monospace); font-size:0.85rem;">${escapeHtml(p.body)}</textarea>
      <span class="admin-hint">Write in simple HTML. Use the buttons above to add headings, bold, links and lists. Scripts and forms are removed automatically.</span></div></div>
    <div class="field" style="max-width:260px;"><label>Visibility</label><select id="bl-pub"><option value="0"${p.published ? "" : " selected"}>Draft (not visible)</option><option value="1"${p.published ? " selected" : ""}>Published (live)</option></select></div>
    <div class="btn-row"><button class="btn btn-primary" id="bl-save">Save post</button><button class="btn btn-secondary" id="bl-cancel">Close</button>${post ? `<button class="btn btn-secondary" id="bl-del">Delete</button>` : ""}</div>
    <p id="bl-status" class="admin-status"></p>`;
  const count = () => { $("bl-dcount").textContent = `(${val("bl-desc").length}/160)`; };
  $("bl-desc").addEventListener("input", count); count();
  if (!post) $("bl-title").addEventListener("input", () => { $("bl-slug").value = slugify($("bl-title").value); });
  $("bl-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

const INSERTS = {
  h2: (s) => `<h2 style="margin-top:32px;">${s || "Heading"}</h2>`,
  b: (s) => `<strong>${s || "bold text"}</strong>`,
  a: (s) => `<a href="https://" style="color:var(--accent); text-decoration:underline;">${s || "link text"}</a>`,
  ul: (s) => `<ul style="margin:16px 0; padding-left:20px; line-height:1.9;">\n  <li>${s || "First point"}</li>\n  <li>Second point</li>\n</ul>`,
  p: (s) => `<p>${s || "Paragraph text"}</p>`
};

async function reloadBlog() {
  try {
    const data = await apiRequest("GET", "blog?all=1");
    BL.posts = Array.isArray(data) ? data : [];
    if (data && data.hint) setStatus($("bl-status-top"), data.hint, "error");
  } catch (err) { BL.posts = []; setStatus($("bl-status-top"), err.message, "error"); }
  renderBlogList();
}

registerPanel("blog", {
  guide: { what: "Write articles that appear on the Guides page and at their own address (/blog/your-title). Your 9 original guides are not affected.", how: "Press 'New post', write the article, choose Published, and Save. Keep it as a Draft until it is ready. Needs the new SQL file to be run once.", affects: "site" },
  build(el) {
    el.innerHTML = `<div class="btn-row" style="margin-top:0;"><button class="btn btn-primary" id="bl-new">+ New post</button><button class="btn btn-secondary" id="bl-refresh">Refresh</button></div>
      <p id="bl-status-top" class="admin-status"></p><div id="bl-list"></div><div id="bl-form" style="display:none; margin-top:20px;"></div>`;
    $("bl-new").addEventListener("click", () => openBlogForm(null));
    $("bl-refresh").addEventListener("click", reloadBlog);
    el.addEventListener("click", async (e) => {
      const ed = e.target.closest("[data-edit]");
      if (ed) return openBlogForm(BL.posts.find((p) => p.slug === ed.dataset.edit));
      const ins = e.target.closest("[data-ins]");
      if (ins) {
        const ta = $("bl-body"), s = ta.value.slice(ta.selectionStart, ta.selectionEnd);
        const text = INSERTS[ins.dataset.ins](s);
        ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end"); ta.focus();
        return;
      }
      if (e.target.id === "bl-cancel") { $("bl-form").style.display = "none"; return; }
      if (e.target.id === "bl-save") {
        const st = $("bl-status");
        if (!val("bl-title")) return setStatus(st, "Add a title first.", "error");
        setStatus(st, "Saving...");
        try {
          const saved = await apiRequest("POST", "blog", {
            title: val("bl-title"), slug: val("bl-slug") || undefined, category: val("bl-cat"), coverImage: val("bl-cover"),
            excerpt: val("bl-excerpt"), description: val("bl-desc"), body: $("bl-body").value, published: $("bl-pub").value === "1"
          });
          BL.editing = saved.slug; $("bl-slug").value = saved.slug; $("bl-slug").readOnly = true;
          setStatus(st, saved.published ? "Saved and live at /blog/" + saved.slug : "Saved as a draft.", "success");
          adminToast("Post saved");
          await reloadBlog();
        } catch (err) { setStatus(st, "Could not save: " + err.message, "error"); }
        return;
      }
      if (e.target.id === "bl-del") {
        if (!confirm("Delete this post for good? (A copy stays in the Change Log.)")) return;
        try { await apiRequest("DELETE", "blog?slug=" + encodeURIComponent(BL.editing)); $("bl-form").style.display = "none"; adminToast("Post deleted"); await reloadBlog(); }
        catch (err) { setStatus($("bl-status"), err.message, "error"); }
      }
    });
  },
  onShow() { reloadBlog(); }
});

/* ============================================
   FOOTER LINKS
   ============================================ */
const FOOT_FIELDS = [
  { key: "section", label: "Column", type: "select", options: [["shop", "Shop"], ["company", "Company"], ["policies", "Policies"]] },
  { key: "label", label: "Link text", placeholder: "Warranty info" },
  { key: "url", label: "Address", placeholder: "faq.html or https://..." }
];

registerPanel("footer", {
  guide: { what: "Add extra links to the footer at the bottom of every page. Your existing links stay.", how: "Choose a column, type the link text and address, press Save. Remove a row to take the link away.", affects: "site" },
  build(el) {
    el.innerHTML = `${rowsEditorHTML("ft", FOOT_FIELDS, [], "+ Add link")}
      <div class="btn-row"><button class="btn btn-primary" id="ft-save">Save links</button></div><p id="ft-status" class="admin-status"></p>`;
    $("ft-save").addEventListener("click", async () => {
      const rows = collectRows("ft", FOOT_FIELDS).filter((r) => r.label || r.url);
      for (const r of rows) {
        if (!r.label || !r.url) return setStatus($("ft-status"), "Each link needs both text and an address.", "error");
        if (!isUrlish(r.url)) return setStatus($("ft-status"), `"${r.url}" should start with https:// or /, or be a page like faq.html.`, "error");
      }
      if (await saveKeys({ footerLinks: rows }, $("ft-status"), "Footer links saved.")) mountRows("ft", FOOT_FIELDS, rows);
    });
  },
  async onShow() { await SP.load(); mountRows("ft", FOOT_FIELDS, Array.isArray(SP.settings.footerLinks) ? SP.settings.footerLinks : []); }
});

/* ============================================
   PAGE SEO
   ============================================ */
const SEO_FIELDS = [
  { key: "path", label: "Page address", placeholder: "/faq.html" },
  { key: "title", label: "Search title (about 60 characters)", placeholder: "Leave empty to keep the current title" },
  { key: "description", label: "Search description (about 155 characters)", type: "textarea", placeholder: "Leave empty to keep the current description" },
  { key: "noindex", label: "Show in Google?", type: "checkbox", onLabel: "Yes (normal)", offLabel: "No, hide this page" }
];

function seoRowsFromSettings(map) {
  return Object.keys(map || {}).map((path) => ({ path, title: map[path].title || "", description: map[path].description || "", noindex: !map[path].noindex }));
}

function seoDecorate(box) {
  box.querySelectorAll(".rowform").forEach((rf) => {
    let note = rf.querySelector(".seo-preview");
    if (!note) { note = document.createElement("div"); note.className = "seo-preview"; note.style.cssText = "grid-column:1/-1; font-size:0.8rem;"; rf.insertBefore(note, rf.querySelector(".row-remove")); }
    const t = rf.querySelector('[data-k="title"]').value, d = rf.querySelector('[data-k="description"]').value, p = rf.querySelector('[data-k="path"]').value;
    const tc = t.length > 60 ? "var(--warn)" : "var(--text-faint)", dc = d.length > 160 ? "var(--warn)" : "var(--text-faint)";
    note.innerHTML = `<div style="border:1px solid var(--border); background:#fff; border-radius:6px; padding:8px 10px;"><div style="color:#1a0dab; font-size:1rem;">${escapeHtml(t || "(current title)")}</div><div style="color:#006621; font-size:0.78rem;">voltreservepower.com${escapeHtml(p)}</div><div style="color:#545454;">${escapeHtml(d || "(current description)")}</div></div><span style="color:${tc}">Title ${t.length}/60</span> &nbsp; <span style="color:${dc}">Description ${d.length}/160</span>`;
  });
}

registerPanel("seo", {
  guide: { what: "Change the title and description Google shows for a page, or tell Google to ignore a page.", how: "Add a row, type the page address (for example /faq.html or /products/river-3), and fill what you want to change. Empty boxes are left alone. Google can take days or weeks to show changes.", affects: "site" },
  build(el) {
    el.innerHTML = `${rowsEditorHTML("sg", SEO_FIELDS, [], "+ Add page")}
      <div class="btn-row"><button class="btn btn-primary" id="sg-save">Save page SEO</button></div><p id="sg-status" class="admin-status"></p>`;
    $("sg-save").addEventListener("click", async () => {
      const rows = collectRows("sg", SEO_FIELDS).filter((r) => r.path);
      const map = {};
      for (const r of rows) {
        if (!r.path.startsWith("/")) return setStatus($("sg-status"), `"${r.path}" should start with / (for example /faq.html).`, "error");
        const entry = {};
        if (r.title) entry.title = r.title;
        if (r.description) entry.description = r.description;
        if (r.noindex === false) entry.noindex = true;
        if (Object.keys(entry).length) map[r.path] = entry;
      }
      if (await saveKeys({ seoOverrides: map }, $("sg-status"), "Page SEO saved.")) mountRows("sg", SEO_FIELDS, seoRowsFromSettings(map), seoDecorate);
    });
  },
  async onShow() { await SP.load(); mountRows("sg", SEO_FIELDS, seoRowsFromSettings(SP.settings.seoOverrides), seoDecorate); }
});

/* ============================================
   REDIRECTS
   ============================================ */
const RED_FIELDS = [
  { key: "from", label: "Old address", placeholder: "/old-page.html" },
  { key: "to", label: "Send visitors to", placeholder: "/new-page.html" },
  { key: "type", label: "Type", type: "select", options: [["301", "Permanent (301)"], ["302", "Temporary (302)"]] }
];

registerPanel("redirects", {
  guide: { what: "Send visitors (and Google) from an old address to a new one, so renamed or removed pages never show an error.", how: "Add a row: the old address starting with /, and where it should go. Use Permanent for pages that moved for good.", affects: "site" },
  build(el) {
    el.innerHTML = `${rowsEditorHTML("rd", RED_FIELDS, [], "+ Add redirect")}
      <div class="btn-row"><button class="btn btn-primary" id="rd-save">Save redirects</button></div><p id="rd-status" class="admin-status"></p>`;
    $("rd-save").addEventListener("click", async () => {
      const rows = collectRows("rd", RED_FIELDS).filter((r) => r.from || r.to);
      const seen = new Set();
      for (const r of rows) {
        if (!r.from.startsWith("/")) return setStatus($("rd-status"), `Old address "${r.from}" should start with /.`, "error");
        if (!/^(https?:\/\/|\/)/i.test(r.to)) return setStatus($("rd-status"), `Destination "${r.to}" should start with / or https://.`, "error");
        if (seen.has(r.from.toLowerCase())) return setStatus($("rd-status"), `"${r.from}" is listed twice.`, "error");
        if (r.from === "/" || /^\/admin/i.test(r.from)) return setStatus($("rd-status"), "The homepage and admin page cannot be redirected.", "error");
        seen.add(r.from.toLowerCase());
        r.type = Number(r.type) === 302 ? 302 : 301;
      }
      if (await saveKeys({ redirects: rows }, $("rd-status"), "Redirects saved.")) mountRows("rd", RED_FIELDS, rows);
    });
  },
  async onShow() {
    await SP.load();
    mountRows("rd", RED_FIELDS, (Array.isArray(SP.settings.redirects) ? SP.settings.redirects : []).map((r) => ({ ...r, type: String(r.type || 301) })));
  }
});

/* ============================================
   TRACKING & TAGS
   ============================================ */
registerPanel("tracking", {
  guide: { what: "Change your Google Analytics ID, or paste extra tracking code (Search Console verification, Meta Pixel, and similar) into every page.", how: "Paste the code exactly as the service gives it to you. Leave a box empty to keep things as they are.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <div class="field-row full"><div class="field"><label>Google Analytics ID (starts with G-)</label><input id="tk-ga" placeholder="G-XXXXXXXXXX"><span class="admin-hint">Replaces the ID the site uses now. Empty keeps the current one.</span></div></div>
      <div class="field-row full"><div class="field"><label>Extra code for every page (added at the end of the head)</label><textarea id="tk-head" rows="6" style="font-family:var(--font-mono,monospace); font-size:0.82rem;" placeholder="<meta name=&quot;google-site-verification&quot; content=&quot;...&quot;>"></textarea>
      <span class="admin-hint">Only paste code from a service you trust. It runs on every page of your store.</span></div></div>
      <div class="btn-row"><button class="btn btn-primary" id="tk-save">Save</button></div><p id="tk-status" class="admin-status"></p>`;
    $("tk-save").addEventListener("click", async () => {
      const ga = val("tk-ga");
      if (ga && !/^G-[A-Z0-9]{6,}$/.test(ga)) return setStatus($("tk-status"), "That doesn't look like a Google Analytics ID. It starts with G- followed by letters and numbers.", "error");
      await saveKeys({ gaId: ga, headTags: $("tk-head").value.trim() }, $("tk-status"), "Tracking saved.");
    });
  },
  async onShow() { await SP.load(); $("tk-ga").value = SP.settings.gaId || ""; $("tk-head").value = SP.settings.headTags || ""; }
});

/* ============================================
   LOGO & COLORS
   ============================================ */
registerPanel("branding", {
  guide: { what: "Change the main green used for buttons and highlights, and the little icon shown in browser tabs.", how: "Pick colors, check the preview, press Save. 'Reset' returns the original look.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <div class="field-row"><div class="field"><label>Main color</label><input type="color" id="br-accent" value="#1e7800" style="height:40px;"></div>
      <div class="field"><label>Darker shade (hover)</label><input type="color" id="br-dim" value="#155c00" style="height:40px;"></div></div>
      <div class="field-row"><div class="field"><label>Text on buttons</label><input type="color" id="br-ink" value="#ffffff" style="height:40px;"></div>
      <div class="field"><label>Browser tab icon address (optional)</label><input id="br-fav" placeholder="favicon.svg or https://..."></div></div>
      <p class="admin-hint">Preview:</p>
      <div id="br-preview" style="display:flex; gap:10px; align-items:center;"><span id="br-btn" style="padding:10px 18px; border-radius:8px; font-weight:600;">Shop Power Stations</span><span id="br-link" style="font-weight:600;">A highlighted link</span></div>
      <div class="btn-row"><button class="btn btn-primary" id="br-save">Save</button><button class="btn btn-secondary" id="br-reset">Reset to original</button></div><p id="br-status" class="admin-status"></p>`;
    const paint = () => { $("br-btn").style.cssText += `;background:${val("br-accent")};color:${val("br-ink")}`; $("br-link").style.color = val("br-accent"); };
    ["br-accent", "br-dim", "br-ink"].forEach((id) => $(id).addEventListener("input", paint)); paint();
    $("br-save").addEventListener("click", async () => {
      const fav = val("br-fav");
      if (fav && !/^(https?:\/\/|\/|[A-Za-z0-9_\-./]+)$/.test(fav)) return setStatus($("br-status"), "The icon address looks wrong.", "error");
      await saveKeys({ branding: { accent: val("br-accent"), accentDark: val("br-dim"), accentInk: val("br-ink"), faviconUrl: fav } }, $("br-status"), "Colors saved.");
    });
    $("br-reset").addEventListener("click", async () => {
      if (!confirm("Go back to the original colors?")) return;
      await saveKeys({ branding: null }, $("br-status"), "Colors reset.");
      $("br-accent").value = "#1e7800"; $("br-dim").value = "#155c00"; $("br-ink").value = "#ffffff"; $("br-fav").value = ""; paint();
    });
  },
  async onShow() {
    await SP.load();
    const b = SP.settings.branding || {};
    if (b.accent) $("br-accent").value = b.accent;
    if (b.accentDark) $("br-dim").value = b.accentDark;
    if (b.accentInk) $("br-ink").value = b.accentInk;
    $("br-fav").value = b.faviconUrl || "";
    $("br-accent").dispatchEvent(new Event("input"));
  }
});

/* ============================================
   CURRENCY & STOCK
   ============================================ */
const CURRENCIES = [["USD", "US dollar"], ["EUR", "Euro"], ["GBP", "British pound"], ["CAD", "Canadian dollar"], ["AUD", "Australian dollar"], ["XAF", "Central African franc"], ["NGN", "Nigerian naira"], ["ZAR", "South African rand"], ["INR", "Indian rupee"], ["JPY", "Japanese yen"]];

registerPanel("store", {
  guide: { what: "Which currencies shoppers can switch between, which one new visitors see first, and when an item shows 'Only a few left'.", how: "Tick the currencies to offer (US dollar is always on), choose the starting one, set the low-stock number, press Save.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <p class="admin-section-title">Currencies</p>
      <div id="st-cur" style="display:flex; flex-wrap:wrap; gap:10px 18px;">${CURRENCIES.map(([c, n]) => `<label style="display:flex; gap:6px; align-items:center; font-size:0.9rem;"><input type="checkbox" data-cur="${c}" ${c === "USD" ? "checked disabled" : ""}> ${c} <span class="admin-hint">${n}</span></label>`).join("")}</div>
      <div class="field" style="max-width:260px; margin-top:14px;"><label>Currency new visitors see first</label><select id="st-default">${CURRENCIES.map(([c]) => `<option>${c}</option>`).join("")}</select></div>
      <p class="admin-section-title">Stock</p>
      <div class="field" style="max-width:260px;"><label>Show 'Only a few left' at or below</label><input type="number" id="st-low" min="1" max="50" value="3"><span class="admin-hint">Applies to items where you typed a stock quantity.</span></div>
      <div class="btn-row"><button class="btn btn-primary" id="st-save">Save</button></div><p id="st-status" class="admin-status"></p>`;
    $("st-save").addEventListener("click", async () => {
      const enabled = Array.from(document.querySelectorAll("[data-cur]")).filter((c) => c.checked || c.dataset.cur === "USD").map((c) => c.dataset.cur);
      const def = $("st-default").value;
      if (!enabled.includes(def)) return setStatus($("st-status"), "The starting currency must be one of the ticked currencies.", "error");
      const low = Number(val("st-low"));
      if (!(low >= 1)) return setStatus($("st-status"), "Enter a low-stock number of 1 or more.", "error");
      await saveKeys({ currencies: { default: def, enabled }, lowStockThreshold: low }, $("st-status"), "Saved.");
    });
  },
  async onShow() {
    await SP.load();
    const c = SP.settings.currencies || {};
    const enabled = Array.isArray(c.enabled) && c.enabled.length ? c.enabled : CURRENCIES.map((x) => x[0]);
    document.querySelectorAll("[data-cur]").forEach((cb) => { cb.checked = cb.dataset.cur === "USD" || enabled.includes(cb.dataset.cur); });
    $("st-default").value = c.default && enabled.includes(c.default) ? c.default : "USD";
    $("st-low").value = Number(SP.settings.lowStockThreshold) || 3;
  }
});

/* ============================================
   MAINTENANCE MODE
   ============================================ */
registerPanel("maintenance", {
  guide: { what: "Temporarily show a 'we'll be right back' page to every visitor while you work on the store.", how: "Fill the message, set to ON, Save. You still see the real site in this browser while you are signed in here. Set it back to OFF when done.", affects: "site" },
  build(el) {
    el.innerHTML = `
      <div class="field" style="max-width:280px;"><label>Maintenance mode</label><select id="mt-on"><option value="0">OFF (store is open)</option><option value="1">ON (visitors see the message)</option></select></div>
      <div class="field-row"><div class="field"><label>Headline</label><input id="mt-title" value="We'll be right back"></div>
      <div class="field"><label>Message</label><input id="mt-msg" value="VoltReserve is being updated. Please check back shortly."></div></div>
      <p class="admin-hint">Visitors and Google get a temporary "come back later" response, so your search ranking is not harmed by a short break. Changes take up to a minute.</p>
      <div class="btn-row"><button class="btn btn-primary" id="mt-save">Save</button></div><p id="mt-status" class="admin-status"></p>`;
    $("mt-save").addEventListener("click", async () => {
      const on = $("mt-on").value === "1";
      if (on && !confirm("Turn maintenance mode ON? Visitors will see the 'be right back' page instead of the store.")) return;
      await saveKeys({ maintenance: { enabled: on, title: val("mt-title"), message: val("mt-msg") } }, $("mt-status"), on ? "Maintenance mode is ON." : "Maintenance mode is OFF. Store is open.");
    });
  },
  async onShow() {
    await SP.load();
    const m = SP.settings.maintenance || {};
    $("mt-on").value = m.enabled ? "1" : "0";
    if (m.title) $("mt-title").value = m.title;
    if (m.message) $("mt-msg").value = m.message;
  }
});
