// Guards the new accessories/solar CRUD endpoints - previously these had
// NO admin management at all (static-only, forever). Mirrors the same
// auth/validation pattern as products.js.
const path = require("path");

async function testEndpoint(fnFile, functionName) {
  const failures = [];
  process.env.SUPABASE_URL = "https://fake-project.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.ADMIN_KEY = "test-admin-key-123";

  const storageCalls = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    storageCalls.push({ url: u, method: opts.method });
    const respond = (data, status = 200) => ({
      ok: status < 300, status,
      json: async () => data, text: async () => JSON.stringify(data),
      headers: { get: () => "application/json" },
    });
    if (u.includes(`/rest/v1/${functionName}`)) {
      if (opts.method === "GET" || !opts.method) return respond([]);
      // POST (upsert) - Supabase returns an array with the row back when .select() is chained
      const body = opts.body ? JSON.parse(opts.body) : {};
      return respond([body], 201);
    }
    return respond({});
  };

  const modulePath = path.join(__dirname, "..", "netlify", "functions", fnFile);
  delete require.cache[require.resolve(modulePath)];
  const { handler } = require(modulePath);

  // --- GET is public, no auth needed ---
  const getRes = await handler({ httpMethod: "GET", headers: {} });
  if (getRes.statusCode !== 200) {
    failures.push(`${fnFile}: GET should be public (200), got ${getRes.statusCode}`);
  }

  // --- POST without admin key is rejected ---
  const noAuthRes = await handler({
    httpMethod: "POST", headers: {},
    body: JSON.stringify({ id: "test-item", name: "Test Item", price: 49.99 }),
  });
  if (noAuthRes.statusCode !== 401) {
    failures.push(`${fnFile}: POST without admin key should be rejected with 401, got ${noAuthRes.statusCode}`);
  }

  // --- POST with wrong admin key is rejected ---
  const wrongAuthRes = await handler({
    httpMethod: "POST", headers: { "x-admin-key": "wrong-key" },
    body: JSON.stringify({ id: "test-item", name: "Test Item", price: 49.99 }),
  });
  if (wrongAuthRes.statusCode !== 401) {
    failures.push(`${fnFile}: POST with wrong admin key should be rejected with 401, got ${wrongAuthRes.statusCode}`);
  }

  // --- POST missing required fields is rejected ---
  const missingFieldsRes = await handler({
    httpMethod: "POST", headers: { "x-admin-key": "test-admin-key-123" },
    body: JSON.stringify({ name: "No ID or price" }),
  });
  if (missingFieldsRes.statusCode !== 400) {
    failures.push(`${fnFile}: POST missing id/price should be rejected with 400, got ${missingFieldsRes.statusCode}`);
  }

  // --- Valid POST succeeds ---
  const okRes = await handler({
    httpMethod: "POST", headers: { "x-admin-key": "test-admin-key-123" },
    body: JSON.stringify({ id: "test-item", name: "Test Item", price: 49.99 }),
  });
  if (okRes.statusCode !== 200) {
    failures.push(`${fnFile}: a valid admin POST should succeed, got ${okRes.statusCode} - ${okRes.body}`);
  }

  // --- DELETE without admin key is rejected ---
  const noAuthDeleteRes = await handler({ httpMethod: "DELETE", headers: {}, body: JSON.stringify({ id: "test-item" }) });
  if (noAuthDeleteRes.statusCode !== 401) {
    failures.push(`${fnFile}: DELETE without admin key should be rejected with 401, got ${noAuthDeleteRes.statusCode}`);
  }

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.ADMIN_KEY;

  return failures;
}

async function run() {
  const accessoryFailures = await testEndpoint("accessories.js", "accessories");
  const solarFailures = await testEndpoint("solar.js", "solar_panels");
  // bundles.js (Power Kits) mirrors accessories.js/solar.js exactly, same
  // reusable testEndpoint() checks apply - added when Kits became
  // admin-editable (previously static-only, like accessories/solar used
  // to be before this same fix was applied to them).
  const bundleFailures = await testEndpoint("bundles.js", "bundles");
  return [
    ...accessoryFailures.map((f) => `[accessories] ${f}`),
    ...solarFailures.map((f) => `[solar] ${f}`),
    ...bundleFailures.map((f) => `[bundles] ${f}`),
  ];
}

module.exports = { name: "accessories-solar-bundles-crud", run };
