// Guards the "no persistent record of any contact message" gap: send-contact.js
// must write to the `contact_messages` table (via Supabase's REST API, which
// @supabase/supabase-js calls over fetch) in addition to sending the two
// Resend emails - previously the emails were the ONLY record a message was
// ever submitted, with nothing to fall back on if an email failed or got
// lost. Mirrors test-order-logging.js exactly.
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
    if (String(url).includes("/rest/v1/contact_messages") && opts.method === "POST") {
      // Supabase REST insert-with-.select().single() expects an array back
      return {
        ok: true, status: 201,
        json: async () => [{ id: "fake-message-id-123" }],
        text: async () => JSON.stringify([{ id: "fake-message-id-123" }]),
        headers: { get: () => "application/json" },
      };
    }
    if (String(url).includes("/rest/v1/contact_messages") && opts.method === "PATCH") {
      return { ok: true, status: 200, json: async () => ([{ id: "fake-message-id-123" }]), text: async () => "[]" };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => "{}" };
  };

  // Fresh require so the module-scope `supabase` client picks up the env
  // vars set above (it's created once at module load time).
  const modulePath = path.join(__dirname, "..", "netlify", "functions", "send-contact.js");
  delete require.cache[require.resolve(modulePath)];
  const { handler } = require(modulePath);

  const contactPayload = {
    name: "Test User", email: "test@example.com", message: "Do you ship to Canada?"
  };

  const res = await handler({ httpMethod: "POST", body: JSON.stringify(contactPayload) });

  if (res.statusCode !== 200) {
    failures.push(`send-contact.js: expected 200, got ${res.statusCode} - ${res.body}`);
  }

  const insertCall = calls.find((c) => c.url.includes("/rest/v1/contact_messages") && c.method === "POST");
  if (!insertCall) {
    failures.push("send-contact.js: no request was made to the contact_messages table - the message was never logged to Supabase, only emailed");
  } else if (insertCall.body.email !== "test@example.com" || insertCall.body.message !== "Do you ship to Canada?") {
    failures.push(`send-contact.js: contact_messages insert body doesn't match the submitted message - got ${JSON.stringify(insertCall.body)}`);
  }

  const resendCalls = calls.filter((c) => c.url.includes("api.resend.com"));
  if (resendCalls.length !== 2) {
    failures.push(`send-contact.js: expected 2 Resend emails (owner + customer), saw ${resendCalls.length}`);
  }

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.RESEND_API_KEY;

  return failures;
}

module.exports = { name: "contact-logging", run };
