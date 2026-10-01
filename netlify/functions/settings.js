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
const { logChange } = require("./lib/admin");

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
    let value = data ? data.value : null;
    // Codes with a use limit: count how many orders used each, so the
    // storefront can stop accepting a code once it is fully used.
    try {
      const limited = value && Array.isArray(value.extraPromoCodes)
        ? value.extraPromoCodes.filter((c) => c && c.code && Number(c.maxUses) > 0)
        : [];
      if (limited.length) {
        const usage = {};
        for (const c of limited) {
          const code = String(c.code).trim().toUpperCase();
          const { data: rows } = await supabase.from("orders").select("promo_code");
          usage[code] = (rows || []).filter((r) => String(r.promo_code || "").trim().toUpperCase() === code).length;
        }
        value = { ...value, _promoUsage: usage };
      }
    } catch { /* usage is a nice-to-have, never block settings */ }
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
      body: JSON.stringify(value)
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
    // Keep a copy of what was there so the Change log can offer "Restore".
    let before = null;
    try {
      const { data: prev } = await supabase.from("site_settings").select("value").eq("id", SETTINGS_ROW_ID).maybeSingle();
      before = prev ? prev.value : null;
    } catch { /* logging only, never blocks the save */ }
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: SETTINGS_ROW_ID, value: payload }, { onConflict: "id" });
    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    const changedKeys = Object.keys(payload || {}).filter(
      (k) => JSON.stringify((before || {})[k]) !== JSON.stringify(payload[k])
    );
    await logChange(supabase, {
      action: "save", entity: "settings", entityId: SETTINGS_ROW_ID,
      summary: "Site settings changed: " + (changedKeys.length ? changedKeys.join(", ") : "no fields"),
      before
    });
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(payload) };
  }

  return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
};
