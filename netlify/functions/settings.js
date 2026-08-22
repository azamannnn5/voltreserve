// GET  /.netlify/functions/settings         -> public, returns the current promo config as JSON
// POST /.netlify/functions/settings          -> admin only, updates the promo config
//
// Backs the single site-wide PROMO_CONFIG object (promo code, discount
// percentages, thresholds, end date) so it can be changed from admin.html
// without editing code or redeploying. If Supabase isn't configured, GET
// falls back to returning null and the browser keeps using the hardcoded
// PROMO_CONFIG defaults from products-data.js, so the site still works.
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>
//
// Env vars required (same as products.js):
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY
//   ADMIN_KEY

const { createClient } = require("@supabase/supabase-js");

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const SETTINGS_ROW_ID = "promo_config";

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (!supabase) {
    // Not configured yet, tell the browser to keep using hardcoded defaults.
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(null) };
  }

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
      body: JSON.stringify(data ? data.value : null)
    };
  }

  const providedKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
  if (!process.env.ADMIN_KEY || providedKey !== process.env.ADMIN_KEY) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
    }
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: SETTINGS_ROW_ID, value: payload }, { onConflict: "id" });
    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(payload) };
  }

  return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
};
