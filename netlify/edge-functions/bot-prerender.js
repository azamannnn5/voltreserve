// Netlify Edge Function, scoped to /product.html plus the four clean
// product-page addresses (/products/*, /accessories/*, /solar/*,
// /kits/*) - see `config` export below, and the matching
// [[edge_functions]] entries in netlify.toml.
//
// This does two separate jobs:
//
// 1. Redirects the OLD "/product.html?id=..." address to the matching
//    new clean address (e.g. "/products/river-2"), for EVERY visitor,
//    not just bots. This runs first, before the bot check, so old
//    bookmarks and any links out there still work and land on the real,
//    permanent URL rather than silently showing the same content at two
//    different addresses.
//
// 2. The original "second door" for search engines and link-preview
//    bots: product.html normally builds its whole visible content with
//    JavaScript (see js/main.js renderProductDetail()), which real
//    visitors' browsers handle fine, but which crawlers that don't run
//    JavaScript see as an almost-empty page. For requests from a KNOWN
//    crawler/bot user agent at one of the clean addresses, this hands
//    off to netlify/functions/product-page.js, which returns the same
//    page with the real product content already in the HTML. Every
//    other request (i.e. every real visitor) is untouched -
//    context.next() passes it straight through to the normal
//    product.html file (served via the clean-URL rewrites in
//    netlify.toml), byte for byte identical to what a direct visit
//    would show.
//
// This pattern (serving pre-rendered HTML to crawlers, the normal
// client-rendered page to everyone else) is commonly called "dynamic
// rendering" and is explicitly endorsed by Google for JS-heavy sites -
// it is NOT cloaking, because the content served to the crawler matches
// what a real visitor's browser ends up showing once js/main.js runs.

// Known crawler/bot user-agent substrings: mainstream search engines,
// social/chat link-preview bots (these almost never execute JavaScript,
// so they benefit the most from this), and AI answer-engine crawlers.
// Matching is case-insensitive and substring-based against the raw
// User-Agent header.
const BOT_PATTERNS = [
  // Search engines
  "googlebot", "google-inspectiontool", "adsbot-google", "mediapartners-google",
  "bingbot", "bingpreview", "slurp", "duckduckbot", "baiduspider", "yandexbot",
  "sogou", "exabot", "applebot",
  // Link-preview / chat bots (rarely run JS)
  "facebookexternalhit", "facebot", "twitterbot", "linkedinbot", "whatsapp",
  "telegrambot", "discordbot", "slackbot", "skypeuripreview", "pinterest",
  "redditbot", "vkshare", "w3c_validator", "flipboard",
  // SEO/crawling tools (worth showing real content to as well)
  "ahrefsbot", "semrushbot", "mj12bot", "screaming frog",
  // AI answer-engine crawlers
  "gptbot", "chatgpt-user", "claudebot", "anthropic-ai", "ccbot", "perplexitybot", "oai-searchbot"
];

const BOT_REGEX = new RegExp(BOT_PATTERNS.join("|"), "i");

export function isBotUserAgent(userAgent) {
  return !!userAgent && BOT_REGEX.test(userAgent);
}

// Maps a clean-URL section name to the id-prefix scheme used everywhere
// else in this codebase (see cartItemLookup() in js/main.js): bare id for
// a product, "accessory:x" / "solar:x" / "bundle:x" for the other three.
const PREFIX_BY_SECTION = { products: "", accessories: "accessory:", solar: "solar:", kits: "bundle:" };

// "/accessories/river-3-waterproof-bag" -> "accessory:river-3-waterproof-bag".
// Returns null for anything that isn't one of the four clean product-page
// paths (shouldn't normally happen given how this function is scoped, but
// defensive rather than assuming).
export function prettyPathToRawId(pathname) {
  const m = pathname.match(/^\/(products|accessories|solar|kits)\/([^/]+)\/?$/);
  if (!m) return null;
  return PREFIX_BY_SECTION[m[1]] + decodeURIComponent(m[2]);
}

// The reverse mapping, used for redirecting the old "?id=" address to the
// new clean one. Mirrors prettyProductUrl() in js/main.js (and the
// equivalent in netlify/functions/product-page.js and sitemap.js) - those
// run in separate JS runtimes that can't share this file.
export function rawIdToPrettyPath(rawId) {
  if (rawId.startsWith("accessory:")) return `/accessories/${encodeURIComponent(rawId.slice("accessory:".length))}`;
  if (rawId.startsWith("solar:")) return `/solar/${encodeURIComponent(rawId.slice("solar:".length))}`;
  if (rawId.startsWith("bundle:")) return `/kits/${encodeURIComponent(rawId.slice("bundle:".length))}`;
  return `/products/${encodeURIComponent(rawId)}`;
}

export default async (request, context) => {
  const url = new URL(request.url);

  // Job 1: legacy "?id=" links redirect to the permanent clean address,
  // for every visitor - this has to happen before the bot check below,
  // since it applies to real visitors too.
  if (url.pathname === "/product.html" && url.searchParams.get("id")) {
    const dest = new URL(rawIdToPrettyPath(url.searchParams.get("id")), url.origin);
    return Response.redirect(dest.toString(), 301);
  }

  const userAgent = request.headers.get("user-agent") || "";
  if (!isBotUserAgent(userAgent)) {
    return context.next();
  }

  // Job 2: a bot at one of the four clean addresses gets the prerendered
  // page. (A bot at bare "/product.html" with no "?id=" - e.g. an old
  // crawl of the generic fallback page - falls through to context.next()
  // below like any other visitor; there's no specific item to prerender.)
  const rawId = prettyPathToRawId(url.pathname);
  if (!rawId) {
    return context.next();
  }

  const targetUrl = new URL("/.netlify/functions/product-page?id=" + encodeURIComponent(rawId), url.origin);

  let functionResponse;
  try {
    functionResponse = await fetch(targetUrl.toString(), {
      headers: { "x-prerender-request": "1" }
    });
  } catch (err) {
    // If the render function is unreachable for any reason, fail open -
    // fall back to the normal client-rendered page rather than showing
    // the crawler an error. Real visitors are never affected either way.
    console.warn("bot-prerender: product-page fetch failed, falling back to normal page.", err);
    return context.next();
  }

  if (!functionResponse.ok) {
    // 404 (unknown id) or a server error from product-page.js - let it
    // through as-is rather than silently masking it with the normal page,
    // EXCEPT on a hard failure where falling back is safer for the crawler.
    if (functionResponse.status >= 500) {
      return context.next();
    }
  }

  return new Response(functionResponse.body, {
    status: functionResponse.status,
    headers: functionResponse.headers
  });
};

export const config = { path: ["/product.html", "/products/*", "/accessories/*", "/solar/*", "/kits/*"] };
