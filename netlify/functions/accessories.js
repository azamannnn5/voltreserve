// GET  /.netlify/functions/accessories        -> public, returns all accessories as JSON
// POST /.netlify/functions/accessories         -> admin only, create/update one accessory
// DELETE /.netlify/functions/accessories       -> admin only, body: { id }
//
// Mirrors products.js exactly - same auth pattern, same fallback-when-
// not-configured behavior. Previously accessories only ever existed as a
// static array in js/products-data.js with no admin management at all;
// this is what makes them admin-editable without a redeploy, matching
// what Products already had.
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>
//
// Env vars required (same as products.js):
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY
//   ADMIN_KEY

const { createClient } = require("@supabase/supabase-js");
const { fetchBefore, logChange, upsertWithFallback } = require("./lib/admin");

// Columns added by supabase-admin-upgrade.sql. If that SQL has not been run
// yet, saving still works: these are dropped from the write and retried.
const OPTIONAL_COLUMNS = ["stock_qty"];

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
      .from("accessories")
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

    // _quiet saves (reordering, bulk price changes) are logged once by the admin panel instead.
    const before = payload._quiet ? null : await fetchBefore(supabase, "accessories", payload.id, fromDbRow);
    const row = toDbRow(payload);
    const { data, error } = await upsertWithFallback(supabase, "accessories", row, OPTIONAL_COLUMNS);
    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    const saved = fromDbRow(data[0]);
    if (!payload._quiet) {
      await logChange(supabase, {
        action: "save", entity: "accessories", entityId: payload.id,
        summary: (before ? "Edited " : "Added ") + (saved.name || payload.id),
        before, after: saved
      });
    }
    return { statusCode: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(saved) };
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
    const before = await fetchBefore(supabase, "accessories", payload.id, fromDbRow);
    const { error } = await supabase.from("accessories").delete().eq("id", payload.id);
    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    await logChange(supabase, {
      action: "delete", entity: "accessories", entityId: payload.id,
      summary: "Deleted " + ((before && before.name) || payload.id), before
    });
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
};

function fromDbRow(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    tagline: row.tagline,
    price: row.price,
    compatibleWith: row.compatible_with || [],
    description: row.description,
    images: row.images || [],
    sortOrder: row.sort_order,
    stockQty: row.stock_qty ?? null
  };
}

function toDbRow(p) {
  return {
    id: p.id,
    category: p.category ?? null,
    name: p.name,
    tagline: p.tagline ?? null,
    price: p.price,
    compatible_with: p.compatibleWith || [],
    description: p.description ?? null,
    images: p.images || [],
    sort_order: p.sortOrder ?? 0,
    stock_qty: p.stockQty === undefined || p.stockQty === null || p.stockQty === "" ? null : Math.max(0, parseInt(p.stockQty, 10) || 0)
  };
}
