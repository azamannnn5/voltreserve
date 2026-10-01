// Cleans the simple HTML an admin writes for a blog post before it is shown
// to visitors: removes scripts, styles, frames, forms, inline event handlers
// and javascript: links. Everything else (paragraphs, headings, lists, links,
// bold, images) is kept.
function sanitizeBlogHtml(html) {
  let out = String(html == null ? "" : html);
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<(script|style|iframe|object|embed|form|link|meta|base|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<\/?(script|style|iframe|object|embed|form|link|meta|base|svg|math|input|button|textarea|select)\b[^>]*>/gi, "");
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '$1=$2#$2');
  return out;
}

function makeSlug(text) {
  return String(text || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

module.exports = { sanitizeBlogHtml, makeSlug };
