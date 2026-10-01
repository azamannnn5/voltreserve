// One-time helper (already applied): tags plain-text elements on a few pages
// with data-cms="<page>.<n>" so the admin panel can change their text.
// Safe to re-run: elements that already have data-cms are skipped.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const pages = ["index", "about", "shipping", "privacy", "terms"];
const skipBlocks = /<(script|style|header|footer|nav|svg|noscript)\b[\s\S]*?<\/\1>/gi;
for (const page of pages) {
  const file = path.join(root, page + ".html");
  let html = fs.readFileSync(file, "utf8");
  // Mask the regions we never touch so the counter ignores them.
  const masks = [];
  html = html.replace(skipBlocks, (m) => { masks.push(m); return `\u0000M${masks.length - 1}\u0000`; });
  let n = 0;
  html = html.replace(/<(h1|h2|h3|p|li)(\s[^>]*)?>([^<]+)<\/\1>/g, (m, tag, attrs, inner) => {
    attrs = attrs || "";
    if (/data-cms|\sid=|data-/.test(attrs) || /\{|\}|\u0000/.test(inner) || inner.trim().length < 3) return m;
    n++;
    return `<${tag}${attrs} data-cms="${page}.${n}">${inner}</${tag}>`;
  });
  html = html.replace(/\u0000M(\d+)\u0000/g, (_, i) => masks[Number(i)]);
  fs.writeFileSync(file, html);
  console.log(page, n, "elements tagged");
}
