// POST /.netlify/functions/seed-bundles
// Admin-only, one-time use: loads the current 14 curated Power Kits
// (bundled at deploy time from products-data.js, mirrored into
// data/fallback-bundles.json) into the Supabase bundles table.
// Safe to re-run, it upserts by id, so running it again just re-syncs the
// bundled data over whatever is currently in the database.
// Mirrors seed-products.js exactly.
//
// Header required: x-admin-key: <ADMIN_KEY env var>

const { createClient } = require("@supabase/supabase-js");
const fallbackBundles = require("./data/fallback-bundles.json");

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

  const rows = fallbackBundles.map((b, i) => ({
    id: b.id,
    name: b.name,
    tagline: b.tagline ?? null,
    product_id: b.productId ?? null,
    accessories: b.accessories || [],
    price: b.price,
    compare_at: b.compareAt ?? null,
    badge: b.badge ?? null,
    use_case: b.useCase ?? null,
    description: b.description ?? null,
    image: b.image ?? null,
    sort_order: i
  }));

  const { data, error } = await supabase.from("bundles").upsert(rows, { onConflict: "id" }).select("id");
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, seeded: data.length }) };
};
