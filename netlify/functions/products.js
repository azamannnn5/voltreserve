// GET  /.netlify/functions/products         -> public, returns all products as JSON
// POST /.netlify/functions/products          -> admin only, create/update one product
// DELETE /.netlify/functions/products        -> admin only, body: { id }
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>
//
// Env vars required (set in Netlify → Site settings → Environment variables):
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY   (service role key, server-side only, never exposed to the browser)
//   ADMIN_KEY               (a password you make up, used by admin.html)

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
    // Not configured yet, tell the browser to keep using the bundled
    // fallback catalog instead of crashing with a 502.
    if (event.httpMethod === "GET") {
      return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify([]) };
    }
    return { statusCode: 503, headers: cors, body: JSON.stringify({ error: "Supabase not configured yet, see SETUP.md" }) };
  }

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("products")
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

  // Everything below is an admin-only write, require the shared admin key.
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
    const { data, error } = await supabase.from("products").upsert(row, { onConflict: "id" }).select();
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
    const { error } = await supabase.from("products").delete().eq("id", payload.id);
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
    series: row.series,
    capacityTier: row.capacity_tier,
    name: row.name,
    tagline: row.tagline,
    capacityWh: row.capacity_wh,
    capacityLabel: row.capacity_label,
    outputW: row.output_w,
    outputLabel: row.output_label,
    chargeTime: row.charge_time,
    weight: row.weight,
    price: row.price,
    ecoflowPrice: row.ecoflow_price,
    useCase: row.use_case,
    badge: row.badge,
    description: row.description,
    hook: row.hook,
    bullets: row.bullets || [],
    whoFor: row.who_for || [],
    whatsInBox: row.whats_in_box,
    inStock: row.in_stock !== false,
    images: row.images || [],
    sortOrder: row.sort_order
  };
}

function toDbRow(p) {
  return {
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
    sort_order: p.sortOrder ?? 0
  };
}
