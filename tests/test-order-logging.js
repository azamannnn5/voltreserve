// Guards the "no persistent record of any order" gap: send-order.js must
// write to the `orders` table (via Supabase's REST API, which
// @supabase/supabase-js calls over fetch) in addition to sending the two
// Resend emails - previously the emails were the ONLY record an order was
// ever submitted, with nothing to check if you wanted to look back.
const path = require("path");

async function run() {
  const failures = [];
  const calls = [];

  process.env.SUPABASE_URL = "https://fake-project.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.RESEND_API_KEY = "fake-resend-key";

  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method, body: opts.body ? JSON.parse(opts.body) : null });

    if (String(url).includes("api.resend.com")) {
      return { ok: true, status: 200, json: async () => ({ id: "fake-email-id" }), text: async () => "" };
    }
    if (String(url).includes("/rest/v1/orders") && opts.method === "POST") {
      // Supabase REST insert-with-.select().single() expects an array back
      return {
        ok: true, status: 201,
        json: async () => [{ id: "fake-order-id-123" }],
        text: async () => JSON.stringify([{ id: "fake-order-id-123" }]),
        headers: { get: () => "application/json" },
      };
    }
    if (String(url).includes("/rest/v1/orders") && opts.method === "PATCH") {
      return { ok: true, status: 200, json: async () => ([{ id: "fake-order-id-123" }]), text: async () => "[]" };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => "{}" };
  };

  // Fresh require so the module-scope `supabase` client picks up the env
  // vars set above (it's created once at module load time).
  const modulePath = path.join(__dirname, "..", "netlify", "functions", "send-order.js");
  delete require.cache[require.resolve(modulePath)];
  const { handler } = require(modulePath);

  const orderPayload = {
    name: "Test User", email: "test@example.com", phone: "5551234567",
    country: "United States", address: "123 Test St, Austin, TX",
    paymentMethod: "Card", promoCode: null, notes: "",
    itemLines: ["RIVER 2 x 1 ($169)"],
    subtotal: 169, discountPercent: 0, discountAmount: 0,
    shippingType: "free", shippingCost: 0, total: 169,
  };

  const res = await handler({ httpMethod: "POST", body: JSON.stringify(orderPayload) });

  if (res.statusCode !== 200) {
    failures.push(`send-order.js: expected 200, got ${res.statusCode} - ${res.body}`);
  }

  const ordersInsertCall = calls.find((c) => c.url.includes("/rest/v1/orders") && c.method === "POST");
  if (!ordersInsertCall) {
    failures.push("send-order.js: no request was made to the orders table - the order was never logged to Supabase, only emailed");
  } else if (ordersInsertCall.body.email !== "test@example.com" || ordersInsertCall.body.total !== 169) {
    failures.push(`send-order.js: orders insert body doesn't match the submitted order - got ${JSON.stringify(ordersInsertCall.body)}`);
  }

  const resendCalls = calls.filter((c) => c.url.includes("api.resend.com"));
  if (resendCalls.length !== 2) {
    failures.push(`send-order.js: expected 2 Resend emails (owner + customer), saw ${resendCalls.length}`);
  }

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.RESEND_API_KEY;

  return failures;
}

module.exports = { name: "order-logging", run };
