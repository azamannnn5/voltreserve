// Guards netlify/functions/product-page.js - the server-rendered page
// bot-prerender.js hands search-engine/link-preview bots. Checks that
// each item type (product/accessory/solar panel/kit) renders real,
// correctly-escaped content into the title, meta description, canonical
// URL, JSON-LD, and visible HTML, using the bundled fallback catalogs
// (no Supabase env vars set, same degrade-gracefully path the live site
// uses when the database is unreachable), and that an unknown id
// produces a proper 404 rather than silently showing the wrong item.
const path = require("path");

function freshHandler() {
  const modulePath = path.join(__dirname, "..", "netlify", "functions", "product-page.js");
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath).handler;
}

async function run() {
  const failures = [];
  const handler = freshHandler();

  // --- Product ---
  {
    const res = await handler({ queryStringParameters: { id: "river-2" } });
    const body = res.body;
    if (res.statusCode !== 200) failures.push(`product river-2: expected 200, got ${res.statusCode}`);
    if (!body.includes("<h1>RIVER 2</h1>")) failures.push("product river-2: <h1> should contain the real product name");
    if (!body.includes('<link rel="canonical" href="https://voltreservepower.com/products/river-2">')) {
      failures.push("product river-2: canonical URL should be the clean /products/river-2 address");
    }
    if (!body.includes('"@type":"Product"') || !body.includes('"price":')) {
      failures.push("product river-2: JSON-LD Product schema is missing or malformed");
    }
    if (!body.includes('"@type":"BreadcrumbList"')) {
      failures.push("product river-2: BreadcrumbList JSON-LD is missing");
    }
    if (!body.includes('"sku":"river-2"') || !body.includes('"brand"')) {
      failures.push("product river-2: expanded Product schema (sku/brand) is missing");
    }
    if (body.includes("undefined") || body.includes("NaN")) {
      failures.push("product river-2: rendered HTML leaked an undefined/NaN value");
    }
  }

  // --- Accessory ---
  {
    const res = await handler({ queryStringParameters: { id: "accessory:river-3-waterproof-bag" } });
    if (res.statusCode !== 200) failures.push(`accessory: expected 200, got ${res.statusCode}`);
    if (!res.body.includes("RIVER 3 Waterproof Carrying Bag")) {
      failures.push("accessory: rendered HTML should contain the real accessory name");
    }
  }

  // --- Solar panel ---
  {
    const res = await handler({ queryStringParameters: { id: "solar:solar-45w" } });
    if (res.statusCode !== 200) failures.push(`solar panel: expected 200, got ${res.statusCode}`);
    if (!res.body.includes("45W Portable Solar Panel")) {
      failures.push("solar panel: rendered HTML should contain the real panel name");
    }
  }

  // --- Power Kit (bundle), including its "Includes: ..." line and compare-at price ---
  {
    const res = await handler({ queryStringParameters: { id: "bundle:kit-weekend-camper" } });
    if (res.statusCode !== 200) failures.push(`bundle: expected 200, got ${res.statusCode}`);
    if (!res.body.includes("Weekend Camper Kit")) failures.push("bundle: rendered HTML should contain the real kit name");
    if (!res.body.includes("Includes:")) failures.push("bundle: rendered HTML should list what's included");
    if (!res.body.includes("$219")) failures.push("bundle: rendered HTML should show the real kit price");
  }

  // --- Unknown id -> 404, not a silent fallback to some other item ---
  {
    const res = await handler({ queryStringParameters: { id: "not-a-real-id" } });
    if (res.statusCode !== 404) failures.push(`unknown id: expected 404, got ${res.statusCode}`);
  }

  // --- Missing id entirely -> 404 ---
  {
    const res = await handler({ queryStringParameters: {} });
    if (res.statusCode !== 404) failures.push(`missing id: expected 404, got ${res.statusCode}`);
  }

  // --- XSS: a malicious name/description must be escaped, not rendered as real HTML ---
  {
    process.env.SUPABASE_URL = "https://fake-project.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
    const maliciousHandler = freshHandler();
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      const u = String(url);
      const respond = (data) => ({
        ok: true, status: 200,
        json: async () => data, text: async () => JSON.stringify(data),
        headers: { get: () => "application/json" },
      });
      if (u.includes("/rest/v1/products")) {
        return respond([{
          id: "xss-test", name: '<img src=x onerror="alert(1)">', series: "RIVER",
          price: 99, description: "safe desc", images: [], in_stock: true,
        }]);
      }
      return respond([]);
    };

    const res = await maliciousHandler({ queryStringParameters: { id: "xss-test" } });
    if (res.body.includes("<img src=x onerror=")) {
      failures.push("XSS: a malicious product name was rendered as real HTML (unescaped) in product-page.js's output");
    }
    if (!res.body.includes("&lt;img")) {
      failures.push("XSS: the malicious name should still appear, just escaped as plain text");
    }

    global.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
  }

  return failures;
}

module.exports = { name: "product-page-render", run };
