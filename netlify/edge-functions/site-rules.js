// Netlify Edge Function: "site rules", driven by the admin panel.
//
// Runs on every page request and applies whatever was saved in the admin
// panel (stored in the same settings blob as the promo config):
//
//   redirects        Marketing/SEO > Redirects     (301/302 from one address to another)
//   maintenance      Settings > Maintenance Mode   (503 page for visitors, admin keeps access)
//   seoOverrides     SEO > Page SEO                (title, description, noindex per page)
//   headTags, gaId   SEO > Tracking & Tags         (extra <head> code, Google Analytics ID)
//   cms              Site Content > Homepage & Pages (text and hero photo replacements)
//   faqItems         Site Content > FAQ            (rebuilds the FAQ list + FAQ rich-result data)
//   branding         Settings > Logo & Colors      (accent colors, favicon)
//
// SAFE BY DESIGN: if the settings can't be fetched, or nothing is saved for
// a feature, the page is returned exactly as it is in the files. Any error
// anywhere falls back to the untouched page. Nothing here runs for images,
// scripts, CSS, or the API.
//
// Add ?cms=raw to any page address to get the original, untransformed HTML
// (the admin panel uses this to read the default page text).

const CACHE_MS = 60 * 1000;
let cache = { at: 0, value: null };

export async function loadSettings(origin, fetchImpl) {
  const now = Date.now();
  if (cache.at && now - cache.at < CACHE_MS) return cache.value;
  const doFetch = fetchImpl || fetch;
  let value = null;
  try {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 1500) : null;
    const res = await doFetch(origin + "/.netlify/functions/settings", { headers: { accept: "application/json" }, signal: ctl ? ctl.signal : undefined });
    if (timer) clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      value = data && typeof data === "object" ? data : null;
    } else {
      // Keep serving the last good copy if we have one.
      if (cache.value) { cache.at = now; return cache.value; }
    }
  } catch {
    if (cache.value) { cache.at = now; return cache.value; }
  }
  cache = { at: now, value };
  return value;
}

export function resetCache() { cache = { at: 0, value: null }; }

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function normPath(p) {
  let out = String(p || "/").split("?")[0];
  if (out.length > 1) out = out.replace(/\/+$/, "");
  return out || "/";
}

function pathCandidates(p) {
  const n = normPath(p);
  const set = [n];
  if (n === "/index.html") set.push("/");
  if (n === "/") set.push("/index.html");
  if (n.endsWith(".html")) set.push(n.slice(0, -5));
  else if (n !== "/") set.push(n + ".html");
  return set;
}

export function findRedirect(settings, pathname) {
  const list = settings && Array.isArray(settings.redirects) ? settings.redirects : [];
  const cands = pathCandidates(pathname).map((c) => c.toLowerCase());
  for (const r of list) {
    if (!r || !r.from || !r.to) continue;
    const from = normPath(String(r.from).trim()).toLowerCase();
    if (cands.includes(from)) {
      const to = String(r.to).trim();
      if (!/^(https?:\/\/|\/)/i.test(to)) continue;
      if (normPath(to).toLowerCase() === normPath(pathname).toLowerCase()) continue; // never loop
      return { to, status: Number(r.type) === 302 ? 302 : 301 };
    }
  }
  return null;
}

function maintenancePage(m) {
  const title = esc((m && m.title) || "We'll be right back");
  const msg = esc((m && m.message) || "VoltReserve is being updated. Please check back shortly.");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;background:#f4f4f6;color:#18181b;text-align:center;padding:24px}main{max-width:480px}h1{font-size:1.8rem;margin:0 0 12px}p{color:#52525b;line-height:1.6}</style></head><body><main><h1>${title}</h1><p>${msg}</p></main></body></html>`;
}

function hasCookie(request, name, value) {
  const c = request.headers.get("cookie") || "";
  return c.split(/;\s*/).some((p) => p === name + "=" + value);
}

const SAFE_URL = /^(https?:\/\/[^\s"'()<>]+|\/[^\s"'()<>]*|[A-Za-z0-9_\-./]+)$/;
const HEX = /^#[0-9a-fA-F]{3,8}$/;

function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta\\s+[^>]*${attr}=["']${name}["'][^>]*\\scontent=["'])[^"']*(["'][^>]*>)`, "i");
  if (re.test(html)) return html.replace(re, (_, a, b) => a + esc(value) + b);
  return html;
}

export function transformHtml(html, settings, pathname) {
  if (!settings || typeof settings !== "object") return html;
  let out = html;

  // ---- Page SEO ----
  const seo = settings.seoOverrides && typeof settings.seoOverrides === "object" ? settings.seoOverrides : null;
  if (seo) {
    let o = null;
    const keys = Object.keys(seo);
    const cands = pathCandidates(pathname).map((c) => c.toLowerCase());
    for (const k of keys) {
      if (cands.includes(normPath(k).toLowerCase())) { o = seo[k]; break; }
    }
    if (o && typeof o === "object") {
      if (o.title) {
        const t = esc(o.title);
        out = /<title>[\s\S]*?<\/title>/i.test(out) ? out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`) : out;
        out = setMeta(out, "property", "og:title", o.title);
        out = setMeta(out, "name", "twitter:title", o.title);
      }
      if (o.description) {
        out = setMeta(out, "name", "description", o.description);
        out = setMeta(out, "property", "og:description", o.description);
        out = setMeta(out, "name", "twitter:description", o.description);
      }
      if (o.noindex) {
        const tag = `<meta name="robots" content="noindex, follow">`;
        out = /<meta\s+[^>]*name=["']robots["'][^>]*>/i.test(out)
          ? out.replace(/<meta\s+[^>]*name=["']robots["'][^>]*>/i, tag)
          : out.replace(/<\/head>/i, tag + "</head>");
      }
    }
  }

  // ---- Google Analytics ID ----
  if (typeof settings.gaId === "string" && /^G-[A-Z0-9]{6,}$/.test(settings.gaId.trim())) {
    const id = settings.gaId.trim();
    out = out.replace(/(googletagmanager\.com\/gtag\/js\?id=)G-[A-Z0-9]+/g, `$1${id}`)
      .replace(/(gtag\(\s*['"]config['"]\s*,\s*['"])G-[A-Z0-9]+(['"])/g, `$1${id}$2`);
  }

  // ---- Branding ----
  const b = settings.branding && typeof settings.branding === "object" ? settings.branding : null;
  if (b) {
    const vars = [];
    if (HEX.test(String(b.accent || "").trim())) vars.push(`--accent:${b.accent.trim()}`);
    if (HEX.test(String(b.accentDark || "").trim())) vars.push(`--accent-dim:${b.accentDark.trim()}`);
    if (HEX.test(String(b.accentInk || "").trim())) vars.push(`--accent-ink:${b.accentInk.trim()}`);
    if (vars.length) out = out.replace(/<\/head>/i, `<style id="vr-branding">:root{${vars.join(";")}}</style></head>`);
    const fav = String(b.faviconUrl || "").trim();
    if (fav && SAFE_URL.test(fav)) {
      out = out.replace(/(<link\s+[^>]*rel=["']icon["'][^>]*\shref=["'])[^"']*(["'][^>]*>)/gi, (_, a, c) => a + esc(fav) + c);
    }
  }

  // ---- FAQ list + FAQ rich-result data ----
  const faq = Array.isArray(settings.faqItems) ? settings.faqItems.filter((f) => f && f.q && f.a) : [];
  if (faq.length && out.includes("<!--faq-start-->") && out.includes("<!--faq-end-->")) {
    const para = (t) => String(t).split(/\n{1,}/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join("\n      ");
    const list = faq.map((f, i) => `    <details class="faq-item"${i === 0 ? " open" : ""}>\n      <summary>${esc(f.q)}</summary>\n      ${para(f.a)}\n    </details>`).join("\n");
    out = out.replace(/<!--faq-start-->[\s\S]*?<!--faq-end-->/, `<!--faq-start-->\n${list}\n    <!--faq-end-->`);
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: String(f.q), acceptedAnswer: { "@type": "Answer", text: String(f.a).replace(/\s*\n+\s*/g, " ") } }))
    };
    const json = JSON.stringify(ld).replace(/</g, "\\u003c");
    out = out.replace(/<script type="application\/ld\+json">\s*\{[^<]*"@type":\s*"FAQPage"[\s\S]*?<\/script>/, `<script type="application/ld+json">${json}</script>`);
  }

  // ---- Page text (data-cms) and hero photo (data-cms-bg) ----
  const cms = settings.cms && typeof settings.cms === "object" ? settings.cms : null;
  if (cms && Object.keys(cms).length) {
    out = out.replace(/(<(h[1-6]|p|li|a|span|summary|strong|button|div)\b[^>]*\sdata-cms="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, inner, close) => {
      const v = cms[key];
      if (typeof v !== "string" || !v.trim()) return m;
      return open + esc(v.trim()) + close;
    });
    out = out.replace(/<([a-z0-9]+)\b[^>]*\sdata-cms-bg="([^"]+)"[^>]*>/gi, (m, tag, key) => {
      const v = String(cms[key] || "").trim();
      if (!v || !SAFE_URL.test(v)) return m;
      return m.replace(/url\((['"]?)[^)'"]*\1\)/, `url('${v}')`);
    });
  }

  // ---- Extra head code ----
  if (typeof settings.headTags === "string" && settings.headTags.trim()) {
    out = out.replace(/<\/head>/i, settings.headTags.trim() + "\n</head>");
  }

  return out;
}

function wantsTransform(s) {
  if (!s) return false;
  return !!(
    (s.seoOverrides && Object.keys(s.seoOverrides).length) || s.gaId || s.branding ||
    (Array.isArray(s.faqItems) && s.faqItems.length) ||
    (s.cms && Object.keys(s.cms).length) || (s.headTags && String(s.headTags).trim())
  );
}

export default async function handler(request, context) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Only pages. Anything with a non-.html file extension, or the API, passes straight through.
    if (pathname.startsWith("/.netlify/") || (/\.[a-z0-9]+$/i.test(pathname) && !/\.html$/i.test(pathname))) return;
    if (request.method !== "GET" && request.method !== "HEAD") return;
    if (url.searchParams.get("cms") === "raw") return;

    const settings = await loadSettings(url.origin);
    if (!settings) return;

    const isAdmin = /^\/admin(\.html)?$/i.test(pathname);

    if (!isAdmin) {
      const r = findRedirect(settings, pathname);
      if (r) return Response.redirect(new URL(r.to, url.origin).toString(), r.status);

      const m = settings.maintenance;
      if (m && m.enabled && !hasCookie(request, "vr_preview", "1")) {
        return new Response(maintenancePage(m), {
          status: 503,
          headers: { "content-type": "text/html; charset=utf-8", "retry-after": "3600", "cache-control": "no-store" }
        });
      }
    }

    if (isAdmin || !wantsTransform(settings)) return;

    const response = await context.next();
    const type = response.headers.get("content-type") || "";
    if (response.status !== 200 || !type.includes("text/html")) return response;

    const html = await response.text();
    let out = html;
    try { out = transformHtml(html, settings, pathname); } catch { out = html; }
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(out, { status: response.status, headers });
  } catch {
    return; // never break the site
  }
}

export const config = {
  path: "/*",
  excludedPath: ["/js/*", "/css/*", "/images/*", "/.netlify/*", "/favicon*"]
};
