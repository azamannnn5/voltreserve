// POST /.netlify/functions/seed-products
// Admin-only, one-time use: loads the current 21-product catalog (bundled at
// deploy time from products-data.js) into the Supabase products table.
// Safe to re-run, it upserts by id, so running it again just re-syncs the
// bundled data over whatever is currently in the database.
//
// Header required: x-admin-key: <ADMIN_KEY env var>

const { createClient } = require("@supabase/supabase-js");
const fallbackProducts = require("./data/fallback-products.json");

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const providedKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
  if (!process.env.ADMIN_KEY || providedKey !== process.env.ADMIN_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (!supabase) {
    return { statusCode: 503, body: JSON.stringify({ error: "Supabase not configured yet, set SUPABASE_URL and SUPABASE_SERVICE_KEY, see SETUP.md" }) };
  }

  const rows = fallbackProducts.map((p, i) => ({
    id: p.id,
    series: p.series,
    capacity_tier: p.capacityTier ?? null,
    name: p.name,
    tagline: p.tagline ?? null,
    capacity_wh: p.capacityWh ?? null,
    capacity_label: p.capacityLabel ?? null,
    output_w: p.outputW ?? null,
    output_label: p.outputLabel ?? null,
    charge_time: p.chargeTime ?? null,
    weight: p.weight ?? null,
    price: p.price,
    ecoflow_price: p.ecoflowPrice ?? null,
    use_case: p.useCase ?? null,
    badge: p.badge ?? null,
    description: p.description ?? null,
    hook: p.hook ?? null,
    bullets: p.bullets || [],
    who_for: p.whoFor || [],
    whats_in_box: p.whatsInBox ?? null,
    in_stock: p.inStock !== false,
    images: p.images || [],
    sort_order: i
  }));

  const { data, error } = await supabase.from("products").upsert(rows, { onConflict: "id" }).select("id");
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, seeded: data.length }) };
};
