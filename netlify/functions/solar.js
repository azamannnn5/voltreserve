// GET  /.netlify/functions/solar        -> public, returns all solar panels as JSON
// POST /.netlify/functions/solar         -> admin only, create/update one solar panel
// DELETE /.netlify/functions/solar       -> admin only, body: { id }
//
// Mirrors products.js / accessories.js exactly. Previously solar panels
// only ever existed as a static array in js/products-data.js with no
// admin management at all.
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
      .from("solar_panels")
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
    const { data, error } = await supabase.from("solar_panels").upsert(row, { onConflict: "id" }).select();
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
    const { error } = await supabase.from("solar_panels").delete().eq("id", payload.id);
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
    watts: row.watts,
    price: row.price,
    compatibleWith: row.compatible_with || [],
    description: row.description,
    images: row.images || [],
    sortOrder: row.sort_order
  };
}

function toDbRow(p) {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline ?? null,
    watts: p.watts ?? null,
    price: p.price,
    compatible_with: p.compatibleWith || [],
    description: p.description ?? null,
    images: p.images || [],
    sort_order: p.sortOrder ?? 0
  };
}
