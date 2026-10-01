// GET /blog/<slug>  (rewritten here by netlify.toml)
//
// Renders one blog post written in the admin panel as a full web page. It
// borrows the header and footer from an existing guide page so the new
// posts always match the rest of the site, even after later design changes.
// Unknown or unpublished slugs get a normal 404 page.

const { getSupabase } = require("./lib/admin");
const { sanitizeBlogHtml } = require("./lib/blog-html");

const DOMAIN = "https://voltreservepower.com";
const SHELL_PAGE = "/blog-watt-hours.html?cms=raw";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

async function loadShell(origin) {
  try {
    const res = await fetch(origin + SHELL_PAGE);
    if (!res.ok) return null;
    const html = await res.text();
    const head = html.match(/<\/header>/i), foot = html.search(/<footer\b/i);
    const start = html.search(/<header\b/i);
    if (!head || foot < 0 || start < 0) return null;
    const headerEnd = html.search(/<\/header>/i) + "</header>".length;
    return {
      headerHtml: html.slice(start, headerEnd),
      footerHtml: html.slice(foot),
      headExtras: (html.match(/<link rel="preconnect"[\s\S]*?<link rel="stylesheet" href="css\/style.css">/i) || [""])[0],
      analytics: (html.match(/<!-- Google Analytics -->[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/i) || [""])[0]
    };
  } catch {
    return null;
  }
}

function notFound() {
  return { statusCode: 404, headers: { "Content-Type": "text/html; charset=utf-8" }, body: `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found | VoltReserve</title><p style="font-family:sans-serif;padding:40px">That article could not be found. <a href="/guides.html">Back to the guides</a>.</p>` };
}

exports.handler = async (event) => {
  const slug = String((event.queryStringParameters || {}).slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const supabase = getSupabase();
  if (!slug || !supabase) return notFound();
  let post = null;
  try {
    const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
    post = data;
  } catch { /* fall through */ }
  if (!post) return notFound();

  const origin = DOMAIN;
  const shell = await loadShell(origin);
  const url = `${DOMAIN}/blog/${slug}`;
  const title = `${post.title} | VoltReserve`;
  const desc = post.description || post.excerpt || "";
  const image = post.cover_image ? (/^https?:/i.test(post.cover_image) ? post.cover_image : `${DOMAIN}/${post.cover_image.replace(/^\//, "")}`) : `${DOMAIN}/images/brand-logo.png`;
  const published = (post.published_at || post.created_at || new Date().toISOString()).slice(0, 10);
  const modified = (post.updated_at || published).slice(0, 10);

  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: post.title, description: desc, image, mainEntityOfPage: url, datePublished: published, dateModified: modified,
      author: { "@type": "Organization", name: "VoltReserve", url: `${DOMAIN}/about.html` },
      publisher: { "@type": "Organization", name: "VoltReserve", logo: { "@type": "ImageObject", url: `${DOMAIN}/images/brand-logo.png` } } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${DOMAIN}/` },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${DOMAIN}/guides.html` },
      { "@type": "ListItem", position: 3, name: post.title, item: url } ] }
  ].map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");

  const cover = post.cover_image ? `<div class="hero-photo-band blog-hero" style="background-image:url('${esc(post.cover_image).replace(/'/g, "%27")}');"></div>` : "";
  const article = `${cover}
<section>
  <div class="container" style="max-width:760px;">
    ${post.category ? `<p class="eyebrow">${esc(String(post.category).toUpperCase())}</p>` : ""}
    <h1 style="margin:12px 0 24px;">${esc(post.title)}</h1>
    ${sanitizeBlogHtml(post.body)}
    <div style="margin-top:40px; padding-top:24px; border-top:1px solid var(--border);">
      <a href="products.html" class="btn btn-primary">Browse the Full Lineup →</a>
    </div>
  </div>
</section>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="/">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="icon" type="image/x-icon" href="favicon.ico">
${shell ? shell.analytics : ""}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="VoltReserve">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
${shell && shell.headExtras ? shell.headExtras : '<link rel="stylesheet" href="css/style.css">'}
${ld}
</head>
<body>
${shell ? shell.headerHtml : ""}
${article}
${shell ? shell.footerHtml : "</body></html>"}`;

  return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" }, body: html };
};
