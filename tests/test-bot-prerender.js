// Guards netlify/edge-functions/bot-prerender.js, which does two jobs now
// that product pages live at clean URLs (/products/X, /accessories/X,
// /solar/X, /kits/X) instead of product.html?id=X:
//
//   Job 1: ANY visitor (bot or real browser) hitting the old
//          "/product.html?id=..." address gets a 301 redirect to the
//          permanent clean address. This runs before the bot check, since
//          it applies to everyone, not just bots.
//   Job 2: a known bot/crawler user agent at one of the four clean
//          addresses gets handed off to product-page.js for a
//          server-rendered version of that page. Real visitors at those
//          same clean addresses pass straight through via context.next()
//          to the normal client-rendered product.html (served through the
//          netlify.toml rewrite), untouched.
const path = require("path");
const { pathToFileURL } = require("url");

async function run() {
  const failures = [];

  const modulePath = path.join(__dirname, "..", "netlify", "edge-functions", "bot-prerender.js");
  const mod = await import(pathToFileURL(modulePath).href);
  const { default: handler, isBotUserAgent, rawIdToPrettyPath, prettyPathToRawId } = mod;

  // --- User-agent detection: known bots true, real browsers false ---
  const uaCases = [
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true],
    ["Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", true],
    ["facebookexternalhit/1.1", true],
    ["Twitterbot/1.0", true],
    ["Slackbot-LinkExpanding 1.0", true],
    ["GPTBot/1.0", true],
    ["ClaudeBot/1.0", true],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", false],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", false],
    ["", false],
  ];
  for (const [ua, expected] of uaCases) {
    const got = isBotUserAgent(ua);
    if (got !== expected) {
      failures.push(`isBotUserAgent(${JSON.stringify(ua)}) should be ${expected}, got ${got}`);
    }
  }

  // --- URL-mapping helpers, mirroring prettyProductUrl()/rawIdFromLocation() in js/main.js ---
  const mappingCases = [
    ["river-2", "/products/river-2"],
    ["accessory:river-3-waterproof-bag", "/accessories/river-3-waterproof-bag"],
    ["solar:solar-45w", "/solar/solar-45w"],
    ["bundle:kit-weekend-camper", "/kits/kit-weekend-camper"],
  ];
  for (const [rawId, prettyPath] of mappingCases) {
    const got = rawIdToPrettyPath(rawId);
    if (got !== prettyPath) {
      failures.push(`rawIdToPrettyPath(${JSON.stringify(rawId)}) should be ${prettyPath}, got ${got}`);
    }
    const roundTrip = prettyPathToRawId(prettyPath);
    if (roundTrip !== rawId) {
      failures.push(`prettyPathToRawId(${JSON.stringify(prettyPath)}) should be ${JSON.stringify(rawId)}, got ${JSON.stringify(roundTrip)}`);
    }
  }
  if (prettyPathToRawId("/about.html") !== null) {
    failures.push("prettyPathToRawId should return null for a path that isn't one of the four clean product-page sections");
  }

  // --- Job 1: old "?id=" links 301-redirect to the clean address, for EVERY visitor ---
  for (const [ua, label] of [
    ["Mozilla/5.0 Chrome/128", "a real browser"],
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "a bot"],
  ]) {
    let fetchCalled = false;
    const originalFetch = global.fetch;
    global.fetch = async () => { fetchCalled = true; return new Response("should not be used"); };

    const req = new Request("https://voltreservepower.com/product.html?id=river-2", {
      headers: { "user-agent": ua },
    });
    let nextCalled = false;
    const ctx = { next: async () => { nextCalled = true; return new Response("normal page", { status: 200 }); } };
    const res = await handler(req, ctx);

    if (res.status !== 301) failures.push(`${label} requesting /product.html?id=river-2 should get a 301 redirect, got ${res.status}`);
    const location = res.headers.get("location") || "";
    if (!location.endsWith("/products/river-2")) {
      failures.push(`${label}'s redirect should point at /products/river-2, got ${location}`);
    }
    if (nextCalled) failures.push(`${label}'s old-URL request should redirect, not fall through to context.next()`);
    if (fetchCalled) failures.push(`${label}'s old-URL request should never trigger a fetch to product-page.js`);

    global.fetch = originalFetch;
  }

  // --- Job 1 also covers the other three item kinds' old-URL ids ---
  {
    const req = new Request("https://voltreservepower.com/product.html?id=accessory%3Ariver-3-waterproof-bag", {
      headers: { "user-agent": "Mozilla/5.0 Chrome/128" },
    });
    const ctx = { next: async () => new Response("normal page", { status: 200 }) };
    const res = await handler(req, ctx);
    const location = res.headers.get("location") || "";
    if (res.status !== 301 || !location.endsWith("/accessories/river-3-waterproof-bag")) {
      failures.push(`old-URL accessory id should redirect to /accessories/river-3-waterproof-bag, got status ${res.status} location ${location}`);
    }
  }

  // --- A real visitor at a clean address passes straight through, product-page.js is never called ---
  {
    let fetchCalled = false;
    const originalFetch = global.fetch;
    global.fetch = async () => { fetchCalled = true; return new Response("should not be used"); };

    const req = new Request("https://voltreservepower.com/products/river-2", {
      headers: { "user-agent": "Mozilla/5.0 Chrome/128" },
    });
    let nextCalled = false;
    const ctx = { next: async () => { nextCalled = true; return new Response("normal page", { status: 200 }); } };
    const res = await handler(req, ctx);

    if (!nextCalled) failures.push("a real browser's request to a clean product URL should call context.next() (pass through to the normal page)");
    if (fetchCalled) failures.push("a real browser's request should never trigger a fetch to product-page.js");
    if (res.status !== 200) failures.push(`expected the passed-through response status 200, got ${res.status}`);

    global.fetch = originalFetch;
  }

  // --- A bot's request at each clean address is handed off to product-page.js with the right prefixed id ---
  for (const [cleanPath, expectedId] of [
    ["/products/delta-3-plus", "delta-3-plus"],
    ["/accessories/river-3-waterproof-bag", "accessory:river-3-waterproof-bag"],
    ["/solar/solar-45w", "solar:solar-45w"],
    ["/kits/kit-weekend-camper", "bundle:kit-weekend-camper"],
  ]) {
    let calledUrl = null;
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      calledUrl = String(url);
      return new Response("<html>prerendered</html>", { status: 200, headers: { "Content-Type": "text/html" } });
    };

    const req = new Request(`https://voltreservepower.com${cleanPath}`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    });
    let nextCalled = false;
    const ctx = { next: async () => { nextCalled = true; return new Response("normal page"); } };
    const res = await handler(req, ctx);
    const body = await res.text();

    if (nextCalled) failures.push(`a bot's request to ${cleanPath} should NOT call context.next() when product-page.js responds successfully`);
    if (!calledUrl || !calledUrl.includes("/.netlify/functions/product-page")) {
      failures.push(`bot request to ${cleanPath} should fetch product-page.js, got url ${calledUrl}`);
    }
    if (!calledUrl || !calledUrl.includes(`id=${encodeURIComponent(expectedId)}`)) {
      failures.push(`bot request to ${cleanPath} should ask product-page.js for id=${expectedId}, got url ${calledUrl}`);
    }
    if (body !== "<html>prerendered</html>") {
      failures.push(`bot should receive product-page.js's rendered body, got ${JSON.stringify(body)}`);
    }

    global.fetch = originalFetch;
  }

  // --- A bot at bare /product.html with no id falls through like any other visitor ---
  {
    let fetchCalled = false;
    const originalFetch = global.fetch;
    global.fetch = async () => { fetchCalled = true; return new Response("should not be used"); };

    const req = new Request("https://voltreservepower.com/product.html", {
      headers: { "user-agent": "Googlebot/2.1" },
    });
    let nextCalled = false;
    const ctx = { next: async () => { nextCalled = true; return new Response("normal page", { status: 200 }); } };
    const res = await handler(req, ctx);

    if (!nextCalled) failures.push("a bot at bare /product.html with no id should fall through via context.next()");
    if (fetchCalled) failures.push("a bot at bare /product.html with no id should never trigger a fetch to product-page.js");

    global.fetch = originalFetch;
  }

  // --- If product-page.js is unreachable, fail open to the normal page rather than erroring ---
  {
    const originalFetch = global.fetch;
    global.fetch = async () => { throw new Error("simulated network failure"); };

    const req = new Request("https://voltreservepower.com/products/river-2", {
      headers: { "user-agent": "Googlebot/2.1" },
    });
    let nextCalled = false;
    const ctx = { next: async () => { nextCalled = true; return new Response("normal page", { status: 200 }); } };
    const res = await handler(req, ctx);

    if (!nextCalled) failures.push("if product-page.js is unreachable, bot-prerender should fail open via context.next(), not error out");
    if (res.status !== 200) failures.push(`expected the fail-open response status 200, got ${res.status}`);

    global.fetch = originalFetch;
  }

  return failures;
}

module.exports = { name: "bot-prerender", run };
