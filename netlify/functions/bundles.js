// GET  /.netlify/functions/bundles        -> public, returns all power kits as JSON
// POST /.netlify/functions/bundles         -> admin only, create/update one kit
// DELETE /.netlify/functions/bundles       -> admin only, body: { id }
//
// Mirrors products.js / accessories.js / solar.js exactly - same auth
// pattern, same fallback-when-not-configured behavior. Previously Power
// Kits only ever existed as a static BUNDLES array in js/products-data.js
// with no admin management at all, unlike Products/Accessories/Solar
// Panels which are all admin-editable; this closes that gap.
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

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (!supabase) {
    if (event.httpMethod === "GET") {
      return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify([]) };
    }
    return { statusCode: 503, headers: cors, body: JSON.stringify({ error: "Supabase not configured yet, see SETUP.md" }) };
  }

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("bundles")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      body: JSON.stringify(data.map(fromDbRow))
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
    if (!payload.id || !payload.name || typeof payload.price !== "number") {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id, name, and price are required" }) };
    }

    const row = toDbRow(payload);
    const { data, error } = await supabase.from("bundles").upsert(row, { onConflict: "id" }).select();
    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(fromDbRow(data[0])) };
  }

  if (event.httpMethod === "DELETE") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
    }
    if (!payload.id) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "id is required" }) };
    }
    const { error } = await supabase.from("bundles").delete().eq("id", payload.id);
    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
};

function fromDbRow(row) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    productId: row.product_id,
    accessories: row.accessories || [],
    price: row.price,
    compareAt: row.compare_at,
    badge: row.badge,
    useCase: row.use_case,
    description: row.description,
    image: row.image,
    sortOrder: row.sort_order
  };
}

function toDbRow(b) {
  return {
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
    sort_order: b.sortOrder ?? 0
  };
}
