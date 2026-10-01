// Smoke test of the admin panel in a simulated browser: every tab opens
// without errors, shows its short guide, and the new Marketing / Content /
// SEO / Settings panels read and save the right settings keys.
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");
const { ROOT, wait } = require("./helpers");

async function run() {
  const failures = [];
  const errors = [];

  let html = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");
  html = html.replace(/<script src="(js\/[^"?]+)(\?[^"]*)?"><\/script>/g, (m, src) => `<script>${fs.readFileSync(path.join(ROOT, src), "utf8")}</script>`);
  html = html.replace(/<link[^>]+fonts\.[^>]*>/g, "");

  const store = { settings: { extraPromoCodes: [{ code: "SPRING", percent: 10, maxUses: 5, active: true }], _promoUsage: { SPRING: 2 } }, blog: [] };
  const saved = { settings: null, blog: null };
  const json = (data, status = 200) => ({ ok: status < 300, status, json: async () => data, text: async () => JSON.stringify(data) });

  const fakeFetch = async (url, opts = {}) => {
    const u = new URL(String(url), "https://voltreservepower.com");
    const method = (opts.method || "GET").toUpperCase();
    const fn = u.pathname.replace("/.netlify/functions/", "");
    if (u.pathname.endsWith(".html")) {
      const file = path.join(ROOT, u.pathname.replace(/^\//, ""));
      return fs.existsSync(file) ? { ok: true, status: 200, text: async () => fs.readFileSync(file, "utf8") } : json({}, 404);
    }
    if (fn === "settings") {
      if (method === "POST") { store.settings = JSON.parse(opts.body); saved.settings = store.settings; return json(store.settings); }
      return json(store.settings);
    }
    if (fn === "blog") {
      if (method === "POST") { const b = JSON.parse(opts.body); const slug = (b.slug || b.title).toLowerCase().replace(/\s+/g, "-"); const post = { ...b, slug }; store.blog = [post]; saved.blog = post; return json(post); }
      return json(store.blog);
    }
    if (["notifications"].includes(fn)) return json({ items: [], counts: { unread: 0, needsAttention: 0 } });
    return json([]);
  };

  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e.detail && e.detail.message || e.message)));
  const dom = new JSDOM(html, {
    url: "https://voltreservepower.com/admin.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.fetch = fakeFetch;
      w.sessionStorage.setItem("vr_admin_key", "k");
      w.confirm = () => true;
      w.HTMLElement.prototype.scrollIntoView = function () {};
      w.addEventListener("error", (e) => errors.push("window error: " + e.message));
      w.addEventListener("unhandledrejection", (e) => errors.push("unhandled: " + (e.reason && e.reason.message)));
      w.Element.prototype.scrollIntoView = function () {};
    },
  });
  const w = dom.window;
  await wait(400);

  const tabs = ["notifications", "orders", "messages", "products", "accessories", "solar", "kits", "promo", "codes", "shipping", "announcement", "pages", "faq", "blog", "footer", "seo", "redirects", "tracking", "contact", "branding", "store", "maintenance", "log", "bulk", "export"];
  if (typeof w.showTab !== "function") { failures.push("showTab is not defined (admin scripts did not load)"); w.close(); return failures.concat(errors); }

  for (const t of tabs) {
    try { w.showTab(t); } catch (e) { failures.push(`opening "${t}" threw: ${e.message}`); continue; }
    await wait(120);
    const el = w.document.getElementById("tab-" + t);
    if (!el) { failures.push(`tab-${t} panel missing`); continue; }
    if (!el.querySelector(".admin-guide")) failures.push(`"${t}" has no guide text`);
  }

  const $ = (id) => w.document.getElementById(id);
  const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const setVal = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };

  // --- Promo codes: existing code shown with usage, add + save ---
  w.showTab("codes"); await wait(150);
  if (!/Times used: 2 of 5/.test($("tab-codes").textContent)) failures.push("codes: usage note 'Times used: 2 of 5' not shown");
  click($("tab-codes").querySelector('[data-add="cd"]'));
  const rows = $("tab-codes").querySelectorAll(".rowform");
  const last = rows[rows.length - 1];
  setVal(last.querySelector('[data-k="code"]'), "fall20");
  setVal(last.querySelector('[data-k="percent"]'), "20");
  click($("cd-save")); await wait(200);
  const codes = saved.settings && saved.settings.extraPromoCodes;
  if (!codes || codes.length !== 2 || codes[1].code !== "FALL20" || codes[1].percent !== 20) failures.push("codes: save did not store FALL20 at 20%: " + JSON.stringify(codes));
  if (saved.settings && saved.settings._promoUsage) failures.push("codes: _promoUsage must never be stored back");

  // --- Shipping ---
  w.showTab("shipping"); await wait(100);
  click($("tab-shipping").querySelector('[data-add="sh"]'));
  const sr = $("tab-shipping").querySelector(".rowform");
  setVal(sr.querySelector('[data-k="country"]'), "Canada");
  sr.querySelector('[data-k="type"]').value = "flat";
  setVal(sr.querySelector('[data-k="cost"]'), "25");
  click($("sh-save")); await wait(200);
  const ship = saved.settings.shippingRates;
  if (!ship || ship[0].country !== "Canada" || ship[0].type !== "flat" || ship[0].cost !== 25) failures.push("shipping: not saved correctly " + JSON.stringify(ship));
  if (!saved.settings.extraPromoCodes) failures.push("shipping: saving shipping wiped the promo codes (panels must merge)");

  // --- Redirects validation + save ---
  w.showTab("redirects"); await wait(100);
  click($("tab-redirects").querySelector('[data-add="rd"]'));
  const rr = $("tab-redirects").querySelector(".rowform");
  setVal(rr.querySelector('[data-k="from"]'), "old");
  setVal(rr.querySelector('[data-k="to"]'), "/new.html");
  click($("rd-save")); await wait(100);
  if (!/should start with/.test($("rd-status").textContent)) failures.push("redirects: bad old address was not rejected");
  setVal(rr.querySelector('[data-k="from"]'), "/old.html");
  click($("rd-save")); await wait(200);
  if (!saved.settings.redirects || saved.settings.redirects[0].from !== "/old.html" || saved.settings.redirects[0].type !== 301) failures.push("redirects: not saved " + JSON.stringify(saved.settings.redirects));

  // --- FAQ loads the original questions from faq.html ---
  w.showTab("faq"); await wait(200);
  const faqRows = $("tab-faq").querySelectorAll("#fq-list .rowform");
  if (faqRows.length < 9) failures.push(`faq: expected the 9 original questions, got ${faqRows.length}`);

  // --- Pages: loads text from index.html, saves only changed keys ---
  w.showTab("pages"); await wait(300);
  const pageFields = $("tab-pages").querySelectorAll("[data-cms-field]");
  if (pageFields.length < 10) failures.push(`pages: expected many editable fields on the homepage, got ${pageFields.length}`);
  const h1 = Array.from(pageFields).find((f) => /Never worry/.test(f.dataset.default));
  if (!h1) failures.push("pages: homepage main heading not found among editable fields");
  else {
    setVal(h1, "Power for every outage.");
    click($("pg-save")); await wait(200);
    const cms = saved.settings.cms || {};
    const keys = Object.keys(cms);
    if (keys.length !== 1 || cms[keys[0]] !== "Power for every outage.") failures.push("pages: only the one changed field should be stored, got " + JSON.stringify(cms));
  }

  // --- Blog: create a draft ---
  w.showTab("blog"); await wait(100);
  click($("bl-new")); await wait(50);
  setVal($("bl-title"), "Test Post");
  $("bl-body").value = "<p>Hello</p>";
  click($("bl-save")); await wait(200);
  if (!saved.blog || saved.blog.title !== "Test Post" || saved.blog.published !== false) failures.push("blog: draft not saved " + JSON.stringify(saved.blog));

  // --- Maintenance + tracking validation ---
  w.showTab("tracking"); await wait(100);
  setVal($("tk-ga"), "bad id");
  click($("tk-save")); await wait(100);
  if (!/doesn't look like/.test($("tk-status").textContent)) failures.push("tracking: invalid Analytics ID accepted");

  w.showTab("maintenance"); await wait(100);
  $("mt-on").value = "1";
  click($("mt-save")); await wait(200);
  if (!saved.settings.maintenance || saved.settings.maintenance.enabled !== true) failures.push("maintenance: ON not saved");

  w.close();
  return failures.concat(errors.map((e) => "page error: " + e));
}

module.exports = { name: "admin-ui", run };
