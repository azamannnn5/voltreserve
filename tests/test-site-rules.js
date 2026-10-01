// Guards netlify/edge-functions/site-rules.js (redirects, maintenance, page
// SEO, tracking, page text, FAQ, branding) and that it leaves pages
// byte-for-byte untouched when nothing is saved or anything goes wrong.
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { ROOT } = require("./helpers");

async function run() {
  const failures = [];
  const mod = await import(pathToFileURL(path.join(ROOT, "netlify", "edge-functions", "site-rules.js")).href);
  const { default: handler, transformHtml, findRedirect, resetCache } = mod;
  const page = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

  const realFetch = global.fetch;
  let settings = null, fetchOk = true;
  global.fetch = async () => { if (!fetchOk) throw new Error("down"); return { ok: true, status: 200, json: async () => settings }; };
  const ctx = (html) => ({ next: async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) });
  const req = (p, headers) => new Request("https://voltreservepower.com" + p, { headers: headers || {} });
  const call = async (p, html, headers) => { resetCache(); return handler(req(p, headers), ctx(html || page("faq.html"))); };

  // Nothing saved: handler returns undefined (pass-through, page untouched)
  settings = null;
  if ((await call("/faq.html")) !== undefined) failures.push("no settings: page must pass through untouched");
  settings = {};
  if ((await call("/faq.html")) !== undefined) failures.push("empty settings: page must pass through untouched");
  fetchOk = false;
  if ((await call("/faq.html")) !== undefined) failures.push("settings unreachable: page must pass through (fail open)");
  fetchOk = true;

  // Static files and the API are never touched
  settings = { maintenance: { enabled: true } };
  if ((await call("/js/main.js")) !== undefined || (await call("/.netlify/functions/products")) !== undefined) failures.push("assets/API must never be intercepted");

  // Redirects
  settings = { redirects: [{ from: "/old", to: "/faq.html", type: 301 }, { from: "/tmp.html", to: "https://example.com/x", type: 302 }] };
  let r = await call("/old/");
  if (!r || r.status !== 301 || !r.headers.get("location").endsWith("/faq.html")) failures.push("redirect /old -> /faq.html (301) failed");
  r = await call("/tmp.html");
  if (!r || r.status !== 302 || r.headers.get("location") !== "https://example.com/x") failures.push("302 redirect to external address failed");
  if (findRedirect({ redirects: [{ from: "/a", to: "/a" }] }, "/a")) failures.push("self redirect (loop) must be ignored");
  if ((await call("/admin.html")) !== undefined) failures.push("admin page must never be redirected");

  // Maintenance
  settings = { maintenance: { enabled: true, title: "Back soon <b>", message: "Updating" } };
  r = await call("/index.html");
  if (!r || r.status !== 503 || !/Back soon &lt;b&gt;/.test(await r.text())) failures.push("maintenance: expected escaped 503 page");
  r = await call("/index.html", null, { cookie: "vr_preview=1" });
  if (r !== undefined) failures.push("maintenance: admin cookie must bypass");
  if ((await call("/admin.html")) !== undefined) failures.push("maintenance: admin page must stay reachable");

  // ?cms=raw returns the original
  settings = { cms: { "faq.1": "x" }, headTags: "<meta name='x'>" };
  resetCache();
  if ((await handler(req("/faq.html?cms=raw"), ctx(page("faq.html")))) !== undefined) failures.push("?cms=raw must pass through");

  // SEO overrides
  const faq = page("faq.html");
  let out = transformHtml(faq, { seoOverrides: { "/faq.html": { title: "New <T>", description: "New desc", noindex: true } } }, "/faq.html");
  if (!/<title>New &lt;T&gt;<\/title>/.test(out)) failures.push("seo: title not replaced/escaped");
  if (!/name="description" content="New desc"/.test(out)) failures.push("seo: description not replaced");
  if (!/property="og:title" content="New &lt;T&gt;"/.test(out)) failures.push("seo: og:title not replaced");
  if (!/name="robots" content="noindex, follow"/.test(out)) failures.push("seo: noindex missing");
  out = transformHtml(faq, { seoOverrides: { "/faq": { title: "Clean" } } }, "/faq.html");
  if (!/<title>Clean<\/title>/.test(out)) failures.push("seo: /faq key should match /faq.html");
  if (transformHtml(faq, { seoOverrides: { "/other": { title: "Z" } } }, "/faq.html") !== faq) failures.push("seo: other pages must be unchanged");

  // Tracking
  out = transformHtml(page("index.html"), { gaId: "G-NEWID12345", headTags: "<meta name=\"verify\" content=\"1\">" }, "/");
  if (out.includes("G-4WE5FE3Q67") || !out.includes("G-NEWID12345")) failures.push("tracking: GA id not replaced everywhere");
  if (!/<meta name="verify" content="1">\s*<\/head>/.test(out)) failures.push("tracking: head tags not inserted before </head>");
  if (transformHtml(page("index.html"), { gaId: "evil'><script>" }, "/").includes("evil")) failures.push("tracking: invalid GA id must be ignored");

  // Page text + hero photo
  const idx = page("index.html");
  const h1m = idx.match(/<h1[^>]*data-cms="([^"]+)"[^>]*>Never worry/);
  if (!h1m) failures.push("index.html: main heading is not tagged with data-cms");
  else {
    out = transformHtml(idx, { cms: { [h1m[1]]: "Hello <script>x</script>" } }, "/");
    if (!out.includes("Hello &lt;script&gt;x&lt;/script&gt;")) failures.push("cms: text not replaced with escaping");
    if (out.includes("Never worry about running out")) failures.push("cms: old heading still present");
  }
  out = transformHtml(idx, { cms: { "index.hero-photo": "images/new.jpg" } }, "/");
  if (!out.includes("background-image:url('images/new.jpg')")) failures.push("cms: hero photo not replaced");
  out = transformHtml(idx, { cms: { "index.hero-photo": "x');}</style><script>" } }, "/");
  if (out.includes("</style><script>")) failures.push("cms: unsafe hero photo address accepted");

  // FAQ
  out = transformHtml(faq, { faqItems: [{ q: "Q1?", a: "A1\n\nSecond <b>" }, { q: "Q2?", a: "A2" }] }, "/faq.html");
  if ((out.match(/class="faq-item"/g) || []).length !== 2 || !/<details class="faq-item" open>/.test(out)) failures.push("faq: list not rebuilt");
  if (!out.includes("Second &lt;b&gt;")) failures.push("faq: answers not escaped");
  const ld = out.match(/<script type="application\/ld\+json">(\{"@context"[^<]*FAQPage[^<]*)<\/script>/);
  if (!ld || JSON.parse(ld[1]).mainEntity.length !== 2) failures.push("faq: FAQPage data not rebuilt to match");

  // Branding
  out = transformHtml(idx, { branding: { accent: "#ff0000", accentDark: "red;}</style>", faviconUrl: "/fav.png" } }, "/");
  if (!/--accent:#ff0000/.test(out) || /--accent-dim/.test(out)) failures.push("branding: valid color applied / invalid one skipped");
  if (!/rel="icon"[^>]*href="\/fav\.png"/.test(out)) failures.push("branding: favicon not replaced");

  // Full handler path transforms and strips content-length
  settings = { headTags: "<meta name=\"t\" content=\"1\">" };
  r = await call("/faq.html");
  if (!r || !(await r.text()).includes('content="1"')) failures.push("handler: transformed page not returned");

  global.fetch = realFetch;
  return failures;
}

module.exports = { name: "site-rules", run };
